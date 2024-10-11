/*
  Warnings:

  - You are about to drop the `games_fts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "games_fts";
PRAGMA foreign_keys=on;
