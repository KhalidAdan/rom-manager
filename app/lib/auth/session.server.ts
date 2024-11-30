// app/services/session.server.ts
import { User } from "@prisma/client";
import { createCookieSessionStorage } from "react-router";
import { prisma } from "../prisma.server";
import { getSessionExpirationDate } from "./auth.server";

export let sessionStore = createCookieSessionStorage({
  cookie: {
    name: "_session",
    sameSite: "lax",
    path: "/",
    httpOnly: true,
    secrets: [process.env.SESSION_SECRET],
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 14,
  },
});

export async function makeSession(userId: User["id"]) {
  return await prisma.session.create({
    data: {
      expires: getSessionExpirationDate(),
      userId,
    },
  });
}

export let { getSession, commitSession, destroySession } = sessionStore;
