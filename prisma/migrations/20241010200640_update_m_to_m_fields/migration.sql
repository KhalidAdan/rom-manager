/*
  Warnings:

  - You are about to drop the `GameGenres` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "GameGenres";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "game_genre" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "gameId" INTEGER NOT NULL,
    "genreId" INTEGER NOT NULL,
    CONSTRAINT "game_genre_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "game_genre_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "genres" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
