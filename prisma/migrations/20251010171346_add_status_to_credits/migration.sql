/*
  Warnings:

  - Added the required column `updatedAt` to the `ClientCredit` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ClientCredit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clientId" INTEGER NOT NULL,
    "fuelTypeId" INTEGER NOT NULL,
    "litres" DECIMAL NOT NULL,
    "pricePerLitre" DECIMAL NOT NULL,
    "totalAmount" DECIMAL NOT NULL,
    "date" DATETIME NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'unpaid',
    "paidDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClientCredit_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ClientCredit_fuelTypeId_fkey" FOREIGN KEY ("fuelTypeId") REFERENCES "FuelType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ClientCredit" ("clientId", "createdAt", "date", "fuelTypeId", "id", "litres", "note", "pricePerLitre", "totalAmount") SELECT "clientId", "createdAt", "date", "fuelTypeId", "id", "litres", "note", "pricePerLitre", "totalAmount" FROM "ClientCredit";
DROP TABLE "ClientCredit";
ALTER TABLE "new_ClientCredit" RENAME TO "ClientCredit";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
