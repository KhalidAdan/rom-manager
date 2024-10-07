import { Login } from "@/components/pages/login";
import { authenticator } from "@/lib/auth/auth.server";
import { getSession } from "@/lib/auth/session.server";
import { LoaderFunctionArgs } from "@remix-run/node";

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticator.isAuthenticated(request, {
    successRedirect: "/systems",
  });

  let session = await getSession(request.headers.get("cookie"));
  session.set("strategy", "form");

  return null;
}

export default function AuthenticationPage() {
  return (
    <main className="h-dvh flex flex-col">
      <Login />
    </main>
  );
}
