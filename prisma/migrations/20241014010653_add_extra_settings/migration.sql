-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "romFolderLocation" TEXT NOT NULL,
    "onboardingComplete" DATETIME,
    "showCategoryRecs" BOOLEAN NOT NULL DEFAULT true,
    "showDiscovery" BOOLEAN NOT NULL DEFAULT true,
    "spotlightIncompleteGame" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_settings" ("id", "onboardingComplete", "romFolderLocation") SELECT "id", "onboardingComplete", "romFolderLocation" FROM "settings";
DROP TABLE "settings";
ALTER TABLE "new_settings" RENAME TO "settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
