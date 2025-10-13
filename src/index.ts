import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

// DATABASE_URL is automatically provided by Render when you connect a PostgreSQL database
// No need to set a fallback - Render will provide the correct connection string

const prisma = new PrismaClient();
const app = express();

// Configure CORS for production
app.use(cors({
    origin: 'https://fuelstationpro.netlify.app',
    credentials: true
}));

app.use(express.json());

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.get('/health', (_req, res) => {
    res.json({ ok: true });
});

// Production status endpoint
app.get('/api/status', async (_req, res) => {
    try {
        await prisma.$connect();
        res.json({ status: 'ok', database: 'connected' });
    } catch (error) {
        res.status(500).json({ status: 'error', database: 'disconnected' });
    }
});

// Simple test endpoint for tanks
app.get('/api/tanks', async (_req, res) => {
    try {
        console.log('🔍 Testing tanks endpoint...');

        // Return mock data for now to get frontend working
        const mockTanks = [
            {
                id: 1,
                name: "Petrol Tank 1",
                capacityLit: 10000,
                currentLevel: 5000,
                fuelType: {
                    name: "Petrol",
                    id: 1
                }
            },
            {
                id: 2,
                name: "Petrol Tank 2",
                capacityLit: 10000,
                currentLevel: 7500,
                fuelType: {
                    name: "Petrol",
                    id: 1
                }
            },
            {
                id: 3,
                name: "Diesel Tank 1",
                capacityLit: 12000,
                currentLevel: 8000,
                fuelType: {
                    name: "Diesel",
                    id: 2
                }
            }
        ];

        console.log('✅ Returning mock tank data');
        res.json(mockTanks);

    } catch (error: any) {
        console.error('❌ Tanks endpoint failed:', error);
        res.status(500).json({
            error: error.message,
            code: error.code
        });
    }
});

// PUT endpoint for updating tanks
app.put('/api/tanks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        console.log('🔧 Updating tank:', id, updateData);

        const updatedTank = await prisma.tank.update({
            where: { id: parseInt(id) },
            data: updateData,
            include: {
                fuelType: {
                    select: {
                        name: true,
                        id: true
                    }
                }
            }
        });

        console.log('✅ Tank updated successfully');
        res.json(updatedTank);
    } catch (error: any) {
        console.error('❌ Tank update failed:', error);
        res.status(500).json({
            error: error.message,
            code: error.code
        });
    }
});

// Add basic endpoints for other data with mock data
app.get('/api/pumps', async (_req, res) => {
    try {
        const mockPumps = [
            { id: 1, name: "Petrol Pump 1", fuelType: { name: "Petrol" } },
            { id: 2, name: "Petrol Pump 2", fuelType: { name: "Petrol" } },
            { id: 3, name: "Diesel Pump 1", fuelType: { name: "Diesel" } },
            { id: 4, name: "Diesel Pump 2", fuelType: { name: "Diesel" } }
        ];
        res.json(mockPumps);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/clients', async (_req, res) => {
    try {
        const mockClients = [
            { id: 1, name: "ABC Transport", ownerName: "John Doe", phone: "9876543210", address: "123 Main St", creditLimit: 50000, balance: 0 },
            { id: 2, name: "XYZ Logistics", ownerName: "Jane Smith", phone: "9876543211", address: "456 Oak Ave", creditLimit: 75000, balance: 0 }
        ];
        res.json(mockClients);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/credits', async (_req, res) => {
    try {
        const mockCredits = [
            { id: 1, clientId: 1, amount: 1000, description: "Credit transaction", date: new Date().toISOString() }
        ];
        res.json(mockCredits);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/cash-receipts', async (_req, res) => {
    try {
        const mockReceipts = [
            { id: 1, amount: 500, date: new Date().toISOString(), description: "Cash sale" }
        ];
        res.json(mockReceipts);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/online-payments', async (_req, res) => {
    try {
        const mockPayments = [
            { id: 1, amount: 300, date: new Date().toISOString(), method: "UPI" }
        ];
        res.json(mockPayments);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/reports/summary', async (_req, res) => {
    try {
        const summary = {
            tanks: 3,
            pumps: 4,
            clients: 2,
            sales: 0
        };
        res.json(summary);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Temporarily comment out complex routes to debug
// import { createTanksRouter } from './routes/tanks';
// import { createPumpsRouter } from './routes/pumps';
// import { createClientsRouter } from './routes/clients';
// import { createSalesRouter } from './routes/sales';
// import { createPricesRouter } from './routes/prices';
// import { createPurchasesRouter } from './routes/purchases';
// import { createReportsRouter } from './routes/reports';
// import { createReadingsRouter } from './routes/readings';
// import { createReceiptsRouter } from './routes/receipts';
// import { createCreditsRouter } from './routes/credits';
// import { createPurchasePricesRouter } from './routes/purchase-prices';
// import { createCashReceiptsRouter } from './routes/cash-receipts';
// import { createOnlinePaymentsRouter } from './routes/online-payments';
// import { createValidationRouter } from './routes/validation';
import { createSeedRouter } from './routes/seed';
// import logsRouter from './routes/logs';

// app.use('/api/tanks', createTanksRouter(prisma));
// app.use('/api/pumps', createPumpsRouter(prisma));
// app.use('/api/clients', createClientsRouter(prisma));
// app.use('/api/sales', createSalesRouter(prisma));
// app.use('/api/prices', createPricesRouter(prisma));
// app.use('/api/purchases', createPurchasesRouter(prisma));
// app.use('/api/reports', createReportsRouter(prisma));
// app.use('/api/readings', createReadingsRouter(prisma));
// app.use('/api/receipts', createReceiptsRouter(prisma));
// app.use('/api/credits', createCreditsRouter(prisma));
// app.use('/api/purchase-prices', createPurchasePricesRouter(prisma));
// app.use('/api/cash-receipts', createCashReceiptsRouter(prisma));
// app.use('/api/online-payments', createOnlinePaymentsRouter(prisma));
// app.use('/api/validation', createValidationRouter(prisma));
app.use('/api/seed', createSeedRouter(prisma));
// app.use('/api/logs', logsRouter);

// Database initialization endpoint
app.post('/api/init-db', async (_req, res) => {
    try {
        console.log('🔧 Initializing database...');

        // Try to create the database schema
        await prisma.$executeRaw`CREATE SCHEMA IF NOT EXISTS public;`;
        console.log('✅ Schema created');

        // Try to seed the database
        const seedResponse = await fetch('https://fuel-station-backend.onrender.com/api/seed', {
            method: 'POST'
        });

        if (seedResponse.ok) {
            const result = await seedResponse.json();
            res.json({
                message: 'Database initialized successfully',
                seedResult: result
            });
        } else {
            res.json({
                message: 'Database schema created, but seeding failed',
                seedError: await seedResponse.text()
            });
        }
    } catch (error: any) {
        console.error('❌ Database initialization failed:', error);
        res.status(500).json({
            error: error.message,
            code: error.code
        });
    }
});

app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`);
});

