import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { DatePicker } from "@/components/atoms/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/atoms/dialog";
import { Input } from "@/components/atoms/input";
import { Textarea } from "@/components/atoms/textarea";
import { BorrowStatus } from "@/components/molecules/borrow-status";
import {
  DeleteROM,
  DeleteROMForm,
} from "@/components/molecules/delete-rom-form";
import { GameActionButton } from "@/components/molecules/game-action-button";
import { useRefusalReason } from "@/hooks/use-refusal-reason";
import { useToast } from "@/hooks/use-toast";
import { requireUser } from "@/lib/auth/auth.server";
import { UserRoles } from "@/lib/auth/providers.server";
import { withClientCache } from "@/lib/cache/cache.client";
import { cache, updateVersion, withCache } from "@/lib/cache/cache.server";
import {
  CLIENT_CACHE_TTL,
  DETAILS_CACHE_KEY,
  EXPLORE_CACHE_KEY,
  MAX_UPLOAD_SIZE,
} from "@/lib/const";
import { ErrorCode } from "@/lib/errors/codes";
import { ErrorFactory } from "@/lib/errors/factory";
import { getErrorDetails } from "@/lib/errors/helpers";
import { GameDetails, getGameDetailsData } from "@/lib/game-library";
import { DetailsIntent as Intent } from "@/lib/intents";
import { prisma } from "@/lib/prisma.server";
import { hasPermission } from "@/lib/utils.server";
import { adminRevokeBorrow } from "@/queries/details/admin-revoke-borrow";
import { borrowGame } from "@/queries/details/borrow-game";
import { deleteGame } from "@/queries/details/delete-rom";
import { returnGame } from "@/queries/details/return-game";
import { updateLastPlayed } from "@/queries/details/update-last-played";
import { updateGameMetadata } from "@/queries/details/update-metadata";
import {
  AdminRevokeBorrow,
  BorrowGame,
  ReturnGame,
  UpdateLastPlayed,
  UpdateMetadata,
} from "@/schemas/details";
import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import { FileUpload, parseFormData } from "@mjackson/form-data-parser";
import { System, User } from "@/generated/prisma/client";
import { Label } from "@radix-ui/react-label";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import {
  ActionFunctionArgs,
  ClientLoaderFunctionArgs,
  data,
  Form,
  LoaderFunctionArgs,
  redirect,
  useLoaderData,
  useNavigate,
} from "react-router";

type RomDetails = {
  name: string;
  releaseDate: string;
  coverArt: string;
  backgroundImage: string;
  summary: string;
  genres: string[];
};

type LoaderData = {
  user: Awaited<ReturnType<typeof requireUser>>;
} & Awaited<ReturnType<typeof getGameDetailsData>>;

export async function loader({ request, params }: LoaderFunctionArgs) {
  let user = await requireUser(request);
  if (!user.signupVerifiedAt && user.roleId !== UserRoles.ADMIN) {
    throw redirect(`/needs-permission`);
  }
  if (!hasPermission(user, { requireVerified: true })) {
    throw redirect("/needs-permission");
  }

  let gameId = Number(params.id);
  if (!gameId || isNaN(gameId)) {
    throw ErrorFactory.create(ErrorCode.INVALID_INPUT, "Invalid game ID", {
      params,
    });
  }

  let ifNoneMatch = request.headers.get("If-None-Match");
  try {
    let {
      data: cacheData,
      eTag,
      headers,
    } = await withCache<GameDetails>({
      key: DETAILS_CACHE_KEY(gameId),
      cache,
      versionKey: "detailedInfo",
      getFreshValue: async () => {
        const data = await getGameDetailsData(gameId);
        if (
          data.borrowVoucher &&
          data.borrowVoucher.expiresAt.getTime() < Date.now()
        ) {
          await prisma.borrowVoucher.update({
            where: {
              id: data.borrowVoucher.id,
            },
            data: {
              returnedAt: data.borrowVoucher.expiresAt,
            },
          });
        }
        return data;
      },
    });

    if (ifNoneMatch === eTag) {
      // data() does not support 304 responses
      throw new Response(null, {
        status: 304,
        headers,
      });
    }

    return data(
      {
        ...(cacheData as unknown as Awaited<
          ReturnType<typeof getGameDetailsData>
        >),
        user,
        eTag,
      },
      {
        status: 200,
        headers,
      }
    );
  } catch (throwable) {
    if (throwable instanceof Response && throwable.status === 304) {
      return throwable as unknown as LoaderData;
    }

    const { code, message, status, severity } = getErrorDetails(throwable);

    if (ErrorFactory.isApplicationError(throwable)) {
      return data({ error: `${code}: ${message}` }, { status });
    }

    return data(
      {
        error: ErrorFactory.create(
          code as ErrorCode,
          message,
          { timestamp: new Date().toISOString() },
          { severity }
        ).toString(),
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-cache",
          "X-Error-Code": code,
          "X-Error-Severity": severity,
        },
      }
    );
  }
}
export async function action({ request, params }: ActionFunctionArgs) {
  const user = await requireUser(request);

  const contentType = request.headers.get("content-type");
  let formData: FormData;

  let gameId = Number(params.id);
  if (!gameId || isNaN(gameId)) {
    throw ErrorFactory.create(ErrorCode.INVALID_INPUT, "Invalid game ID", {
      params,
    });
  }

  if (contentType && contentType.includes("multipart/form-data")) {
    const uploadHandler = async (fileUpload: FileUpload) => {
      if (
        fileUpload.fieldName === "coverArt" ||
        fileUpload.fieldName === "backgroundImage"
      ) {
        const buffer = await fileUpload.arrayBuffer();
        if (buffer.byteLength > MAX_UPLOAD_SIZE) {
          throw new Error(
            `${fileUpload.fieldName} exceeds maximum size of ${MAX_UPLOAD_SIZE} bytes`
          );
        }

        return new File([buffer], fileUpload.name, {
          type: fileUpload.type,
        });
      }
    };

    formData = await parseFormData(request, uploadHandler);
  } else {
    formData = await request.formData();
  }

  const intent = formData.get("intent");

  try {
    switch (intent) {
      case Intent.BorrowGame: {
        const submission = parseWithZod(formData, {
          schema: BorrowGame,
        });

        if (submission.status !== "success") {
          return data(submission.reply(), {
            status: submission.status === "error" ? 400 : 200,
          });
        }

        const { gameId } = submission.value;

        updateVersion("detailedInfo");
        cache.delete(DETAILS_CACHE_KEY(gameId));

        await borrowGame(gameId, user.id);
        return data({ success: true });
      }

      case Intent.ReturnGame: {
        const submission = parseWithZod(formData, {
          schema: ReturnGame,
        });

        if (submission.status !== "success") {
          return data(submission.reply(), {
            status: submission.status === "error" ? 400 : 200,
          });
        }

        const { gameId } = submission.value;

        await returnGame(gameId, user.id);

        updateVersion("detailedInfo");
        cache.delete(DETAILS_CACHE_KEY(gameId));

        return data({ success: true });
      }

      case Intent.AdminRevokeBorrow: {
        const submission = parseWithZod(formData, {
          schema: AdminRevokeBorrow,
        });

        if (submission.status !== "success") {
          return data(submission.reply(), {
            status: submission.status === "error" ? 400 : 200,
          });
        }

        const { gameId } = submission.value;

        await adminRevokeBorrow(gameId, user.id);

        updateVersion("detailedInfo");
        cache.delete(DETAILS_CACHE_KEY(gameId));

        return data({ success: true });
      }

      case Intent.UpdateLastPlayed: {
        const submission = parseWithZod(formData, {
          schema: UpdateLastPlayed,
        });

        if (submission.status !== "success") {
          return data(submission.reply(), {
            status: submission.status === "error" ? 400 : 200,
          });
        }

        const { gameId } = submission.value;

        await updateLastPlayed(gameId, user.id);
        return data({ success: true });
      }

      case Intent.UpdateMetadata: {
        const submission = parseWithZod(formData, {
          schema: UpdateMetadata,
        });

        if (submission.status !== "success") {
          return data(submission.reply(), {
            status: submission.status === "error" ? 400 : 200,
          });
        }

        const { id, title, releaseDate, coverArt, backgroundImage, summary } =
          submission.value;

        updateVersion("detailedInfo");
        cache.delete(DETAILS_CACHE_KEY(id));

        const updatedGame = await updateGameMetadata(id, {
          title,
          releaseDate: releaseDate
            ? new Date(releaseDate).getTime() / 1000
            : undefined,
          coverArt: coverArt
            ? new Uint8Array(await coverArt.arrayBuffer())
            : undefined,
          backgroundImage: backgroundImage
            ? new Uint8Array(await backgroundImage.arrayBuffer())
            : undefined,
          summary,
        });

        return redirect(
          `/details/${updatedGame.system.title}/${updatedGame.id}`
        );
      }

      case Intent.DeleteRom: {
        const submission = parseWithZod(formData, {
          schema: DeleteROM,
        });

        if (submission.status !== "success") {
          return data(submission.reply(), {
            status: submission.status === "error" ? 400 : 200,
          });
        }

        const { id } = submission.value;

        try {
          await deleteGame(id);
        } finally {
          updateVersion("detailedInfo");
          updateVersion("gameLibrary");
          updateVersion("genreInfo");
          cache.delete(DETAILS_CACHE_KEY(id));
          cache.delete(EXPLORE_CACHE_KEY);
        }

        return redirect("/explore");
      }

      default: {
        throw ErrorFactory.create(
          ErrorCode.INTERNAL_SERVER_ERROR,
          `Details/$System/$Id action. Unknown intent: '${intent}'`
        );
      }
    }
  } catch (error) {
    if (ErrorFactory.isApplicationError(error)) {
      return data({ error: error.toString() }, { status: error.status });
    }

    return data(
      {
        error: ErrorFactory.create(
          ErrorCode.INTERNAL_SERVER_ERROR,
          `${error}`
        ).toString(),
      },
      { status: 500 }
    );
  }
}

export async function clientLoader({
  params,
  serverLoader,
}: ClientLoaderFunctionArgs) {
  return withClientCache({
    store: "detailedInfo",
    cacheKey: (params) => {
      let genreId = params.id;
      if (!genreId) throw new Error("genreId could not be pulled from URL");
      return DETAILS_CACHE_KEY(Number(genreId));
    },
    ttl: CLIENT_CACHE_TTL,
    serverLoader,
    params,
  });
}

export default function RomDetails() {
  let navigate = useNavigate();
  let { toast } = useToast();
  let { shouldShowToast, refusalConfig } = useRefusalReason();

  useEffect(() => {
    if (shouldShowToast && refusalConfig) {
      toast({
        title: refusalConfig.title,
        description: refusalConfig.description,
        variant: refusalConfig.variant,
      });

      let newUrl = window.location.pathname.toLocaleLowerCase();
      navigate(newUrl, { replace: true });
    }
  }, [shouldShowToast, refusalConfig, toast, navigate]);

  let data = useLoaderData<typeof loader>();

  if (!data) return <div>Error occured, no data returned from loader</div>;
  if ("error" in data) return <div>Error occurred, {data && data.error}</div>;

  let {
    id,
    title,
    system,
    releaseDate,
    coverArt,
    backgroundImage,
    summary,
    gameGenres,
    borrowVoucher,
    user,
  } = data;
  let [expensiveDate, setExpensiveDate] = useState<Date | undefined>(() => {
    // seconds to milliseconds, IGDB uses seconds
    let date = releaseDate ? new Date(releaseDate * 1000) : undefined;

    return date;
  });

  let [form, fields] = useForm({
    constraint: getZodConstraint(UpdateMetadata),
    defaultValue: {
      id,
      intent: Intent.UpdateMetadata,
      title,
      releaseDate,
      coverArt,
      backgroundImage,
      summary,
    },
  });

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 z-0 h-full w-full">
        <img
          src={
            backgroundImage
              ? `data:image/jpeg;base64,${backgroundImage}`
              : "https://placehold.co/1920x1080"
          }
          alt="Background"
          className="opacity-40 object-cover h-full w-full"
        />
        <div className="absolute inset-0 bg-linear-to-b from-black from-1% via-black/10 to-black to-99%" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-transparent via-black/20 to-black" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-16">
        <div className="flex w-full justify-start mb-4">
          <Button
            onClick={() => navigate(-1)}
            className="flex"
            variant="link"
            role="link"
          >
            <span className="mr-2">
              <ArrowLeft />
            </span>
            Go Back
          </Button>
        </div>
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="shrink-0 bg-black/40 rounded lg:rounded-none">
            <img
              src={
                coverArt
                  ? `data:image/jpeg;base64,${coverArt}`
                  : "https://placehold.co/540x720"
              }
              alt={title}
              className="aspect-video w-full h-auto object-contain lg:aspect-3/4 lg:w-[540px] lg:h-[720px] rounded-lg shadow-lg"
            />
          </div>

          <div className="flex flex-col flex-1 justify-center">
            <BorrowStatus
              borrowVoucher={borrowVoucher}
              user={user as unknown as User}
              id={id}
              system={system as unknown as System}
            />
            <div className="mb-2">
              <Badge className="rounded bg-background" variant="outline">
                {system.title}
              </Badge>
            </div>
            <div className="w-full flex flex-col lg:flex-row items-start justify-between gap-x-4">
              <h1 className="flex items-center gap-4 text-5xl mb-2 font-serif max-w-2xl">
                {title}
              </h1>
              {user.roleId == 1 && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">Edit metadata</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit {title}'s metadata</DialogTitle>
                      <DialogDescription>
                        Make changes to metadata here. Click save when you're
                        done.
                      </DialogDescription>
                    </DialogHeader>
                    <Form
                      {...getFormProps(form)}
                      method="POST"
                      className="grid gap-y-4"
                      encType="multipart/form-data"
                    >
                      <Input
                        {...getInputProps(fields.id, { type: "hidden" })}
                      />
                      <Input
                        {...getInputProps(fields.intent, { type: "hidden" })}
                      />
                      <div className="grid gap-2">
                        <Label htmlFor={fields.title.id}>Title</Label>
                        <Input
                          {...getInputProps(fields.title, { type: "text" })}
                        ></Input>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={fields.releaseDate.id}>
                          Release Date
                        </Label>
                        <Input
                          {...getInputProps(fields.releaseDate, {
                            type: "hidden",
                          })}
                          value={expensiveDate && expensiveDate.getTime()}
                        />
                        <DatePicker
                          date={expensiveDate}
                          setDate={setExpensiveDate}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={fields.coverArt.id}>Cover Art</Label>

                        <Input
                          type="file"
                          name={fields.coverArt.name}
                          id={fields.coverArt.id}
                        ></Input>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={fields.backgroundImage.id}>
                          Background Image
                        </Label>

                        <Input
                          type="file"
                          name={fields.backgroundImage.name}
                          id={fields.backgroundImage.id}
                        ></Input>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={fields.summary.id}>Summary</Label>
                        <Textarea
                          rows={4}
                          {...getInputProps(fields.summary, {
                            type: "text",
                          })}
                        ></Textarea>
                      </div>
                    </Form>

                    <DialogFooter className="w-full">
                      <DeleteROMForm id={id} />
                      <Button type="submit" form={form.id}>
                        Save
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            <p className="text-muted-foreground mb-4 text-lg">
              {expensiveDate &&
                new Intl.DateTimeFormat("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }).format(expensiveDate)}
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {gameGenres.map((gameGenre, i) => (
                <Badge key={i} variant="secondary" className="rounded">
                  {gameGenre.genre.name}
                </Badge>
              ))}
            </div>
            <p className="text-lg mb-6">
              {summary && summary.length > 325
                ? summary.slice(0, 325) + `...`
                : summary}
            </p>
            <div className="flex flex-col lg:flex-row gap-4 w-full">
              <GameActionButton
                borrowVoucher={borrowVoucher as any}
                user={user as unknown as User}
                id={id}
                system={system as unknown as System}
                title={title}
              />
              <Button variant="outline">Add to Favorites</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
