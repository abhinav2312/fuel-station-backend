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

// Database diagnostic endpoint
app.get('/api/db-check', async (_req, res) => {
    try {
        console.log('🔍 Checking database connection...');

        // Test basic connection
        await prisma.$connect();
        console.log('✅ Database connected');

        // Test if tables exist
        const fuelTypes = await prisma.fuelType.count();
        const tanks = await prisma.tank.count();
        const pumps = await prisma.pump.count();

        res.json({
            status: 'connected',
            tables: {
                fuelTypes,
                tanks,
                pumps
            },
            message: 'Database is accessible'
        });

    } catch (error: any) {
        console.error('❌ Database check failed:', error);
        res.status(500).json({
            status: 'error',
            error: error.message,
            code: error.code,
            meta: error.meta
        });
    }
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

app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`);
});

