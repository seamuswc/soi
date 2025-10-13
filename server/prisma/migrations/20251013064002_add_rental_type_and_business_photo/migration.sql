-- CreateTable
CREATE TABLE "Promo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "remaining_uses" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

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
    "payment_network" TEXT NOT NULL DEFAULT 'solana',
    "rental_type" TEXT NOT NULL DEFAULT 'living',
    "business_photo" TEXT,
    "thai_only" BOOLEAN NOT NULL DEFAULT false,
    "has_pool" BOOLEAN NOT NULL DEFAULT false,
    "has_parking" BOOLEAN NOT NULL DEFAULT false,
    "is_top_floor" BOOLEAN NOT NULL DEFAULT false,
    "six_months" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_Listing" ("building_name", "cost", "created_at", "description", "expires_at", "floor", "id", "latitude", "longitude", "payment_network", "reference", "sqm", "updated_at", "youtube_link") SELECT "building_name", "cost", "created_at", "description", "expires_at", "floor", "id", "latitude", "longitude", "payment_network", "reference", "sqm", "updated_at", "youtube_link" FROM "Listing";
DROP TABLE "Listing";
ALTER TABLE "new_Listing" RENAME TO "Listing";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Promo_code_key" ON "Promo"("code");
