import { Button } from "@/components/atoms/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card";
import { Input } from "@/components/atoms/input";
import { Label } from "@/components/atoms/label";
import { useIsSubmitting } from "@/hooks/use-is-submitting";
import { requireUser } from "@/lib/auth/auth.server";
import { UserRoles } from "@/lib/auth/providers.server";
import { MAX_FILES, SUPPORTED_SYSTEMS_WITH_EXTENSIONS } from "@/lib/const";
import { processUploadedDirectory } from "@/lib/fs.server";
import { queueGamesForProcessing } from "@/lib/jobs";
import { prisma } from "@/lib/prisma.server";
import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { Loader } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  ActionFunctionArgs,
  data,
  LoaderFunctionArgs,
  redirect,
  useFetcher,
} from "react-router";
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

  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  await requireUser(request);
  let formData = await request.formData();

  let submission = parseWithZod(formData, {
    schema: OnboardingSchema,
  });

  if (submission.status !== "success") {
    return data(submission.reply(), {
      status: submission.status === "error" ? 400 : 200,
    });
  }

  let { roms, intent } = submission.value;

  if (intent !== Intent.UPLOAD_ROMS) {
    return data(
      submission.reply({ formErrors: ["Received an unknown intent"] }),
      { status: 400 }
    );
  }

  let extensions = SUPPORTED_SYSTEMS_WITH_EXTENSIONS.map(
    (system) => system.extension
  );

  try {
    console.log("Onboarding started, queueing ROMs to be worked on...");
    let processedFiles = await processUploadedDirectory(roms, extensions);
    await queueGamesForProcessing(processedFiles);

    console.log("Onboarding complete!");

    console.log("Updated settings, onboarding complete!");

    return redirect("/processing-status");
  } catch (error) {
    console.error("Onboarding transaction failed: ", error);
    return data(submission.reply(), { status: 500 });
  }
}

export default function Onboarding() {
  let [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  let [form, fields] = useForm({
    shouldValidate: "onSubmit",
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
        setSelectedFiles(filteredFiles);
      }
    },
    []
  );

  let handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isProcessing || isSubmitting) return;

      setIsProcessing(true);

      try {
        let formData = new FormData();
        formData.append("intent", Intent.UPLOAD_ROMS);
        selectedFiles.forEach((file) => formData.append("roms", file));
        fetcher.submit(formData, {
          method: "POST",
          encType: "multipart/form-data",
        });
      } catch (error) {
        console.error(error);
      } finally {
        setIsProcessing(false);
      }
    },
    [selectedFiles, fetcher]
  );

  useEffect(() => {
    if (fetcher.state === "idle") {
      setIsProcessing(false);
    }
  }, [fetcher.state]);

  const isDisabled = isProcessing || isSubmitting;

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
              {isDisabled ? (
                <>
                  <Loader className="animate-spin mr-2" /> Processing...
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
