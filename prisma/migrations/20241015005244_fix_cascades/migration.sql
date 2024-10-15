-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_game_genre" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "gameId" INTEGER NOT NULL,
    "genreId" INTEGER NOT NULL,
    CONSTRAINT "game_genre_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "game_genre_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "genres" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_game_genre" ("gameId", "genreId", "id") SELECT "gameId", "genreId", "id" FROM "game_genre";
DROP TABLE "game_genre";
ALTER TABLE "new_game_genre" RENAME TO "game_genre";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
