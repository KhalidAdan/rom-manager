// app/services/auth.server.ts
import { getSession, sessionStorage } from "@/lib/auth/session.server";
import { User } from "@prisma/client";
import { redirect } from "@remix-run/node";
import { Authenticator } from "remix-auth";
import { prisma } from "../prisma.server";
import { providers } from "./providers";

// Session configuration
export let SESSION_EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 14; // 14 days
export let getSessionExpirationDate = () =>
  new Date(Date.now() + SESSION_EXPIRATION_TIME);
export let sessionKeyPrefix = "sessionId" as const;

export let authenticator = new Authenticator<User>(sessionStorage, {
  sessionKey: sessionKeyPrefix,
  throwOnError: true,
});

for (let provider of Object.values(providers)) {
  authenticator.use(provider);
}

export async function getUser(request: Request) {
  let authSession = await getSession(request.headers.get("Cookie"));
  let user = authSession.get("user");

  if (!user?.id) return null;

  let sessionId = authSession.get(sessionKeyPrefix);
  if (!sessionId) return null;

  let dbSession = await prisma.session.findUnique({
    select: {
      user: true,
    },
    where: { id: sessionId, expires: { gt: new Date() } },
  });

  if (!dbSession?.user) return null;

  return dbSession.user;
}

export async function getUserId(request: Request) {
  let user = await getUser(request);
  if (user == null) return null;
  return user.id;
}

export async function requireUser(
  request: Request,
  { redirectTo }: { redirectTo?: string | null } = {}
) {
  let user = await getUser(request);

  if (!user) {
    let requestUrl = new URL(request.url);
    if (redirectTo === null) {
      redirectTo = null;
    } else {
      if (redirectTo === undefined) {
        redirectTo = `${requestUrl.pathname}${requestUrl.search}`;
      }
    }
    let loginParams = redirectTo ? new URLSearchParams({ redirectTo }) : null;
    let loginRedirect = ["/login", loginParams?.toString()]
      .filter(Boolean)
      .join("?");

    throw redirect(loginRedirect);
  }

  return user;
}
