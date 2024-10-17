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
import { processUploadedDirectory } from "@/lib/fs.server";
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
import { useState } from "react";
import { z } from "zod";

declare module "react" {
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    webkitdirectory?: string;
    directory?: string;
  }
}

enum Intent {
  UPLOAD_ROMS = "upload-roms",
}

let OnboardingSchema = z.object({
  intent: z.string(),
  roms: z
    .any()
    .refine(
      (value) =>
        value instanceof Object && "length" in value && value.length > 0,
      {
        message: "Please select a directory containing ROM files",
      }
    )
    .transform((value) => Array.from(value as ArrayLike<File>)),
});

export async function loader({ request }: LoaderFunctionArgs) {
  let settings = await prisma.settings.findFirst();
  if (settings?.onboardingComplete) throw redirect("/explore");
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

  let { roms, intent } = submission.value;

  if (intent !== Intent.UPLOAD_ROMS) {
    return json(
      submission.reply({ formErrors: ["Received an unknown intent"] }),
      { status: 400 }
    );
  }

  let extensions = SUPPORTED_SYSTEMS_WITH_EXTENSIONS.map(
    (system) => system.extension
  );

  try {
    console.log("processing transaction");
    let [accessToken, processedFiles] = await Promise.all([
      getIGDBAccessToken(),
      processUploadedDirectory(roms, extensions),
    ]);

    await scrapeRoms(accessToken, processedFiles);
    await prisma.settings.create({
      data: {
        onboardingComplete: new Date(),
      },
    });

    console.log("Onboarding complete!");

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
          <Form
            className="grid gap-6"
            {...getFormProps(form)}
            method="POST"
            encType="multipart/form-data"
          >
            <div className="grid gap-3">
              <Label htmlFor="name">Rom folder location</Label>
              <Input
                className="w-full"
                {...getInputProps(fields.roms, {
                  type: "file",
                })}
                accept=".gba,.sfc,.gbc"
                webkitdirectory=""
                directory=""
                multiple
              />
            </div>
            <Button name="intent" value={Intent.UPLOAD_ROMS} type="submit">
              Set Directory
            </Button>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}
