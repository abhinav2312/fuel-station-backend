const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function backupData() {
    console.log('🔄 Starting data backup...');

    try {
        // Backup all existing data
        const backup = {
            timestamp: new Date().toISOString(),
            fuelTypes: await prisma.fuelType.findMany(),
            tanks: await prisma.tank.findMany(),
            pumps: await prisma.pump.findMany(),
            prices: await prisma.price.findMany(),
            clients: await prisma.client.findMany(),
            sales: await prisma.sale.findMany(),
            dailyReadings: await prisma.dailyReading.findMany(),
            cashReceipts: await prisma.cashReceipt.findMany(),
            onlinePayments: await prisma.onlinePayment.findMany(),
            clientCredits: await prisma.clientCredit.findMany(),
            purchases: await prisma.purchase.findMany(),
            ledgerEntries: await prisma.ledgerEntry.findMany(),
            purchasePrices: await prisma.purchasePrice.findMany(),
            dailyReceipts: await prisma.dailyReceipt.findMany(),
            auditLogs: await prisma.auditLog.findMany()
        };

        // Save backup to file
        const backupPath = path.join(__dirname, `../backups/backup-${Date.now()}.json`);
        fs.mkdirSync(path.dirname(backupPath), { recursive: true });
        fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));

        console.log(`✅ Data backed up to: ${backupPath}`);
        console.log(`📊 Backup contains:`);
        console.log(`   - ${backup.fuelTypes.length} fuel types`);
        console.log(`   - ${backup.tanks.length} tanks`);
        console.log(`   - ${backup.pumps.length} pumps`);
        console.log(`   - ${backup.prices.length} prices`);
        console.log(`   - ${backup.clients.length} clients`);
        console.log(`   - ${backup.sales.length} sales`);
        console.log(`   - ${backup.dailyReadings.length} daily readings`);
        console.log(`   - ${backup.cashReceipts.length} cash receipts`);
        console.log(`   - ${backup.onlinePayments.length} online payments`);
        console.log(`   - ${backup.clientCredits.length} client credits`);
        console.log(`   - ${backup.purchases.length} purchases`);
        console.log(`   - ${backup.ledgerEntries.length} ledger entries`);

        return backupPath;
    } catch (error) {
        console.error('❌ Backup failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    backupData().catch(console.error);
}

module.exports = { backupData };
