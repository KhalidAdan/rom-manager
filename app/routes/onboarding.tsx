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
import { useIsSubmitting } from "@/hooks/use-is-submitting";
import { requireUser } from "@/lib/auth/auth.server";
import { UserRoles } from "@/lib/auth/providers.server";
import { MAX_FILES, SUPPORTED_SYSTEMS_WITH_EXTENSIONS } from "@/lib/const";
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
import { useFetcher } from "@remix-run/react";
import { Loader } from "lucide-react";
import { useCallback, useState } from "react";
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
  intent: z.literal("upload-roms"),
  roms: z
    .array(z.instanceof(File))
    .min(1, "Please select at least one ROM file")
    .max(
      MAX_FILES,
      `Too many files selected. Please select ${MAX_FILES} or fewer files.`
    )
    .refine(
      (files) =>
        files.every((file) =>
          SUPPORTED_SYSTEMS_WITH_EXTENSIONS.map(
            (system) => system.extension
          ).some((ext) => file.name.toLowerCase().endsWith(ext))
        ),
      `All files must be of supported types: ${SUPPORTED_SYSTEMS_WITH_EXTENSIONS.map(
        (system) => system.title
      ).join(", ")}`
    ),
});

export async function loader({ request }: LoaderFunctionArgs) {
  let user = await requireUser(request);
  let settings = await prisma.settings.findFirst();
  if (settings?.onboardingComplete || user.roleId !== UserRoles.ADMIN)
    throw redirect("/explore");
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
  let [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  let [form, fields] = useForm({
    shouldValidate: "onBlur",
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: OnboardingSchema });
    },
  });

  let fetcher = useFetcher({ key: "onboarding-scrape-roms " });
  let isSubmitting = useIsSubmitting({
    formMethod: "POST",
    formAction: "/onboarding",
  });

  let handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      let files = event.target.files;
      if (files) {
        let filteredFiles = Array.from(files).filter((file) =>
          SUPPORTED_SYSTEMS_WITH_EXTENSIONS.some((system) =>
            file.name.toLowerCase().endsWith(system.extension)
          )
        );
        console.log(filteredFiles);
        setSelectedFiles(filteredFiles);
      }
    },
    []
  );

  let handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      console.log(selectedFiles);
      event.preventDefault();
      let formData = new FormData();
      formData.append("intent", Intent.UPLOAD_ROMS);
      selectedFiles.forEach((file) => formData.append("roms", file));
      fetcher.submit(formData, {
        method: "POST",
        encType: "multipart/form-data",
      });
    },
    [selectedFiles, fetcher]
  );

  return (
    <main className="h-full w-full flex flex-col justify-center items-center">
      <Card className="min-w-max max-w-3xl h-fit">
        <CardHeader>
          <CardTitle>Rom folder location</CardTitle>
          <CardDescription>
            Enter the location where you have saved all of your roms.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <fetcher.Form
            className="grid gap-6"
            {...getFormProps(form)}
            method="POST"
            encType="multipart/form-data"
            onSubmit={handleSubmit}
          >
            <div className="grid gap-3">
              <Label htmlFor="name">Rom folder location</Label>
              <Input
                className="w-full"
                {...getInputProps(fields.roms, {
                  type: "file",
                })}
                onChange={handleFileChange}
                webkitdirectory=""
                directory=""
                multiple
              />
            </div>
            <Button
              name="intent"
              value={Intent.UPLOAD_ROMS}
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader className="animate-spin mr-2" /> Scraping...
                </>
              ) : (
                "Select ROM folder"
              )}
            </Button>
          </fetcher.Form>
        </CardContent>
      </Card>
    </main>
  );
}
