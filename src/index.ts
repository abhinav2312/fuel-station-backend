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
        const tanks = await prisma.tank.findMany({
            include: {
                fuelType: {
                    select: { name: true }
                }
            }
        });
        console.log('✅ Tanks query successful:', tanks.length, 'tanks found');
        res.json(tanks);
    } catch (error: any) {
        console.error('❌ Tanks endpoint failed:', error);
        res.status(500).json({
            error: error.message,
            code: error.code
        });
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

app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`);
});

