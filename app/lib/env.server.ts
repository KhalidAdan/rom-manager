import { ZodError, z } from "zod";

let envVariables = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  DATABASE_URL: z.string(),
  SESSION_SECRET: z.string(),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_CALLBACK_URL: z.string(),
  TWITCH_CLIENT_ID: z.string(),
  TWITCH_SECRET: z.string(),
  GIANTBOMB_API_KEY: z.string(),
});

try {
  envVariables.parse(process.env);
} catch (e) {
  if (e instanceof ZodError) {
    console.error("Missing or invalid environment variables:", e.errors);
  } else {
    console.error("An unknown error occurred while parsing env variables:", e);
  }
  throw e;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof envVariables> {}
  }
}
