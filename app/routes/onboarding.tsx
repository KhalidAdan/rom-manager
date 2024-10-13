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
import { SUPPORTED_SYSTEMS_WITH_EXTENSIONS } from "@/lib/const";
import {
  getFilesRecursively,
  processFilePathsIntoGameObjects,
  validateFolder,
} from "@/lib/fs.server";
import { getIGDBAccessToken, scrapeRoms } from "@/lib/igdb.server";
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
import { z } from "zod";

enum Intent {
  SET_ROM_FOLDER_LOCATION = "set-rom-folder-location",
}

let OnboardingSchema = z.object({
  intent: z.string(),
  romFolderLocation: z.string(),
});

export async function loader({ request }: LoaderFunctionArgs) {
  return await requireUser(request);
}

export async function action({ request }: ActionFunctionArgs) {
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

  if (!validateFolder(romFolderLocation)) {
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

  let games = processFilePathsIntoGameObjects(allFiles, extensions);

  try {
    console.log("processing transaction");
    await scrapeRoms(accessToken, games);

    await prisma.settings.create({
      data: {
        romFolderLocation,
        onboardingComplete: new Date(),
      },
    });

    console.log("Updated settings, onboarding complete!");

    return redirect("/explore");
  } catch (error) {
    console.error("Onboarding transaction failed: ", error);
    return json(submission.reply(), { status: 500 });
  }
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
