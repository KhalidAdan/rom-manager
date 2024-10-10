import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireUser } from "@/lib/auth/auth.server";
import {
  CATEGORY_BUNDLE,
  CATEGORY_EXPANDED_GAME,
  CATEGORY_MAIN_GAME,
  CATEGORY_PORT,
  CATEGORY_REMAKE,
  MAX_UPLOAD_SIZE,
  prettifyROMTitles,
  SUPPORTED_SYSTEMS_WITH_EXTENSIONS,
} from "@/lib/const";
import {
  getFilesRecursively,
  processFilePathsIntoGameObjects,
} from "@/lib/fs.server";
import { prisma } from "@/lib/prisma.server";
import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import {
  ActionFunctionArgs,
  json,
  LoaderFunctionArgs,
  redirect,
} from "@remix-run/node";
import { Form } from "@remix-run/react";
import { promises as fs } from "fs";
import { existsSync } from "node:fs";
import { z } from "zod";

enum Intent {
  SET_ROM_FOLDER_LOCATION = "set-rom-folder-location",
}

let OnboardingSchema = z.object({
  intent: z.string(),
  romFolderLocation: z.string(),
});

let Artwork = z.object({
  id: z.number(),
  url: z.string(),
});

let Cover = z.object({
  id: z.number(),
  alpha_channel: z.boolean(),
  animated: z.boolean(),
  game: z.number(),
  height: z.number(),
  image_id: z.string(),
  url: z.string(),
  width: z.number(),
  checksum: z.string(),
});

let Genres = z.object({
  id: z.number(),
  name: z.string(),
});

let Platforms = z.object({
  id: z.number(),
  name: z.string(),
});

let Game = z.object({
  id: z.number(),
  artworks: z.array(Artwork).optional(),
  category: z.number().optional(),
  cover: Cover.optional(),
  first_release_date: z.number().optional(),
  genres: z.array(Genres).optional(),
  name: z.string(),
  platforms: z.array(Platforms).optional(),
  summary: z.string().optional(),
});

type Game = z.infer<typeof Game>;

let GameMetaData = Game.pick({
  id: true,
  genres: true,
  summary: true,
}).extend({
  title: z.string(),
  releaseDate: z.number().optional(),
  coverArt: z
    .instanceof(Buffer)
    .refine((buffer) => {
      return buffer.byteLength <= MAX_UPLOAD_SIZE;
    }, "Cover Art size must be less than 5MB")
    .optional(),
  backgroundImage: z
    .instanceof(Buffer)
    .refine((buffer) => {
      return buffer.byteLength <= MAX_UPLOAD_SIZE;
    }, "Background Image size must be less than 5MB")
    .optional(),
});

type GameMetaData = z.infer<typeof GameMetaData>;

async function getIGDBAccessToken() {
  let tokenUrl = "https://id.twitch.tv/oauth2/token";
  let params = new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID,
    client_secret: process.env.TWITCH_SECRET,
    grant_type: "client_credentials",
  });

  try {
    let response = await fetch(`${tokenUrl}?${params.toString()}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.statusText}`);
    }

    let data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("Error fetching Twitch access token:", error);
    throw error;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  return await requireUser(request);
}

export async function action({ request, params }: ActionFunctionArgs) {
  await requireUser(request);
  let formData = await request.formData();

  let submission = parseWithZod(formData, {
    schema: OnboardingSchema,
  });

  if (submission.status !== "success") {
    return json(submission.reply(), {
      status: submission.status === "error" ? 400 : 200,
    });
  }

  let { romFolderLocation, intent } = submission.value;

  if (intent !== Intent.SET_ROM_FOLDER_LOCATION) {
    return json(
      submission.reply({ formErrors: ["Received an unknown intent"] }),
      { status: 400 }
    );
  }

  let isValidFolder = existsSync(romFolderLocation);
  if (!isValidFolder) {
    return json(
      submission.reply({
        formErrors: ["The folder you provided does not exist!"],
      }),
      { status: 400 }
    );
  }

  let [accessToken, allFiles] = await Promise.all([
    getIGDBAccessToken(),
    getFilesRecursively(romFolderLocation),
  ]);

  let extensions = SUPPORTED_SYSTEMS_WITH_EXTENSIONS.map(
    (system) => system.extension
  );
  let games = processFilePathsIntoGameObjects(allFiles, extensions).map(
    (game) => ({
      ...game,
      title: prettifyROMTitles(game.title).replace(" - ", " "),
    })
  );

  try {
    console.log("processing transaction");
    await prisma.$transaction(
      async (txn) => {
        for (let { title, location, system } of games) {
          console.log(`---`, title);
          let romBuffer = await fs.readFile(location);

          let game = await fetchGameMetadata(
            process.env.TWITCH_CLIENT_ID,
            accessToken,
            title,
            system.title
          );

          await txn.game.create({
            data: {
              title: game.title,
              fileName: title,
              file: romBuffer,
              releaseDate: game.releaseDate ?? 0,
              summary: game.summary ?? "",
              coverArt: game.coverArt,
              backgroundImage: game.backgroundImage,
              system: {
                connectOrCreate: {
                  where: {
                    title: system.title,
                  },
                  create: {
                    title: system.title,
                    extension: system.extension,
                  },
                },
              },
              genres: game.genres
                ? {
                    connectOrCreate: game.genres.map((genre) => ({
                      where: {
                        name: genre.name,
                      },
                      create: {
                        name: genre.name,
                      },
                    })),
                  }
                : undefined,
            },
          });
          await sleep(300); // IGDB rate limit
          console.log(`${title} completed processing and inserted`);
        }
      },
      {
        timeout: 80000,
      }
    );

    await prisma.settings.create({
      data: {
        romFolderLocation,
        onboardingComplete: new Date(),
      },
    });

    console.log("Updated settings, onboarding complete!");

    return redirect("/explore");
  } catch (error) {
    console.error("Transaction failed: ", error);
    return json(submission.reply(), { status: 500 });
  }
}

async function fetchGameMetadata(
  clientId: string,
  accessToken: string,
  searchQuery: string,
  platform: string
): Promise<GameMetaData> {
  let response = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Client-ID": clientId,
      Authorization: `Bearer ${accessToken}`,
    },
    body: `fields id, name, summary, total_rating, total_rating_count, platforms.name, cover.*, first_release_date, genres.name, artworks.url, category;
search "${searchQuery}";
where platforms.abbreviation = "${platform}" & category = (${CATEGORY_MAIN_GAME},${CATEGORY_BUNDLE},${CATEGORY_REMAKE},${CATEGORY_EXPANDED_GAME},${CATEGORY_PORT});
limit 1;`.trim(),
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  let gameData = await response.json();
  if (!gameData || gameData.length === 0) {
    throw new Error("No game data found");
  }

  console.dir(gameData, { depth: Infinity });

  let game: Game = Game.parse(gameData[0]);

  let coverImage: Blob | undefined;
  let backgroundImage: Blob | undefined;

  if (game.cover) {
    const coverResponse = await fetch(
      "http:" + game.cover.url.replace("t_thumb", "t_cover_big")
    );
    if (coverResponse.ok) {
      coverImage = await coverResponse.blob();
    }
  }
  if (game.artworks && game.artworks.length > 0) {
    const artworkResponse = await fetch(
      "http:" + game.artworks[0].url.replace("t_thumb", "t_1080p")
    );
    if (artworkResponse.ok) {
      backgroundImage = await artworkResponse.blob();
    }
  }

  return {
    id: game.id,
    title: game.name,
    summary: game.summary,
    releaseDate: game.first_release_date,
    genres: game.genres,
    coverArt: coverImage
      ? Buffer.from(await coverImage.arrayBuffer())
      : undefined,
    backgroundImage: backgroundImage
      ? Buffer.from(await backgroundImage.arrayBuffer())
      : undefined,
  };
}

export default function Onboarding() {
  let [form, fields] = useForm({
    shouldValidate: "onBlur",
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: OnboardingSchema });
    },
  });
  return (
    <main className="h-full w-full flex justify-center items-center">
      <Card className="min-w-max max-w-3xl h-fit">
        <CardHeader>
          <CardTitle>Rom folder location</CardTitle>
          <CardDescription>
            Enter the location where you have saved all of your roms.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form className="grid gap-6" {...getFormProps(form)} method="POST">
            <div className="grid gap-3">
              <Label htmlFor="name">Rom folder location</Label>
              <Input
                className="w-full"
                {...getInputProps(fields.romFolderLocation, {
                  type: "text",
                })}
              />
            </div>
            <Button
              name="intent"
              value={Intent.SET_ROM_FOLDER_LOCATION}
              type="submit"
            >
              Set Directory
            </Button>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}
