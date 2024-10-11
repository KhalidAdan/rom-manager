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
import { MAX_UPLOAD_SIZE, ROM_MAX_SIZE } from "@/lib/const";
import { prisma } from "@/lib/prisma.server";
import { cn } from "@/lib/utils";
import { Intent as PlayIntent } from "@/routes/play.$system.$title";
import {
  getFormProps,
  getInputProps,
  Submission,
  useForm,
} from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import { Label } from "@radix-ui/react-label";
import {
  ActionFunctionArgs,
  unstable_createMemoryUploadHandler as createMemoryUploadHandler,
  json,
  LoaderFunctionArgs,
  unstable_parseMultipartFormData as parseMultipartFormData,
} from "@remix-run/node";
import { Form, Link, useFetcher, useLoaderData } from "@remix-run/react";
import { ArrowLeft, Lock } from "lucide-react";
import { useId, useState } from "react";
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
}

let UpdateMetadata = z
  .object({
    id: z.number(),
    intent: z.literal(Intent.UpdateMetadata),
    title: z.string(),
    releaseDate: z.date().optional(),
    coverArt: z
      .instanceof(File)
      .refine(
        (file) => file.size <= MAX_UPLOAD_SIZE,
        "coverArt must be no larger than 5MB"
      )
      .optional(),
    summary: z.string(),
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

  let game = await prisma.game.findFirst({
    where: {
      title: params.title,
    },
    select: {
      id: true,
      title: true,
      releaseDate: true,
      backgroundImage: true,
      summary: true,
      coverArt: true,
      borrowedBy: {
        select: {
          id: true,
          roleId: true,
        },
      },
      system: {
        select: {
          id: true,
          title: true,
        },
      },
      genres: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!game) throw new Error("Where the game at dog?");
  return {
    ...game,
    coverArt: game.coverArt
      ? Buffer.from(game.coverArt).toString("base64")
      : null,
    backgroundImage: game.backgroundImage
      ? Buffer.from(game.backgroundImage).toString("base64")
      : null,
    user,
  };
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

export async function action({ request }: ActionFunctionArgs) {
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

      return await updateMetadata(submission);
    }
    default: {
      return null;
    }
  }
}

export default function RomDetails() {
  let {
    id,
    title,
    system,
    releaseDate,
    coverArt,
    backgroundImage,
    summary,
    genres,
    borrowedBy,
    user,
  } = useLoaderData<typeof loader>();
  let [expensiveDate] = useState(() =>
    // seconds to milliseconds, IGDB uses seconds
    new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(releaseDate * 1000))
  );
  let formId = useId();

  let [form, fields] = useForm({
    id: formId,
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
    <div className="relative min-h-screen text-white overflow-hidden">
      {/* Background Image */}
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
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-16">
        <div className="flex w-full justify-start mb-4">
          <Link
            to="/explore"
            preventScrollReset
            className={cn("flex", buttonVariants({ variant: "link" }))}
            prefetch="render"
          >
            <span className="mr-2">
              <ArrowLeft />
            </span>
            Go Back
          </Link>
        </div>
        <div className="flex flex-col md:flex-row gap-8">
          {/* Cover Art */}
          <div className="flex-shrink-0">
            <img
              src={
                coverArt
                  ? `data:image/jpeg;base64,${coverArt}`
                  : "https://placehold.co/540x720"
              }
              alt={title}
              className="rounded-lg shadow-lg w-[540px] h-[720px]"
            />
          </div>

          {/* Details */}
          <div className="flex flex-col justify-center">
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
                  {user.roleId < borrowedBy.roleId && (
                    <Form
                      method="POST"
                      action={`/play/${system.title}/${title}`}
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
                        value={PlayIntent.RemoveBorrowLock}
                      >
                        Revoke lock
                      </Button>
                    </Form>
                  )}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between gap-x-4">
              <h1 className="flex items-center gap-4 text-4xl font-bold mb-2 font-sans-serif self-start">
                {title} <span className="uppercase">({system.title})</span>
              </h1>
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
                  {/* Form */}
                  <Form
                    {...getFormProps(form)}
                    method="POST"
                    className="grid gap-y-4"
                    encType="multipart/form-data"
                  >
                    <Input {...getInputProps(fields.id, { type: "hidden" })} />
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
                      <DatePicker initialDate={releaseDate ?? undefined} />
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
                    <Button type="submit" form={formId}>
                      Save
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <p className="text-muted-foreground mb-4 text-lg">
              {expensiveDate}
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {genres.map((genre, i) => (
                <Badge key={i}>{genre.name}</Badge>
              ))}
            </div>
            <p className="text-lg mb-6">{summary}</p>
            <div className="flex gap-4">
              {!borrowedBy ? (
                <Link
                  preventScrollReset
                  to={`/play/${system.title}/${title}`}
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
