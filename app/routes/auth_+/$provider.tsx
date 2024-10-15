import { authenticator, sessionKeyPrefix } from "@/lib/auth/auth.server";
import { Provider } from "@/lib/auth/providers.server";
import {
  commitSession,
  getSession,
  makeSession,
} from "@/lib/auth/session.server";
import { prisma } from "@/lib/prisma.server";
import { ActionFunctionArgs, json, redirect } from "@remix-run/node";

export async function loader() {
  return redirect("/authenticate");
}

export async function action({ request, params, context }: ActionFunctionArgs) {
  let providerName = Provider.parse(params.provider);
  try {
    let user = await authenticator.authenticate(providerName, request);

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
  } catch (error) {
    return json(
      {
        error: "Invalid credentials",
      },
      { status: 500 }
    );
  }
}
