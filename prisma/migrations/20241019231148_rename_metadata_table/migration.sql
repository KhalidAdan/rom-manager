/*
  Warnings:

  - You are about to drop the `MetadataJob` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "MetadataJob";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "metadata_job" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "file" BLOB NOT NULL,
    "systemTitle" TEXT NOT NULL,
    "systemExtension" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "metadata_job_status_idx" ON "metadata_job"("status");
