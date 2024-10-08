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
import { Genre } from "@prisma/client";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
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

async function getIGDBAccessToken() {
  const tokenUrl = "https://id.twitch.tv/oauth2/token";
  const params = new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID,
    client_secret: process.env.TWITCH_SECRET,
    grant_type: "client_credentials",
  });

  try {
    const response = await fetch(`${tokenUrl}?${params.toString()}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.statusText}`);
    }

    const data = await response.json();
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
    console.error("Received an unknown intent");
    return json(
      submission.reply({
        formErrors: ["Received an unknown intent"],
      }),
      {
        status: 400,
      }
    );
  }

  const isValidFolder = existsSync(romFolderLocation);
  if (!isValidFolder) {
    return json(
      submission.reply({
        formErrors: ["The folder you provided does not exist!"],
      }),
      {
        status: 400,
      }
    );
  }

  let [accessToken, allFiles] = await Promise.all([
    getIGDBAccessToken(),
    getFilesRecursively(romFolderLocation),
  ]);

  console.log("accessToken", accessToken);

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
        for (const {
          title,
          location,
          // summary,
          // coverArt,
          // backgroundImage,
          system,
        } of games) {
          console.log(`---`, title);
          let romBuffer = await fs.readFile(location);

          let response = await fetchGameMetadata(
            process.env.TWITCH_CLIENT_ID,
            accessToken,
            title
          );
          let body = await response
            .json()
            .catch((err) => console.error("GETTING IMAGES ERROR", err));

          let game = body[0];
          console.log(game);

          let coverArt;
          if (game.cover && "url" in game.cover) {
            coverArt = game.cover.url.slice(2).replace("t_thumb", "t_720p");
          }

          let backgroundImage;
          if (game.artworks) {
            console.log("game artwork found", game.artworks);
            backgroundImage = game.artworks[0].url // ! THIS DOES NOT WORK
              .slice(2)
              .replace("t_thumb", "t_720p");
          }

          await txn.game.create({
            data: {
              title,
              file: romBuffer,
              releaseDate: new Date(),
              summary: game.summary,
              coverArt,
              backgroundImage,
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
                    createMany: {
                      data: [
                        ...game.genres.map((genre: Genre) => {
                          return {
                            name: genre.name,
                          };
                        }),
                      ],
                    },
                  }
                : undefined,
            },
          });
          await sleep(300); // IGDB rate limits us
          console.log(`${title} completed processing and inserted`);
        }
      },
      {
        timeout: 80000,
      }
    );
    console.log("transaction completed!");

    await prisma.settings.create({
      data: {
        romFolderLocation,
        onboardingComplete: new Date(),
      },
    });

    console.log("Updated settings, onboarding complete!");

    return null;
    //return redirect("/explore");
  } catch (error) {
    console.error("Transaction failed: ", error);
    return json(submission.reply(), { status: 500 });
  }
}

async function fetchGameMetadata(
  clientId: string,
  accessToken: string,
  searchQuery: string
) {
  return fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Client-ID": clientId,
      Authorization: `Bearer ${accessToken}`,
    },
    body: `fields id, name, summary, total_rating, total_rating_count, platforms.name, cover.*, first_release_date, genres.name, artworks.url;
search "${searchQuery}";
limit 1;`.trim(),
  });
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
