import { GoogleStrategy } from "remix-auth-google";
import { z } from "zod";
import { prisma } from "../prisma.server";

enum userRoles {
  ADMIN = 1,
  MODERATOR = 2,
  VIEWER = 3,
}

let googleStrategy = new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
  },
  async ({ accessToken, request, refreshToken, extraParams, profile }) => {
    let user = await prisma.user.findUnique({
      where: {
        email: profile.emails[0].value,
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: profile.emails[0].value,
          roleId: userRoles.VIEWER, // TODO: get the value from extraParams or form submission, maybe even invites from request.url
        },
      });
    }

    return user;
  }
);

export let Provider = z.union([z.literal("google"), z.literal("TOTP")]);

export let providers = { google: googleStrategy };
