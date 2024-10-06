import { authenticator } from "@/lib/auth/auth.server";
import { Provider } from "@/lib/auth/providers";
import { ActionFunctionArgs, redirect } from "@remix-run/node";

export async function loader() {
  redirect("/login");
}

export async function action({ request, params }: ActionFunctionArgs) {
  let inviteLink = new URL(request.url).searchParams.get("inviteLink");
  let providerName = Provider.parse(params.provider);
  return await authenticator.authenticate(providerName, request, {
    successRedirect:
      providerName === "TOTP"
        ? `/verify${inviteLink ? `?inviteLink=${inviteLink}` : ""}`
        : undefined,
    failureRedirect: "/login",
  });
}
