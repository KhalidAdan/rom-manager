-- AlterTable
ALTER TABLE "games" ADD COLUMN "completedAt" DATETIME;

-- CreateTable
CREATE TABLE "game_stats" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lastPlayedAt" DATETIME NOT NULL,
    "totalPlayTime" INTEGER NOT NULL DEFAULT 0,
    "userId" INTEGER NOT NULL,
    "gameId" INTEGER NOT NULL,
    "roleId" INTEGER,
    CONSTRAINT "game_stats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "game_stats_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "game_stats_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "game_stats_userId_gameId_key" ON "game_stats"("userId", "gameId");
