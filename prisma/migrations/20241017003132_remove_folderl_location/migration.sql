/*
  Warnings:

  - You are about to drop the column `romFolderLocation` on the `settings` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "onboardingComplete" DATETIME,
    "showCategoryRecs" BOOLEAN NOT NULL DEFAULT true,
    "showDiscovery" BOOLEAN NOT NULL DEFAULT true,
    "spotlightIncompleteGame" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_settings" ("id", "onboardingComplete", "showCategoryRecs", "showDiscovery", "spotlightIncompleteGame") SELECT "id", "onboardingComplete", "showCategoryRecs", "showDiscovery", "spotlightIncompleteGame" FROM "settings";
DROP TABLE "settings";
ALTER TABLE "new_settings" RENAME TO "settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
