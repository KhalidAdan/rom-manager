// app/services/auth.server.ts
import {
  destroySession,
  getSession,
  sessionStore,
} from "@/lib/auth/session.server";
import { User } from "@prisma/client";
import { redirect } from "react-router";
import { Authenticator } from "remix-auth";
import { prisma } from "../prisma.server";
import { providers } from "./providers.server";

// Session configuration
export let SESSION_EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 14; // 14 days
export let getSessionExpirationDate = () =>
  new Date(Date.now() + SESSION_EXPIRATION_TIME);
export let sessionKeyPrefix = "sessionId" as const;

export let authenticator = new Authenticator<User>(sessionStore, {
  sessionKey: sessionKeyPrefix,
  throwOnError: true,
});

for (let provider of Object.values(providers)) {
  authenticator.use(provider);
}

export async function getUser(request: Request) {
  let authSession = await getSession(request.headers.get("Cookie"));
  let user = authSession.get("user");

  if (!user?.id) {
    let cookie = await destroySession(authSession);
    return { user: null, cookie };
  }

  let sessionId = authSession.get(sessionKeyPrefix);
  if (!sessionId) {
    let cookie = await destroySession(authSession);
    return { user: null, cookie };
  }

  let dbSession = await prisma.session.findUnique({
    select: {
      user: true,
    },
    where: { id: sessionId, expires: { gt: new Date() } },
  });

  if (!dbSession?.user) {
    let cookie = await destroySession(authSession);
    return { user: null, cookie };
  }

  return { user: dbSession.user, cookie: null };
}

export async function getUserId(request: Request) {
  let { user } = await getUser(request);
  if (user == null) {
    return null;
  }
  return user.id;
}

export async function requireUser(
  request: Request,
  { redirectTo }: { redirectTo?: string | null } = {}
) {
  let { user, cookie } = await getUser(request);

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
    let loginRedirect = ["/authenticate", loginParams?.toString()]
      .filter(Boolean)
      .join("?");

    throw redirect(loginRedirect, {
      headers: cookie ? { "Set-Cookie": cookie } : undefined,
    });
  }

  return user;
}
