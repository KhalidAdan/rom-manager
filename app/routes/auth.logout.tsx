import { sessionStore } from "@/lib/auth/session.server";
import { ActionFunctionArgs, LoaderFunctionArgs, redirect } from "react-router";

export async function action({ request }: ActionFunctionArgs) {
  let session = await sessionStore.getSession(request.headers.get("cookie"));
  return redirect("/authenticate", {
    headers: { "Set-Cookie": await sessionStore.destroySession(session) },
  });
}

export async function loader({ request }: LoaderFunctionArgs) {
  let session = await sessionStore.getSession(request.headers.get("cookie"));
  return redirect("/authenticate", {
    headers: { "Set-Cookie": await sessionStore.destroySession(session) },
  });
}
