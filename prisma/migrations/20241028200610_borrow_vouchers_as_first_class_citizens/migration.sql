/*
  Warnings:

  - You are about to drop the column `user_id` on the `games` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "borrow_vouchers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "returnedAt" DATETIME,
    "downloadedAt" DATETIME,
    "lastSyncAt" DATETIME,
    "gameId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    CONSTRAINT "borrow_vouchers_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "borrow_vouchers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_games" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "releaseDate" INTEGER,
    "coverArt" BLOB,
    "backgroundImage" BLOB,
    "fileName" TEXT NOT NULL,
    "file" BLOB,
    "summary" TEXT,
    "completedAt" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "rating" INTEGER,
    "system_id" INTEGER NOT NULL,
    CONSTRAINT "games_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "systems" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_games" ("backgroundImage", "completedAt", "coverArt", "created_at", "file", "fileName", "id", "rating", "releaseDate", "summary", "system_id", "title", "updated_at") SELECT "backgroundImage", "completedAt", "coverArt", "created_at", "file", "fileName", "id", "rating", "releaseDate", "summary", "system_id", "title", "updated_at" FROM "games";
DROP TABLE "games";
ALTER TABLE "new_games" RENAME TO "games";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "borrow_vouchers_gameId_key" ON "borrow_vouchers"("gameId");
