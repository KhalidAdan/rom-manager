import { remember } from "@epic-web/remember";
import { PrismaClient } from "@prisma/client";

export let prisma = remember("prisma", () => {
  return new PrismaClient({
    log: [
      { level: "query", emit: "event" },
      { level: "error", emit: "stdout" },
      { level: "warn", emit: "stdout" },
    ],
  });
});
