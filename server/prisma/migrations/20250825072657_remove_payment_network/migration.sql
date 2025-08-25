/*
  Warnings:

  - You are about to drop the column `payment_network` on the `Listing` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Listing" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "building_name" TEXT NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "floor" TEXT NOT NULL,
    "sqm" INTEGER NOT NULL,
    "cost" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "youtube_link" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_Listing" ("building_name", "cost", "created_at", "description", "expires_at", "floor", "id", "latitude", "longitude", "reference", "sqm", "updated_at", "youtube_link") SELECT "building_name", "cost", "created_at", "description", "expires_at", "floor", "id", "latitude", "longitude", "reference", "sqm", "updated_at", "youtube_link" FROM "Listing";
DROP TABLE "Listing";
ALTER TABLE "new_Listing" RENAME TO "Listing";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
