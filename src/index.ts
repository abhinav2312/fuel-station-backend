import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.get('/health', (_req, res) => {
    res.json({ ok: true });
});

import { createTanksRouter } from './routes/tanks';
import { createPumpsRouter } from './routes/pumps';
import { createClientsRouter } from './routes/clients';
import { createSalesRouter } from './routes/sales';
import { createPricesRouter } from './routes/prices';
import { createPurchasesRouter } from './routes/purchases';
import { createReportsRouter } from './routes/reports';
import { createReadingsRouter } from './routes/readings';
import { createReceiptsRouter } from './routes/receipts';
import { createCreditsRouter } from './routes/credits';
import { createPurchasePricesRouter } from './routes/purchase-prices';
import { createCashReceiptsRouter } from './routes/cash-receipts';
import { createOnlinePaymentsRouter } from './routes/online-payments';
import { createValidationRouter } from './routes/validation';
import { createSeedRouter } from './routes/seed';
import logsRouter from './routes/logs';

app.use('/api/tanks', createTanksRouter(prisma));
app.use('/api/pumps', createPumpsRouter(prisma));
app.use('/api/clients', createClientsRouter(prisma));
app.use('/api/sales', createSalesRouter(prisma));
app.use('/api/prices', createPricesRouter(prisma));
app.use('/api/purchases', createPurchasesRouter(prisma));
app.use('/api/reports', createReportsRouter(prisma));
app.use('/api/readings', createReadingsRouter(prisma));
app.use('/api/receipts', createReceiptsRouter(prisma));
app.use('/api/credits', createCreditsRouter(prisma));
app.use('/api/purchase-prices', createPurchasePricesRouter(prisma));
app.use('/api/cash-receipts', createCashReceiptsRouter(prisma));
app.use('/api/online-payments', createOnlinePaymentsRouter(prisma));
app.use('/api/validation', createValidationRouter(prisma));
app.use('/api/seed', createSeedRouter(prisma));
app.use('/api/logs', logsRouter);

// Seed data before starting server
async function startServer() {
    try {
        console.log('🌱 Checking and seeding database...');

        // Check if data already exists
        const existingFuelTypes = await prisma.fuelType.count();
        if (existingFuelTypes > 0) {
            console.log('✅ Database already has data, skipping seed');
        } else {
            console.log('📝 Creating fuel types...');

            // Create fuel types
            const petrol = await prisma.fuelType.create({
                data: { name: 'Petrol' }
            });

            const premiumPetrol = await prisma.fuelType.create({
                data: { name: 'Premium Petrol' }
            });

            const diesel = await prisma.fuelType.create({
                data: { name: 'Diesel' }
            });

            console.log('✅ Fuel types created');

            // Create tanks
            console.log('🛢️  Creating tanks...');
            const tanks = [
                { name: 'Petrol Tank 1', capacityLit: 10000, currentLevel: 0, fuelTypeId: petrol.id },
                { name: 'Petrol Tank 2', capacityLit: 10000, currentLevel: 0, fuelTypeId: petrol.id },
                { name: 'Premium Petrol Tank', capacityLit: 8000, currentLevel: 0, fuelTypeId: premiumPetrol.id },
                { name: 'Diesel Tank 1', capacityLit: 12000, currentLevel: 0, fuelTypeId: diesel.id },
                { name: 'Diesel Tank 2', capacityLit: 12000, currentLevel: 0, fuelTypeId: diesel.id }
            ];

            for (const tankData of tanks) {
                await prisma.tank.create({ data: tankData });
            }

            console.log('✅ Tanks created');

            // Create pumps
            console.log('⛽ Creating pumps...');
            const pumps = [
                { name: 'Petrol Pump 1', fuelTypeId: petrol.id },
                { name: 'Petrol Pump 2', fuelTypeId: petrol.id },
                { name: 'Petrol Pump 3', fuelTypeId: petrol.id },
                { name: 'Premium Petrol Pump 1', fuelTypeId: premiumPetrol.id },
                { name: 'Premium Petrol Pump 2', fuelTypeId: premiumPetrol.id },
                { name: 'Diesel Pump 1', fuelTypeId: diesel.id },
                { name: 'Diesel Pump 2', fuelTypeId: diesel.id },
                { name: 'Diesel Pump 3', fuelTypeId: diesel.id },
                { name: 'Diesel Pump 4', fuelTypeId: diesel.id }
            ];

            for (const pumpData of pumps) {
                await prisma.pump.create({ data: pumpData });
            }

            console.log('✅ Pumps created');

            // Set initial prices
            console.log('💰 Setting initial prices...');
            const prices = [
                { fuelTypeId: petrol.id, perLitre: 0, date: new Date() },
                { fuelTypeId: premiumPetrol.id, perLitre: 0, date: new Date() },
                { fuelTypeId: diesel.id, perLitre: 0, date: new Date() }
            ];

            for (const priceData of prices) {
                await prisma.price.create({ data: priceData });
            }

            console.log('✅ Initial prices set');

            // Create sample clients
            console.log('👥 Creating sample clients...');
            const clients = [
                {
                    name: 'ABC Transport',
                    ownerName: 'John Doe',
                    phone: '9876543210',
                    email: 'john@abctransport.com',
                    address: '123 Main St, City',
                    creditLimit: 50000,
                    balance: 0
                },
                {
                    name: 'XYZ Logistics',
                    ownerName: 'Jane Smith',
                    phone: '9876543211',
                    email: 'jane@xyzlogistics.com',
                    address: '456 Oak Ave, City',
                    creditLimit: 75000,
                    balance: 0
                }
            ];

            for (const clientData of clients) {
                await prisma.client.create({ data: clientData });
            }

            console.log('✅ Sample clients created');
            console.log('🎉 Database seeded successfully!');
        }

        // Start the server after seeding
        app.listen(PORT, () => {
            console.log(`Backend listening on http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error('❌ Failed to seed database:', error);
        // Start server anyway to avoid complete failure
        app.listen(PORT, () => {
            console.log(`Backend listening on http://localhost:${PORT} (with seeding errors)`);
        });
    }
}

// Start the server with seeding
startServer();

