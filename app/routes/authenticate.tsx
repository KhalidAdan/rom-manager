import { Login } from "@/components/organisms/login";
import { sessionStore } from "@/lib/auth/session.server";
import { prisma } from "@/lib/prisma.server";
import { LoaderFunctionArgs, redirect } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
  let settings = await prisma.settings.findFirst({
    select: {
      onboardingComplete: true,
    },
  });
  let session = await sessionStore.getSession(request.headers.get("cookie"));
  let user = session.get("user");
  if (user)
    throw redirect(
      settings && settings.onboardingComplete !== null
        ? "/explore"
        : "/onboarding"
    );

  return null;
}

export default function AuthenticationPage() {
  return (
    <main className="h-dvh flex flex-col">
      <Login />
    </main>
  );
}
