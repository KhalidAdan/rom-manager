import {
  DeleteROM,
  DeleteROMForm,
} from "@/components/molecules/delete-rom-form";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requireUser } from "@/lib/auth/auth.server";
import { UserRoles } from "@/lib/auth/providers.server";
import {
  cache,
  generateETag,
  getGlobalVersion,
  updateGlobalVersion,
} from "@/lib/cache/cache.server";
import {
  CACHE_SWR,
  CACHE_TTL,
  MAX_UPLOAD_SIZE,
  ROM_MAX_SIZE,
} from "@/lib/const";
import { getGameDetailsData } from "@/lib/game-library";
import { prisma } from "@/lib/prisma.server";
import { Intent as PlayIntent } from "@/routes/play.$system.$id";
import {
  getFormProps,
  getInputProps,
  Submission,
  useForm,
} from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import cachified from "@epic-web/cachified";
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
  Form,
  Link,
  useFetcher,
  useLoaderData,
  useNavigate,
} from "@remix-run/react";
import { ArrowLeft, Lock } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

type RomDetails = {
  name: string;
  releaseDate: string;
  coverArt: string;
  backgroundImage: string;
  summary: string;
  genres: string[];
};

export enum Intent {
  UpdateMetadata = "update-metadata",
  UpdateLastPlayed = "update-last-played",
  DeleteRom = "delete-rom",
}

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

export async function loader({ request, params }: LoaderFunctionArgs) {
  let user = await requireUser(request);
  if (!user.signupVerifiedAt && user.roleId !== UserRoles.ADMIN) {
    throw redirect(`/needs-permission`);
  }

  let gameId = Number(params.id);

  try {
    let game = await cachified({
      key: `game-${gameId}`,
      cache,
      async getFreshValue() {
        return await getGameDetailsData(gameId, user);
      },
      ttl: CACHE_TTL,
      swr: CACHE_SWR,
    });

    if (game.borrowedBy && game.borrowedBy.id !== user.id) {
      throw redirect(`/details/${game.system.title}/${gameId}`);
    }

    return json(game, {
      headers: {
        "Cache-Control": "max-age=900, stale-while-revalidate=3600",
        ETag: `"${generateETag(game)}"`,
        "X-Version": getGlobalVersion().toString(),
      },
    });
  } catch (error) {
    updateGlobalVersion();
    return json({ error: `${error}` });
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
      borrowedBy: {
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

      updateGlobalVersion();
      cache.delete(`game-${params.id}`);
      return await updateMetadata(submission);
    }
    case Intent.DeleteRom: {
      let submission = parseWithZod(formData, {
        schema: DeleteROM,
      });

      updateGlobalVersion();
      cache.delete("explore");
      return await deleteRom(submission);
    }
    default: {
      throw new Error(
        "Details/$System/$Id action. Unknown intent: '" + intent + "'"
      );
    }
  }
}

export default function RomDetails() {
  let data = useLoaderData<typeof loader>();
  if ("error" in data) return <div>Error occurred, {data.error}</div>;
  let {
    id,
    title,
    system,
    releaseDate,
    coverArt,
    backgroundImage,
    summary,
    gameGenres,
    borrowedBy,
    user,
  } = data;
  let [expensiveDate, setExpensiveDate] = useState<Date | undefined>(() => {
    // seconds to milliseconds, IGDB uses seconds
    let date = releaseDate ? new Date(releaseDate * 1000) : undefined;

    return date;
  });
  let navigate = useNavigate();

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

  let fetcher = useFetcher({ key: "update-last-played-game" });

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
            {borrowedBy && (
              <div className="mb-4">
                <div className="space-y-2 mb-2 py-4">
                  <span className="flex items-center gap-2">
                    <Lock size="20" aria-hidden="true" /> Someone&apos; playing
                    this
                  </span>
                  <p>
                    A user has borrowed this title already, it is not available
                    to be borrowed. Revoking their lock will remove them from
                    their play session.
                  </p>
                  {user.roleId > borrowedBy.roleId && (
                    <Form
                      method="POST"
                      action={`/play/${system.title}/${id}`}
                      navigate={false}
                      className="pt-2"
                    >
                      <Input type="hidden" name="gameId" defaultValue={id} />
                      <Input
                        type="hidden"
                        name="borrowerId"
                        defaultValue={borrowedBy.id}
                      />
                      <Button
                        variant="destructive"
                        type="submit"
                        name="intent"
                        value={PlayIntent.RemoveBorrowVoucher}
                      >
                        Revoke lock
                      </Button>
                    </Form>
                  )}
                </div>
              </div>
            )}
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
              {!borrowedBy ? (
                <Link
                  to={`/play/${system.title}/${id}`}
                  className={buttonVariants({ variant: "default" })}
                  onClick={() => {
                    fetcher.submit(
                      { intent: Intent.UpdateLastPlayed, gameId: id },
                      { method: "POST" }
                    );
                  }}
                >
                  Play Now
                </Link>
              ) : (
                <Button disabled>Not available</Button>
              )}
              <Button variant="outline">Add to Favorites</Button>
            </div>
            <fetcher.Form method="POST"></fetcher.Form>
          </div>
        </div>
      </div>
    </div>
  );
}
