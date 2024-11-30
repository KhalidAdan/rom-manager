import { Button } from "@/components/atoms/button";
import { useHints } from "@/lib/client-hints";
import { useRequestInfo } from "@/lib/request-info";
import { setTheme } from "@/lib/theme.server";
import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { ActionFunctionArgs, json } from "react-router";
import { useFetcher, useFetchers } from "react-router";
import { LaptopIcon, MoonIcon, SunIcon } from "lucide-react";
import { z } from "zod";

let ThemeFormSchema = z.object({
  theme: z.enum(["system", "light", "dark"]),
});

export async function action({ request }: ActionFunctionArgs) {
  let formData = await request.formData();
  let submission = parseWithZod(formData, {
    schema: ThemeFormSchema,
  });

  if (submission.status !== "success") {
    return json(submission.reply(), {
      status: submission.status === "error" ? 400 : 200,
    });
  }
  let { theme } = submission.value;

  let responseInit = {
    headers: { "set-cookie": setTheme(theme) },
  };
  return json(submission.reply(), responseInit);
}

export type ListOfErrors = Array<string | null | undefined> | null | undefined;

export function ErrorList({
  id,
  errors,
}: {
  errors?: ListOfErrors;
  id?: string;
}) {
  let errorsToRender = errors?.filter(Boolean);
  if (!errorsToRender?.length) return null;
  return (
    <ul id={id} className="flex flex-col gap-1">
      {errorsToRender.map((e) => (
        <li key={e} className="text-[10px] text-foreground-destructive">
          {e}
        </li>
      ))}
    </ul>
  );
}

export function ThemeSwitch() {
  let fetcher = useFetcher<typeof action>();
  let requestInfo = useRequestInfo();

  let [form, fields] = useForm({
    id: "theme-switch",
    lastResult: fetcher.data,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: ThemeFormSchema });
    },
  });

  let optimisticMode = useOptimisticThemeMode();
  let mode: "light" | "dark" | "system" =
    optimisticMode ?? requestInfo.userPrefs.theme ?? "dark";
  let nextMode =
    mode === "system" ? "dark" : mode === "light" ? "dark" : "light";

  let modeLabelMap = {
    light: (
      <>
        <SunIcon />
        <span className="sr-only">Light</span>
      </>
    ),
    dark: (
      <>
        <MoonIcon />
        <span className="sr-only">Dark</span>
      </>
    ),
    system: (
      <>
        <LaptopIcon />
        <span className="sr-only">System</span>
      </>
    ),
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      type="submit"
      className="rounded-full"
      form={form.id}
    >
      <fetcher.Form
        method="POST"
        action="/resources/set-theme"
        {...getFormProps(form)}
      >
        <input
          {...getInputProps(fields.theme, { type: "hidden" })}
          value={nextMode}
        />
        <div className="flex gap-2">{modeLabelMap[mode]}</div>
        <ErrorList errors={form.errors} id={form.errorId} />
      </fetcher.Form>
    </Button>
  );
}

export function useOptimisticThemeMode() {
  let fetchers = useFetchers();
  let themeFetcher = fetchers.find(
    (f) => f.formAction === "/resources/set-theme"
  );

  if (themeFetcher && themeFetcher.formData) {
    let submission = parseWithZod(themeFetcher.formData, {
      schema: ThemeFormSchema,
    });

    if (submission.status === "success") {
      return submission.value.theme;
    }
  }
}

export function useTheme() {
  let hints = useHints();
  let requestInfo = useRequestInfo();
  let optimisticMode = useOptimisticThemeMode();
  if (optimisticMode) {
    return optimisticMode === "system" ? hints.theme : optimisticMode;
  }
  return requestInfo.userPrefs.theme ?? hints.theme;
}
