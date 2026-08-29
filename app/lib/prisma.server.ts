import { remember } from "@epic-web/remember";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { existsSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@/generated/prisma/client";

export let prisma = remember("prisma", () => {
  let url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";

  // Prisma 7 resolves relative file: URLs against the process cwd, not the
  // prisma/ directory like Prisma 5 did. Surface the resolved path so a stale
  // DATABASE_URL can't silently open (and create) an empty database.
  let filePath = url.replace(/^file:/, "");
  if (!path.isAbsolute(filePath)) {
    filePath = path.resolve(process.cwd(), filePath);
  }
  console.log(`[prisma] database: ${filePath}`);
  if (!existsSync(filePath)) {
    console.warn(
      `[prisma] WARNING: ${filePath} does not exist and will be created empty. ` +
        `If you expected an existing library, check DATABASE_URL - relative ` +
        `paths now resolve from the project root (Prisma 5 resolved them ` +
        `from the prisma/ directory, e.g. file:./dev.db is now file:./prisma/dev.db).`
    );
  }

  let adapter = new PrismaBetterSqlite3({ url });

  return new PrismaClient({
    adapter,
    log: [
      { level: "query", emit: "event" },
      { level: "error", emit: "stdout" },
      { level: "warn", emit: "stdout" },
    ],
  });
});
