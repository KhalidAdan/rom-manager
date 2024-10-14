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
    CONSTRAINT "game_stats_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "game_stats_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_game_stats" ("gameId", "id", "lastPlayedAt", "roleId", "totalPlayTime", "userId") SELECT "gameId", "id", "lastPlayedAt", "roleId", "totalPlayTime", "userId" FROM "game_stats";
DROP TABLE "game_stats";
ALTER TABLE "new_game_stats" RENAME TO "game_stats";
CREATE UNIQUE INDEX "game_stats_userId_gameId_key" ON "game_stats"("userId", "gameId");
CREATE TABLE "new_sessions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "expires" DATETIME NOT NULL,
    "user_id" INTEGER NOT NULL,
    CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_sessions" ("expires", "id", "user_id") SELECT "expires", "id", "user_id" FROM "sessions";
DROP TABLE "sessions";
ALTER TABLE "new_sessions" RENAME TO "sessions";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
