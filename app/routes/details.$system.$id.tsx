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
  ROM_MAX_SIZE,
  SEVEN_DAYS_EPOCH,
} from "@/lib/const";
import { GameDetails, getGameDetailsData } from "@/lib/game-library";
import { DetailsIntent as Intent } from "@/lib/intents";
import { prisma } from "@/lib/prisma.server";
import { hasPermission } from "@/lib/utils.server";
import {
  getFormProps,
  getInputProps,
  Submission,
  useForm,
} from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import { System, User } from "@prisma/client";
import { Label } from "@radix-ui/react-label";
import {
  ActionFunctionArgs,
  unstable_createMemoryUploadHandler as createMemoryUploadHandler,
  json,
  LoaderFunctionArgs,
  unstable_parseMultipartFormData as parseMultipartFormData,
  redirect,
} from "@remix-run/node";
import {
  ClientLoaderFunctionArgs,
  Form,
  useLoaderData,
  useNavigate,
} from "@remix-run/react";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";

type RomDetails = {
  name: string;
  releaseDate: string;
  coverArt: string;
  backgroundImage: string;
  summary: string;
  genres: string[];
};

let BorrowGame = z.object({
  intent: z.literal(Intent.BorrowGame),
  gameId: z.coerce.number(),
});

type BorrowGame = z.infer<typeof BorrowGame>;

let ReturnGame = z.object({
  intent: z.literal(Intent.ReturnGame),
  gameId: z.coerce.number(),
});

type ReturnGame = z.infer<typeof ReturnGame>;

let AdminRevokeBorrow = z.object({
  intent: z.literal(Intent.AdminRevokeBorrow),
  gameId: z.coerce.number(),
});

type AdminRevokeBorrow = z.infer<typeof AdminRevokeBorrow>;

let UpdateMetadata = z
  .object({
    id: z.number(),
    intent: z.literal(Intent.UpdateMetadata),
    title: z.string(),
    releaseDate: z.number().optional(),
    coverArt: z
      .instanceof(File)
      .refine(
        (file) => file.size <= MAX_UPLOAD_SIZE,
        "coverArt must be no larger than 5MB"
      )
      .optional(),
    summary: z.string().optional(),
    backgroundImage: z
      .instanceof(File)
      .refine(
        (file) => file.size <= MAX_UPLOAD_SIZE,
        "backgroundImage must be no larger than 5MB"
      )
      .optional(),
    file: z
      .instanceof(File)
      .refine(
        (file) => file.size <= ROM_MAX_SIZE,
        "File must be no larger than 24MB"
      )
      .optional(),
  })
  .strict();

type UpdateMetadata = z.infer<typeof UpdateMetadata>;

let UpdateLastPlayed = z.object({
  intent: z.literal(Intent.UpdateLastPlayed),
  gameId: z.number(),
});

type UpdateLastPlayed = z.infer<typeof UpdateLastPlayed>;

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
  if (!gameId) throw new Error("gameId could not be pulled from URL");

  let ifNoneMatch = request.headers.get("If-None-Match");
  try {
    let { data, eTag, headers } = await withCache<GameDetails>({
      key: DETAILS_CACHE_KEY(gameId),
      cache,
      versionKey: "detailedInfo",
      getFreshValue: async () => await getGameDetailsData(gameId),
    });

    if (ifNoneMatch === eTag) {
      // json() does not support 304 responses
      throw new Response(null, {
        status: 304,
        headers,
      });
    }

    return json(
      { ...data, user, eTag },
      {
        status: 200,
        headers,
      }
    );
  } catch (throwable) {
    if (throwable instanceof Response && throwable.status === 304) {
      // this is the response to the HEAD request in the loader
      return throwable as unknown as LoaderData;
    }
    return json(
      { error: `${throwable}` },
      { headers: { "Cache-Control": "no-cache" } }
    );
  }
}

async function borrowGame(submission: Submission<BorrowGame>, userId: number) {
  if (submission.status !== "success") {
    return json(submission.reply(), {
      status: submission.status === "error" ? 400 : 200,
    });
  }

  let { gameId } = submission.value;

  updateVersion("detailedInfo");
  cache.delete(DETAILS_CACHE_KEY(gameId));

  try {
    let activeBorrows = await prisma.borrowVoucher.findMany({
      where: {
        userId,
        returnedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        game: {
          select: {
            title: true,
          },
        },
      },
    });

    if (activeBorrows.length >= 3) {
      return json(
        {
          error:
            "You can only borrow up to 3 games at a time. You've borrowed " +
            activeBorrows.map((ab) => ab.game.title).join(", "),
        },
        { status: 400 }
      );
    }

    let existingVoucher = await prisma.borrowVoucher.findFirst({
      where: {
        gameId,
        returnedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (existingVoucher) {
      return json({ error: "This game is already borrowed" }, { status: 400 });
    }

    await prisma.borrowVoucher.upsert({
      where: {
        gameId,
      },
      create: {
        gameId,
        userId,
        expiresAt: new Date(SEVEN_DAYS_EPOCH),
      },
      update: {
        gameId,
        userId,
        expiresAt: new Date(SEVEN_DAYS_EPOCH),
        returnedAt: null,
      },
    });

    return json({ success: true });
  } catch (error) {
    return json({ error: "Failed to borrow game" }, { status: 500 });
  }
}

async function returnGame(submission: Submission<ReturnGame>, userId: number) {
  if (submission.status !== "success") {
    return json(submission.reply(), {
      status: submission.status === "error" ? 400 : 200,
    });
  }

  let { gameId } = submission.value;

  try {
    let voucher = await prisma.borrowVoucher.findFirst({
      where: {
        gameId,
        userId,
        returnedAt: null,
      },
    });

    if (!voucher) {
      return json(
        { error: "No active borrow found for this game" },
        { status: 400 }
      );
    }

    await prisma.borrowVoucher.update({
      where: { id: voucher.id },
      data: { returnedAt: new Date() },
    });

    updateVersion("detailedInfo");
    cache.delete(DETAILS_CACHE_KEY(gameId));

    return json({ success: true });
  } catch (error) {
    return json({ error: "Failed to return game" }, { status: 500 });
  }
}

async function adminRevokeBorrow(
  submission: Submission<AdminRevokeBorrow>,
  adminId: number
) {
  if (submission.status !== "success") {
    return json(submission.reply(), {
      status: submission.status === "error" ? 400 : 200,
    });
  }

  let { gameId } = submission.value;

  try {
    let admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { roleId: true },
    });

    if (admin?.roleId !== UserRoles.ADMIN) {
      return json({ error: "Unauthorized" }, { status: 403 });
    }
    await prisma.borrowVoucher.update({
      where: {
        gameId,
        returnedAt: null,
      },
      data: {
        returnedAt: new Date(),
      },
    });

    updateVersion("detailedInfo");
    cache.delete(DETAILS_CACHE_KEY(gameId));

    return json({ success: true });
  } catch (error) {
    return json({ error: "Failed to revoke borrow" }, { status: 500 });
  }
}

async function updateMetadata(submission: Submission<UpdateMetadata>) {
  if (submission.status !== "success") {
    return json(submission.reply(), {
      status: submission.status === "error" ? 400 : 200,
    });
  }

  let { id, title, releaseDate, coverArt, backgroundImage, summary } =
    submission.value;

  await prisma.game.update({
    where: { id },
    data: {
      title,
      releaseDate: releaseDate
        ? new Date(releaseDate).getTime() / 1000
        : undefined,
      coverArt: coverArt
        ? Buffer.from(await coverArt.arrayBuffer())
        : undefined,
      backgroundImage: backgroundImage
        ? Buffer.from(await backgroundImage.arrayBuffer())
        : undefined,
      summary,
    },
  });

  return null;
}

async function updateLastPlayed(
  submission: Submission<UpdateLastPlayed>,
  userId: number
) {
  if (submission.status !== "success") {
    return json(submission.reply(), {
      status: submission.status === "error" ? 400 : 200,
    });
  }

  let { gameId } = submission.value;

  await prisma.gameStats.upsert({
    where: {
      userId_gameId: {
        userId,
        gameId,
      },
    },
    create: {
      lastPlayedAt: new Date(),
      gameId,
      userId,
    },
    update: {
      lastPlayedAt: new Date(),
      gameId,
      userId,
    },
  });

  await prisma.game.update({
    where: {
      id: gameId,
    },
    data: {
      borrowVoucher: {
        connect: {
          id: userId,
        },
      },
    },
  });

  return null;
}

async function deleteRom(submission: Submission<DeleteROM>) {
  if (submission.status !== "success") {
    return json(submission.reply(), {
      status: submission.status === "error" ? 400 : 200,
    });
  }

  let { id } = submission.value;
  updateVersion("detailedInfo");
  updateVersion("gameLibrary");
  updateVersion("genreInfo");
  cache.delete(DETAILS_CACHE_KEY(id));
  await prisma.game.delete({
    where: {
      id,
    },
  });
  return null;
}

export async function action({ request, params }: ActionFunctionArgs) {
  let user = await requireUser(request);
  let contentType = request.headers.get("content-type");
  let formData: FormData;

  let gameId = Number(params.id);

  if (contentType && contentType.includes("multipart/form-data")) {
    formData = await parseMultipartFormData(
      request,
      createMemoryUploadHandler({ maxPartSize: MAX_UPLOAD_SIZE })
    );
  } else {
    formData = await request.formData();
  }

  let intent = formData.get("intent");

  switch (intent) {
    case Intent.BorrowGame: {
      let submission = parseWithZod(formData, {
        schema: BorrowGame,
      });
      return await borrowGame(submission, user.id);
    }

    case Intent.ReturnGame: {
      let submission = parseWithZod(formData, {
        schema: ReturnGame,
      });
      return await returnGame(submission, user.id);
    }

    case Intent.AdminRevokeBorrow: {
      let submission = parseWithZod(formData, {
        schema: AdminRevokeBorrow,
      });
      cache.delete(DETAILS_CACHE_KEY(gameId));
      return await adminRevokeBorrow(submission, user.id);
    }

    case Intent.UpdateLastPlayed: {
      let submission = parseWithZod(formData, {
        schema: UpdateLastPlayed,
      });

      return await updateLastPlayed(submission, user.id);
    }

    case Intent.UpdateMetadata: {
      let submission = parseWithZod(formData, {
        schema: UpdateMetadata,
      });

      updateVersion("detailedInfo");
      cache.delete(DETAILS_CACHE_KEY(gameId));
      return await updateMetadata(submission);
    }

    case Intent.DeleteRom: {
      let submission = parseWithZod(formData, {
        schema: DeleteROM,
      });

      updateVersion("detailedInfo");
      cache.delete(EXPLORE_CACHE_KEY);
      return await deleteRom(submission);
    }

    default: {
      throw new Error(
        "Details/$System/$Id action. Unknown intent: '" + intent + "'"
      );
    }
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
        <div className="absolute inset-0 bg-gradient-to-b from-black from-1% via-black/10 to-black to-99%" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-transparent via-black/20 to-black" />
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
          <div className="flex-shrink-0 bg-black/40 rounded lg:rounded-none">
            <img
              src={
                coverArt
                  ? `data:image/jpeg;base64,${coverArt}`
                  : "https://placehold.co/540x720"
              }
              alt={title}
              className="aspect-video w-full h-auto object-contain lg:aspect-[3/4] lg:w-[540px] lg:h-[720px] rounded-lg shadow-lg"
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
