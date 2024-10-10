import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Form } from "@remix-run/react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export function Login() {
  return (
    <div className="h-full w-full lg:grid lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[800px]">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">Welcome!</h1>
          </div>
          <div className={cn("grid gap-6")}>
            <Form method="POST" action={`/auth/form`}>
              <div className="grid gap-2">
                <div className="grid gap-1">
                  <Label className="sr-only" htmlFor="email">
                    Email
                  </Label>
                  <Input
                    id="email"
                    className="rounded-lg placeholder:opacity-50"
                    placeholder="name@example.com"
                    type="email"
                    name="email"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect="off"
                    required
                  />
                  <Label className="sr-only" htmlFor="password">
                    Password
                  </Label>
                  <Input
                    id="password"
                    placeholder="Enter a password"
                    className="rounded-lg placeholder:opacity-50"
                    type="password"
                    name="password"
                    required
                  />
                </div>
                <Button
                  variant="default"
                  type="submit"
                  name="intent"
                  value="form-auth"
                >
                  Authenticate
                </Button>
              </div>
            </Form>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <Form
              method="post"
              action={`/auth/google`}
              className="cursor-not-allowed"
            >
              <Button
                variant="outline"
                type="submit"
                name="intent"
                value="google-auth"
                className="w-full"
                disabled
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  x="0px"
                  y="0px"
                  width="100"
                  height="100"
                  viewBox="0 0 24 24"
                  className="mr-2 h-4 w-4 !text-foreground"
                >
                  <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032 s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2 C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"></path>
                </svg>
                Google
              </Button>
            </Form>
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
