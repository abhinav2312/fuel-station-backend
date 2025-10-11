-- CreateTable
CREATE TABLE "DailyReading" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tankId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "openingLitres" DECIMAL NOT NULL,
    "closingLitres" DECIMAL NOT NULL,
    "pricePerLitre" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DailyReading_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "Tank" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyReading_tankId_date_key" ON "DailyReading"("tankId", "date");
