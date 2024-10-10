/*
  Warnings:

  - You are about to alter the column `releaseDate` on the `games` table. The data in that column could be lost. The data in that column will be cast from `DateTime` to `Int`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_games" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "releaseDate" INTEGER NOT NULL,
    "coverArt" TEXT,
    "backgroundImage" TEXT,
    "file" BLOB,
    "summary" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "system_id" INTEGER NOT NULL,
    CONSTRAINT "games_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "systems" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_games" ("backgroundImage", "coverArt", "created_at", "file", "id", "releaseDate", "summary", "system_id", "title", "updated_at") SELECT "backgroundImage", "coverArt", "created_at", "file", "id", "releaseDate", "summary", "system_id", "title", "updated_at" FROM "games";
DROP TABLE "games";
ALTER TABLE "new_games" RENAME TO "games";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
