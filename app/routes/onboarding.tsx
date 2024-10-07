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
