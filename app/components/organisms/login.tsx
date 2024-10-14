import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { action } from "@/routes/auth_+/$provider";
import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import { useFetcher } from "@remix-run/react";
import { LoaderIcon } from "lucide-react";
import { z } from "zod";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

let FormSchema = z.object({
  email: z.string({ message: "email must not be empty" }).email().min(1),
  password: z.string({ message: "password must not be empty" }).min(1),
});

type FormSchema = z.infer<typeof FormSchema>;

export function Login() {
  let [form, fields] = useForm({
    constraint: getZodConstraint(FormSchema),
    onValidate({ formData }) {
      return parseWithZod(formData, {
        schema: FormSchema,
      });
    },
  });

  let fetcher = useFetcher<typeof action>({ key: "authenticate" });

  return (
    <div className="h-full w-full lg:grid lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[800px]">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">Welcome!</h1>
          </div>
          <div className={cn("grid gap-6")}>
            <fetcher.Form
              method="POST"
              action={`/auth/form`}
              {...getFormProps(form)}
            >
              <div className="grid gap-2">
                <div className="grid gap-1">
                  <Label className="sr-only" htmlFor="email">
                    Email
                  </Label>
                  <Input
                    {...getInputProps(fields.email, { type: "email" })}
                    className="rounded-lg placeholder:opacity-50"
                    placeholder="name@example.com"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect="off"
                    required
                  />
                  <Label className="sr-only" htmlFor="password">
                    Password
                  </Label>
                  <Input
                    {...getInputProps(fields.password, { type: "password" })}
                    placeholder="Enter a password"
                    className="rounded-lg placeholder:opacity-50"
                    required
                  />
                </div>
                <Button
                  variant="default"
                  type="submit"
                  name="intent"
                  value="form-auth"
                  className="mt-2"
                >
                  {fetcher.state === "submitting" && (
                    <LoaderIcon className="animate-spin mr-2" />
                  )}{" "}
                  Authenticate
                </Button>
                {fetcher.data?.error && <p>{fetcher.data.error}</p>}
              </div>
            </fetcher.Form>
          </div>
        </div>
      </div>
      <div className="hidden bg-muted lg:block">
        <img
          src="/login-photo.jpg"
          alt="Image"
          width="1920"
          height="1080"
          className="h-full w-full object-cover dark:brightness-[0.8] dark:grayscale"
        />
      </div>
    </div>
  );
}
