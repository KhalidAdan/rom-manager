import { Login } from "@/components/organisms/login";
import { authenticator } from "@/lib/auth/auth.server";
import { prisma } from "@/lib/prisma.server";
import { LoaderFunctionArgs } from "@remix-run/node";

export async function loader({ request }: LoaderFunctionArgs) {
  let settings = await prisma.settings.findFirst({
    select: {
      onboardingComplete: true,
    },
  });
  await authenticator.isAuthenticated(request, {
    successRedirect:
      settings && settings.onboardingComplete !== null
        ? "/explore"
        : "/onboarding",
  });
  return null;
}

export default function AuthenticationPage() {
  return (
    <main className="h-dvh flex flex-col">
      <Login />
    </main>
  );
}
