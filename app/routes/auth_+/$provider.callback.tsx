import { authenticator, sessionKeyPrefix } from "@/lib/auth/auth.server";
import { Provider } from "@/lib/auth/providers";
import {
  commitSession,
  getSession,
  makeSession,
} from "@/lib/auth/session.server";
import { LoaderFunctionArgs, redirect } from "@remix-run/node";

export async function loader({ request, params }: LoaderFunctionArgs) {
  let providerName = Provider.parse(params.provider);
  let user = await authenticator.authenticate(providerName, request, {
    failureRedirect: "/login",
  });

  let { id } = await makeSession(user.id);

  let session = await getSession(request.headers.get("Cookie"));

  session.set(sessionKeyPrefix, id);
  session.set("user", user);
  session.set("strategy", providerName);

  let headers = new Headers({
    "Set-Cookie": await commitSession(session),
  });

  return redirect("/systems", { headers });
}
