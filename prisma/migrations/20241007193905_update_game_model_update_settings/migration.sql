/*
  Warnings:

  - You are about to drop the column `onboardedAt` on the `users` table. All the data in the column will be lost.
  - Added the required column `summary` to the `games` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "settings" ADD COLUMN "onboardingComplete" DATETIME;

-- CreateTable
CREATE TABLE "genres" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "gameId" INTEGER NOT NULL,
    CONSTRAINT "genres_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_games" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "releaseDate" DATETIME NOT NULL,
    "coverArt" TEXT,
    "file" BLOB,
    "summary" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "system_id" INTEGER NOT NULL,
    CONSTRAINT "games_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "systems" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_games" ("coverArt", "created_at", "file", "id", "releaseDate", "system_id", "title", "updated_at") SELECT "coverArt", "created_at", "file", "id", "releaseDate", "system_id", "title", "updated_at" FROM "games";
DROP TABLE "games";
ALTER TABLE "new_games" RENAME TO "games";
CREATE TABLE "new_users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "roleId" INTEGER NOT NULL,
    CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_users" ("created_at", "email", "id", "password", "roleId", "updated_at") SELECT "created_at", "email", "id", "password", "roleId", "updated_at" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
