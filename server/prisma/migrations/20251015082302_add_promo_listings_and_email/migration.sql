-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "promo_code_used" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Promo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "remaining_uses" INTEGER NOT NULL DEFAULT 0,
    "max_listings" INTEGER NOT NULL DEFAULT 1,
    "email" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_Promo" ("code", "created_at", "id", "remaining_uses", "updated_at") SELECT "code", "created_at", "id", "remaining_uses", "updated_at" FROM "Promo";
DROP TABLE "Promo";
ALTER TABLE "new_Promo" RENAME TO "Promo";
CREATE UNIQUE INDEX "Promo_code_key" ON "Promo"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
