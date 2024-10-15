-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_game_stats" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lastPlayedAt" DATETIME NOT NULL,
    "totalPlayTime" INTEGER NOT NULL DEFAULT 0,
    "userId" INTEGER NOT NULL,
    "gameId" INTEGER NOT NULL,
    "roleId" INTEGER,
    CONSTRAINT "game_stats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "game_stats_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "game_stats_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_game_stats" ("gameId", "id", "lastPlayedAt", "roleId", "totalPlayTime", "userId") SELECT "gameId", "id", "lastPlayedAt", "roleId", "totalPlayTime", "userId" FROM "game_stats";
DROP TABLE "game_stats";
ALTER TABLE "new_game_stats" RENAME TO "game_stats";
CREATE UNIQUE INDEX "game_stats_userId_gameId_key" ON "game_stats"("userId", "gameId");
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
    "user_id" INTEGER,
    CONSTRAINT "games_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "systems" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "games_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_games" ("backgroundImage", "completedAt", "coverArt", "created_at", "file", "fileName", "id", "rating", "releaseDate", "summary", "system_id", "title", "updated_at", "user_id") SELECT "backgroundImage", "completedAt", "coverArt", "created_at", "file", "fileName", "id", "rating", "releaseDate", "summary", "system_id", "title", "updated_at", "user_id" FROM "games";
DROP TABLE "games";
ALTER TABLE "new_games" RENAME TO "games";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
