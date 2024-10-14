import { invariant } from "@epic-web/invariant";
import argon2 from "argon2";
import { AuthorizationError } from "remix-auth";
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

  let user = await prisma.user.findUnique({
    where: {
      email: email,
    },
  });

  if (!user) {
    let hashedPassword = await argon2.hash(password);
    let settings = await prisma.settings.findFirst();
    user = await prisma.user.create({
      data: {
        email: email,
        password: hashedPassword,
        roleId: settings === null ? UserRoles.ADMIN : UserRoles.VIEWER,
      },
    });
  } else {
    let isValid = await argon2.verify(user.password, password);
    if (!isValid) {
      throw new AuthorizationError("Invalid credentials");
    }
  }

  return user;
});

export let Provider = z.literal("form");

export let providers = { form: formStrategy };
