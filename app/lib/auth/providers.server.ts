import { invariant } from "@epic-web/invariant";
import argon2 from "argon2";
import { FormStrategy } from "remix-auth-form";
import { z } from "zod";
import { prisma } from "../prisma.server";

export let UserRoles = {
  ADMIN: 1,
  MODERATOR: 2,
  VIEWER: 3,
};

let formStrategy = new FormStrategy(async ({ form, context }) => {
  let email = form.get("email");
  let password = form.get("password");

  // You can validate the inputs however you want
  invariant(typeof email === "string", "username must be a string");
  invariant(email.length > 0, "username must not be empty");

  invariant(typeof password === "string", "password must be a string");
  invariant(password.length > 0, "password must not be empty");

  let hashedPassword = await argon2.hash(password);

  let user = await prisma.user.findUnique({
    where: {
      email: email,
    },
  });

  let settings = await prisma.settings.findFirst();

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: email,
        password: hashedPassword,
        roleId: settings === null ? UserRoles.ADMIN : UserRoles.VIEWER, // TODO: get the value from context or form submission via intents, maybe even invites from request.url
      },
    });
  }

  return user;
});

export let Provider = z.literal("form");

export let providers = { form: formStrategy };
