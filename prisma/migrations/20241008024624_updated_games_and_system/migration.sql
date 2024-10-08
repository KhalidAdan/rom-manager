/*
  Warnings:

  - You are about to drop the column `Image` on the `systems` table. All the data in the column will be lost.
  - Added the required column `extension` to the `systems` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "games" ADD COLUMN "backgroundImage" BLOB;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_systems" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "image" TEXT
);
INSERT INTO "new_systems" ("id", "title") SELECT "id", "title" FROM "systems";
DROP TABLE "systems";
ALTER TABLE "new_systems" RENAME TO "systems";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
