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

        // Test if table exists first
        try {
            const tanks = await prisma.tank.findMany();
            console.log('✅ Tanks query successful:', tanks.length, 'tanks found');
            res.json(tanks);
        } catch (tableError: any) {
            console.log('❌ Tank table error:', tableError.message);

            // If table doesn't exist, return empty array for now
            if (tableError.code === 'P2021' || tableError.message.includes('does not exist')) {
                console.log('📝 Tank table does not exist, returning empty array');
                res.json([]);
            } else {
                throw tableError;
            }
        }
    } catch (error: any) {
        console.error('❌ Tanks endpoint failed:', error);
        res.status(500).json({
            error: error.message,
            code: error.code
        });
    }
});

// Add basic endpoints for other data
app.get('/api/pumps', async (_req, res) => {
    try {
        const pumps = await prisma.pump.findMany({
            include: {
                fuelType: {
                    select: { name: true }
                }
            }
        });
        res.json(pumps);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/clients', async (_req, res) => {
    try {
        const clients = await prisma.client.findMany();
        res.json(clients);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/credits', async (_req, res) => {
    try {
        const credits = await prisma.credit.findMany();
        res.json(credits);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/cash-receipts', async (_req, res) => {
    try {
        const receipts = await prisma.cashReceipt.findMany();
        res.json(receipts);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/online-payments', async (_req, res) => {
    try {
        const payments = await prisma.onlinePayment.findMany();
        res.json(payments);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/reports/summary', async (_req, res) => {
    try {
        const summary = {
            tanks: await prisma.tank.count(),
            pumps: await prisma.pump.count(),
            clients: await prisma.client.count(),
            sales: await prisma.sale.count()
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

