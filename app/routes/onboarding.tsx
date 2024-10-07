import { requireUser } from "@/lib/auth/auth.server";
import { prisma } from "@/lib/prisma.server";
import { parseWithZod } from "@conform-to/zod";
import {
  ActionFunctionArgs,
  json,
  LoaderFunctionArgs,
  redirect,
} from "@remix-run/node";
import { z } from "zod";

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
import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { Form } from "@remix-run/react";
import { existsSync } from "node:fs";

enum Intent {
  SET_ROM_FOLDER_LOCATION = "set-rom-folder-location",
}

let OnboardingSchema = z.object({
  intent: z.string(),
  romFolderLocation: z.string(),
});

export async function fetchGameData(
  gameQuery: string,
  clientId: string,
  accessToken: string
) {
  try {
    const response = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Client-ID": clientId,
        Authorization: `Bearer ${accessToken}`,
      },
      body: `
        fields name, first_release_date, cover.url;
        where name ~ "${gameQuery}";
      `,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch data for: ${gameQuery}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function processGameData(gameData: any) {
  return {
    title: gameData.name,
    releaseDate: new Date(gameData.first_release_date * 1000), // Convert from Unix timestamp to JS Date
    coverArt: gameData.cover?.url || null,
    file: null, // You’ll handle file uploads separately
    created_at: new Date(),
    updated_at: new Date(),
    systemId: 1, // This is just a placeholder, you'll handle the relation
  };
}

async function fetchMultipleGames(
  gameQueries: string[],
  clientId: string,
  accessToken: string
) {
  const promises = gameQueries.map((gameQuery) =>
    fetchGameData(gameQuery, clientId, accessToken)
  );

  const results = await Promise.allSettled(promises);

  results.forEach((result, index) => {
    if (result.status === "fulfilled" && result.value.success) {
      const processedGameData = processGameData(result.value.data[0]); // Assuming IGDB returns one game per query
      console.log(
        `Processed Data for ${gameQueries[index]}:`,
        processedGameData
      );
    } else {
      console.error(
        `Error fetching data for ${gameQueries[index]} with status:`,
        result.status
      );
    }
  });

  return results;
}

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

export async function loader({ request, params }: LoaderFunctionArgs) {
  return await requireUser(request);
}

export async function action({ request, params }: ActionFunctionArgs) {
  let user = await requireUser(request);
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

  //TODO:  download all of the GBA, GB, GBC, SNES games to SQLite
  let accessToken = getIGDBAccessToken();

  await prisma.settings
    .create({
      data: {
        romFolderLocation,
      },
    })
    .catch((err) => {
      console.error("Failed to create settings", err);
      return json(
        submission.reply({
          formErrors: ["Failed to create settings"],
        }),
        { status: 500 }
      );
    });

  await prisma.user
    .update({
      where: { id: user.id },
      data: {
        onboardedAt: new Date(),
      },
    })
    .catch((err) => {
      console.error("Failed to update user onboarding status", err);
      return json(
        submission.reply({
          formErrors: ["Failed to update user onboarding status"],
        }),
        { status: 500 }
      );
    });

  return redirect("/systems");
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
