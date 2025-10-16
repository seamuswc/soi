/*
  Warnings:

  - You are about to drop the column `max_listings` on the `Promo` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "payment_reference" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Promo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "remaining_uses" INTEGER NOT NULL DEFAULT 0,
    "email" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_Promo" ("code", "created_at", "email", "id", "remaining_uses", "updated_at") SELECT "code", "created_at", "email", "id", "remaining_uses", "updated_at" FROM "Promo";
DROP TABLE "Promo";
ALTER TABLE "new_Promo" RENAME TO "Promo";
CREATE UNIQUE INDEX "Promo_code_key" ON "Promo"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_payment_reference_key" ON "User"("payment_reference");
