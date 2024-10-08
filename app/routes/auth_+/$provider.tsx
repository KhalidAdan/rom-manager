import { authenticator, sessionKeyPrefix } from "@/lib/auth/auth.server";
import { Provider } from "@/lib/auth/providers.server";
import {
  commitSession,
  getSession,
  makeSession,
} from "@/lib/auth/session.server";
import { prisma } from "@/lib/prisma.server";
import { ActionFunctionArgs, redirect } from "@remix-run/node";

export async function loader() {
  return redirect("/authenticate");
}

export async function action({ request, params, context }: ActionFunctionArgs) {
  let providerName = Provider.parse(params.provider);
  let user = await authenticator.authenticate(providerName, request, {
    failureRedirect: "/authenticate",
  });

  let { id } = await makeSession(user.id);

  let session = await getSession(request.headers.get("Cookie"));

  session.set(sessionKeyPrefix, id);
  session.set("user", user);
  session.set("strategy", providerName);

  let headers = new Headers({
    "Set-Cookie": await commitSession(session),
  });

  let settings = await prisma.settings.findFirst();

  if (settings == null) {
    return redirect("/onboarding", { headers });
  }
  return redirect("/explore", { headers });
}
