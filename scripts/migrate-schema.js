const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function migrateToNewSchema() {
    console.log('🔄 Starting schema migration...');

    try {
        // Step 1: Backup existing data
        console.log('📦 Step 1: Backing up existing data...');
        const { backupData } = require('./backup-data');
        const backupPath = await backupData();

        // Step 2: Read backup data
        console.log('📖 Step 2: Reading backup data...');
        const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

        // Step 3: Clear existing data (will be recreated with new schema)
        console.log('🗑️ Step 3: Clearing existing data...');
        await prisma.auditLog.deleteMany();
        await prisma.dailyReceipt.deleteMany();
        await prisma.purchasePrice.deleteMany();
        await prisma.ledgerEntry.deleteMany();
        await prisma.purchase.deleteMany();
        await prisma.clientCredit.deleteMany();
        await prisma.onlinePayment.deleteMany();
        await prisma.cashReceipt.deleteMany();
        await prisma.dailyReading.deleteMany();
        await prisma.sale.deleteMany();
        await prisma.client.deleteMany();
        await prisma.price.deleteMany();
        await prisma.pump.deleteMany();
        await prisma.tank.deleteMany();
        await prisma.fuelType.deleteMany();

        // Step 4: Migrate data to new schema
        console.log('🔄 Step 4: Migrating data to new schema...');

        // Migrate FuelTypes
        console.log('   - Migrating fuel types...');
        for (const fuelType of backup.fuelTypes) {
            await prisma.fuelType.create({
                data: {
                    id: fuelType.id,
                    name: fuelType.name,
                    description: null,
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });
        }

        // Migrate Tanks
        console.log('   - Migrating tanks...');
        for (const tank of backup.tanks) {
            await prisma.tank.create({
                data: {
                    id: tank.id,
                    name: tank.name,
                    capacityLit: tank.capacityLit,
                    currentLevel: tank.currentLevel,
                    avgUnitCost: tank.avgUnitCost,
                    isActive: true,
                    fuelTypeId: tank.fuelTypeId,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });
        }

        // Migrate Pumps
        console.log('   - Migrating pumps...');
        for (const pump of backup.pumps) {
            await prisma.pump.create({
                data: {
                    id: pump.id,
                    name: pump.name,
                    isActive: pump.isActive,
                    fuelTypeId: pump.fuelTypeId,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });
        }

        // Migrate Prices
        console.log('   - Migrating prices...');
        for (const price of backup.prices) {
            await prisma.price.create({
                data: {
                    id: price.id,
                    perLitre: price.perLitre,
                    isActive: price.active,
                    fuelTypeId: price.fuelTypeId,
                    createdAt: price.createdAt,
                    updatedAt: new Date()
                }
            });
        }

        // Migrate Clients
        console.log('   - Migrating clients...');
        for (const client of backup.clients) {
            await prisma.client.create({
                data: {
                    id: client.id,
                    name: client.name,
                    ownerName: client.ownerName,
                    phone: client.phone,
                    email: client.email,
                    address: client.address,
                    creditLimit: client.creditLimit,
                    balance: client.balance,
                    isActive: client.active,
                    createdAt: client.createdAt,
                    updatedAt: client.updatedAt
                }
            });
        }

        // Migrate Sales (with fuelTypeId)
        console.log('   - Migrating sales...');
        for (const sale of backup.sales) {
            // Get fuelTypeId from pump
            const pump = backup.pumps.find(p => p.id === sale.pumpId);
            if (pump) {
                await prisma.sale.create({
                    data: {
                        id: sale.id,
                        litres: sale.litres,
                        pricePerLitre: sale.pricePerLitre,
                        totalAmount: sale.totalAmount,
                        costPerLitre: sale.costPerLitre,
                        profit: sale.profit,
                        paymentMethod: sale.method,
                        note: sale.note,
                        pumpId: sale.pumpId,
                        fuelTypeId: pump.fuelTypeId,
                        clientId: sale.clientId,
                        createdAt: sale.createdAt,
                        updatedAt: new Date()
                    }
                });
            }
        }

        // Migrate Daily Readings
        console.log('   - Migrating daily readings...');
        for (const reading of backup.dailyReadings) {
            await prisma.dailyReading.create({
                data: {
                    id: reading.id,
                    openingLitres: reading.openingLitres,
                    closingLitres: reading.closingLitres,
                    pricePerLitre: reading.pricePerLitre,
                    revenue: reading.revenue,
                    pumpId: reading.pumpId,
                    date: reading.date,
                    createdAt: reading.createdAt,
                    updatedAt: reading.updatedAt
                }
            });
        }

        // Migrate Cash Receipts
        console.log('   - Migrating cash receipts...');
        for (const receipt of backup.cashReceipts) {
            await prisma.cashReceipt.create({
                data: {
                    id: receipt.id,
                    amount: receipt.amount,
                    collectedBy: null,
                    note: null,
                    pumpId: receipt.pumpId,
                    date: receipt.date,
                    createdAt: receipt.createdAt,
                    updatedAt: receipt.updatedAt
                }
            });
        }

        // Migrate Online Payments
        console.log('   - Migrating online payments...');
        for (const payment of backup.onlinePayments) {
            await prisma.onlinePayment.create({
                data: {
                    id: payment.id,
                    amount: payment.amount,
                    method: payment.method,
                    reference: payment.reference,
                    description: payment.description,
                    date: payment.date,
                    createdAt: payment.createdAt,
                    updatedAt: payment.updatedAt
                }
            });
        }

        // Migrate Client Credits
        console.log('   - Migrating client credits...');
        for (const credit of backup.clientCredits) {
            await prisma.clientCredit.create({
                data: {
                    id: credit.id,
                    litres: credit.litres,
                    pricePerLitre: credit.pricePerLitre,
                    totalAmount: credit.totalAmount,
                    status: credit.status,
                    paymentMethod: credit.paymentMethod,
                    note: credit.note,
                    clientId: credit.clientId,
                    fuelTypeId: credit.fuelTypeId,
                    date: credit.date,
                    paidDate: credit.paidDate,
                    createdAt: credit.createdAt,
                    updatedAt: credit.updatedAt
                }
            });
        }

        // Migrate Purchases
        console.log('   - Migrating purchases...');
        for (const purchase of backup.purchases) {
            await prisma.purchase.create({
                data: {
                    id: purchase.id,
                    litres: purchase.litres,
                    unitCost: purchase.unitCost,
                    totalCost: purchase.totalCost,
                    supplier: null,
                    invoiceNo: null,
                    note: null,
                    tankId: purchase.tankId,
                    date: purchase.date,
                    createdAt: purchase.createdAt,
                    updatedAt: new Date()
                }
            });
        }

        // Migrate Audit Logs
        console.log('   - Migrating audit logs...');
        for (const log of backup.auditLogs) {
            await prisma.auditLog.create({
                data: {
                    id: log.id,
                    action: log.action,
                    entityType: log.entityType,
                    entityId: log.entityId,
                    oldValues: log.oldValues,
                    newValues: log.newValues,
                    reason: log.reason,
                    userId: log.userId,
                    sessionId: log.sessionId,
                    timestamp: log.timestamp
                }
            });
        }

        // Step 5: Create Client Payments from Ledger Entries
        console.log('   - Creating client payments from ledger entries...');
        for (const entry of backup.ledgerEntries) {
            if (entry.amount < 0) { // Negative amount means payment received
                await prisma.clientPayment.create({
                    data: {
                        amount: Math.abs(entry.amount),
                        paymentMethod: 'CASH', // Default, can be updated later
                        reference: null,
                        note: entry.memo,
                        clientId: entry.clientId,
                        date: entry.createdAt,
                        createdAt: entry.createdAt,
                        updatedAt: new Date()
                    }
                });
            }
        }

        console.log('✅ Migration completed successfully!');
        console.log(`📁 Backup saved at: ${backupPath}`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    migrateToNewSchema().catch(console.error);
}

module.exports = { migrateToNewSchema };
