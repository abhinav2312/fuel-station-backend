-- CreateTable
CREATE TABLE "DailyReceipt" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "cashTotal" DECIMAL NOT NULL DEFAULT 0,
    "onlineTotal" DECIMAL NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyReceipt_date_key" ON "DailyReceipt"("date");
