-- CreateTable
CREATE TABLE "MetadataJob" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileBuffer" BLOB NOT NULL,
    "systemTitle" TEXT NOT NULL,
    "systemExtension" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "MetadataJob_status_idx" ON "MetadataJob"("status");
