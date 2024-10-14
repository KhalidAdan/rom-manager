import { authenticator } from "@/lib/auth/auth.server";
import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  redirect,
} from "@remix-run/node";

export async function action({ request }: ActionFunctionArgs) {
  authenticator.logout(request, { redirectTo: "/" });
  return redirect("/");
}

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticator.logout(request, { redirectTo: "/" });
  return redirect("/");
}
