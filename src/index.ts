import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

// DATABASE_URL is automatically provided by Render when you connect a PostgreSQL database
// No need to set a fallback - Render will provide the correct connection string

const prisma = new PrismaClient();
const app = express();

// In-memory storage for demo purposes
// All data is now stored in database - no in-memory arrays needed

// Smart CORS configuration based on environment
const getCorsOrigins = () => {
    const environment = process.env.NODE_ENV || 'production';
    const frontendUrl = process.env.FRONTEND_URL;

    if (frontendUrl) {
        return [frontendUrl];
    }

    if (environment === 'development') {
        return ['http://localhost:5173'];
    } else {
        return ['https://fuelstationpro.netlify.app'];
    }
};

app.use(cors({
    origin: getCorsOrigins(),
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

// Database diagnostic endpoint
app.get('/api/db-check', async (_req, res) => {
    try {
        console.log('Running database diagnostic...');

        // Test connection
        await prisma.$connect();
        console.log('✅ Database connection successful');

        // Check if tables exist and have data
        const fuelTypeCount = await prisma.fuelType.count();
        const tankCount = await prisma.tank.count();
        const pumpCount = await prisma.pump.count();
        const clientCount = await prisma.client.count();

        console.log('📊 Database stats:', {
            fuelTypes: fuelTypeCount,
            tanks: tankCount,
            pumps: pumpCount,
            clients: clientCount
        });

        res.json({
            status: 'ok',
            database: 'connected',
            stats: {
                fuelTypes: fuelTypeCount,
                tanks: tankCount,
                pumps: pumpCount,
                clients: clientCount
            },
            message: fuelTypeCount === 0 ? 'Database is empty - needs seeding' : 'Database has data'
        });
    } catch (error: any) {
        console.error('❌ Database diagnostic failed:', error);
        res.status(500).json({
            status: 'error',
            database: 'disconnected',
            error: error.message,
            details: 'Check DATABASE_URL and database connection'
        });
    }
});

// Simple test endpoint for tanks
app.get('/api/tanks', async (_req, res) => {
    try {
        console.log('Fetching tanks from database...');

        // Test database connection first
        await prisma.$connect();
        console.log('Database connected successfully');

        const tanks = await prisma.tank.findMany({
            include: {
                fuelType: true
            },
            orderBy: {
                id: 'asc'
            }
        });

        console.log(`Found ${tanks.length} tanks in database`);
        res.json(tanks);
    } catch (error: any) {
        console.error('Error fetching tanks:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            meta: error.meta
        });
        res.status(500).json({
            error: error.message,
            details: 'Database connection or query failed'
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
        const pumps = await prisma.pump.findMany({
            include: {
                fuelType: true
            },
            orderBy: {
                id: 'asc'
            }
        });

        res.json(pumps);
    } catch (error: any) {
        console.error('Error fetching pumps:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/clients', async (_req, res) => {
    try {
        const clients = await prisma.client.findMany({
            orderBy: {
                name: 'asc'
            }
        });

        res.json(clients);
    } catch (error: any) {
        console.error('Error fetching clients:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/credits', async (_req, res) => {
    try {
        const credits = await prisma.clientCredit.findMany({
            include: {
                client: true,
                fuelType: true
            },
            orderBy: {
                date: 'desc'
            }
        });

        res.json(credits);
    } catch (error: any) {
        console.error('Error fetching credits:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/cash-receipts', async (req, res) => {
    try {
        const { date } = req.query;

        // Build where clause for date filtering
        let whereClause: any = {};
        if (date) {
            const startDate = new Date(date as string);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 1);

            whereClause.date = {
                gte: startDate,
                lt: endDate
            };
        }

        const receipts = await prisma.cashReceipt.findMany({
            where: whereClause,
            include: {
                pump: {
                    include: {
                        fuelType: true
                    }
                }
            },
            orderBy: {
                date: 'desc'
            }
        });

        res.json(receipts);
    } catch (error: any) {
        console.error('Error fetching cash receipts:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/online-payments', async (req, res) => {
    try {
        const { date } = req.query;

        // Build where clause for date filtering
        let whereClause: any = {};
        if (date) {
            const startDate = new Date(date as string);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 1);

            whereClause.date = {
                gte: startDate,
                lt: endDate
            };
        }

        const payments = await prisma.onlinePayment.findMany({
            where: whereClause,
            orderBy: {
                date: 'desc'
            }
        });

        res.json(payments);
    } catch (error: any) {
        console.error('Error fetching online payments:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET trends endpoint for dashboard charts
app.get('/api/reports/trends', async (req, res) => {
    try {
        const { period = 'today' } = req.query;
        const endDate = new Date();
        const startDate = new Date();

        // Calculate date range based on period
        switch (period) {
            case 'today':
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'week':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(startDate.getMonth() - 1);
                break;
            case 'year':
                startDate.setFullYear(startDate.getFullYear() - 1);
                break;
            default:
                startDate.setDate(startDate.getDate() - 7);
        }

        // Get sales data for the trend period
        const sales = await prisma.sale.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                pump: {
                    include: {
                        fuelType: true
                    }
                }
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        // Group sales by appropriate time period
        const groupedSales: Record<string, { sales: number; profit: number }> = {};

        sales.forEach(sale => {
            let groupKey: string;

            switch (period) {
                case 'today':
                    // Group by hour for today
                    groupKey = sale.createdAt.toISOString().split('T')[1].split(':')[0] + ':00';
                    break;
                case 'week':
                    // Group by day for week
                    groupKey = sale.createdAt.toISOString().split('T')[0];
                    break;
                case 'month':
                    // Group by week for month
                    const weekStart = new Date(sale.createdAt);
                    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                    groupKey = weekStart.toISOString().split('T')[0];
                    break;
                case 'year':
                    // Group by month for year
                    groupKey = sale.createdAt.toISOString().substring(0, 7); // YYYY-MM
                    break;
                default:
                    groupKey = sale.createdAt.toISOString().split('T')[0];
            }

            if (!groupedSales[groupKey]) {
                groupedSales[groupKey] = { sales: 0, profit: 0 };
            }
            groupedSales[groupKey].sales += Number(sale.totalAmount);
            // Calculate profit (assuming 12% margin)
            groupedSales[groupKey].profit += Number(sale.totalAmount) * 0.12;
        });

        // Convert to array format for charts
        const trendData = Object.entries(groupedSales)
            .map(([date, data]) => ({
                date,
                sales: Math.round(data.sales),
                profit: Math.round(data.profit)
            }))
            .sort((a, b) => a.date.localeCompare(b.date));

        res.json(trendData);
    } catch (error: any) {
        console.error('Error fetching trends:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/reports/summary', async (req, res) => {
    try {
        const { period = 'daily', date } = req.query;
        const targetDate = date ? new Date(date as string) : new Date();

        // Calculate date range based on period
        let startDate: Date, endDate: Date;
        if (period === 'daily') {
            startDate = new Date(targetDate);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(targetDate);
            endDate.setHours(23, 59, 59, 999);
        } else if (period === 'weekly') {
            startDate = new Date(targetDate);
            startDate.setDate(startDate.getDate() - startDate.getDay());
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
        } else { // monthly
            startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
            endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
            endDate.setHours(23, 59, 59, 999);
        }

        // Get sales data for the period
        const sales = await prisma.sale.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                pump: {
                    include: {
                        fuelType: true
                    }
                }
            }
        });

        // Get cash receipts and online payments for the period
        const cashReceipts = await prisma.cashReceipt.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        const onlinePayments = await prisma.onlinePayment.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        // Get credits for the period
        const credits = await prisma.clientCredit.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        // Calculate totals
        const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
        const totalLitres = sales.reduce((sum, sale) => sum + Number(sale.litres), 0);
        const totalCashReceived = cashReceipts.reduce((sum, receipt) => sum + Number(receipt.amount), 0);
        const totalOnlineReceived = onlinePayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
        const totalCredits = credits.reduce((sum, credit) => sum + Number(credit.totalAmount), 0);

        // Get all fuel types from database
        const fuelTypes = await prisma.fuelType.findMany({
            orderBy: { id: 'asc' }
        });

        // Group by fuel type
        const fuelTypeStats: Record<number, { litres: number; revenue: number }> = {};
        sales.forEach(sale => {
            const fuelTypeId = sale.pump.fuelType.id;
            if (!fuelTypeStats[fuelTypeId]) {
                fuelTypeStats[fuelTypeId] = { litres: 0, revenue: 0 };
            }
            fuelTypeStats[fuelTypeId].litres += Number(sale.litres);
            fuelTypeStats[fuelTypeId].revenue += Number(sale.totalAmount);
        });

        // Create fuel types array with stats
        const fuelTypesWithStats = fuelTypes.map(fuelType => ({
            id: fuelType.id,
            name: fuelType.name,
            litres: fuelTypeStats[fuelType.id]?.litres || 0,
            revenue: fuelTypeStats[fuelType.id]?.revenue || 0
        }));

        const summary = {
            period: period as string,
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0],
            totals: {
                litres: totalLitres,
                revenue: totalRevenue,
                profit: totalRevenue * 0.12 // Assuming 12% profit margin
            },
            fuelTypes: fuelTypesWithStats,
            financials: {
                totalRevenue: totalRevenue,
                creditToCollect: totalCredits,
                moneyReceived: totalCashReceived + totalOnlineReceived,
                cashReceived: totalCashReceived,
                onlineReceived: totalOnlineReceived
            },
            // Counts
            tanks: await prisma.tank.count(),
            pumps: await prisma.pump.count(),
            clients: await prisma.client.count(),
            sales: sales.length,
            todaySales: totalRevenue,
            todayProfit: totalRevenue * 0.12,
            totalCredits: totalCredits,
            unpaidCredits: await prisma.clientCredit.count({ where: { status: 'unpaid' } })
        };

        res.json(summary);
    } catch (error: any) {
        console.error('Error fetching reports summary:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add missing endpoints that frontend might need
app.get('/api/prices/current', async (_req, res) => {
    try {
        // Get current active prices for all fuel types
        const prices = await prisma.price.findMany({
            where: { active: true },
            include: {
                fuelType: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Group by fuel type and get the latest price for each
        const currentPrices: Record<string, number> = {};
        const fuelTypeMap: Record<number, string> = {};

        // Create fuel type name mapping
        const fuelTypes = await prisma.fuelType.findMany();
        fuelTypes.forEach(ft => {
            const key = ft.name.toLowerCase().replace(/\s+/g, '');
            fuelTypeMap[ft.id] = key;
        });

        // Get latest price for each fuel type and track the most recent update
        let mostRecentUpdate: Date | null = null;

        for (const fuelType of fuelTypes) {
            const latestPrice = await prisma.price.findFirst({
                where: {
                    fuelTypeId: fuelType.id,
                    active: true
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            if (latestPrice) {
                const key = fuelType.name.toLowerCase().replace(/\s+/g, '');
                currentPrices[key] = Number(latestPrice.perLitre);

                // Track the most recent update across all fuel types
                if (!mostRecentUpdate || latestPrice.createdAt > mostRecentUpdate) {
                    mostRecentUpdate = latestPrice.createdAt;
                }
            }
        }

        // Add the last updated timestamp
        const response = {
            ...currentPrices,
            updatedAt: mostRecentUpdate ? mostRecentUpdate.toISOString() : null
        };

        res.json(response);
    } catch (error: any) {
        console.error('Error fetching current prices:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/sales', async (_req, res) => {
    try {
        const sales = await prisma.sale.findMany({
            include: {
                client: true,
                pump: {
                    include: {
                        fuelType: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json(sales);
    } catch (error: any) {
        console.error('Error fetching sales:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/purchases', async (_req, res) => {
    try {
        const purchases = await prisma.purchase.findMany({
            include: {
                tank: {
                    include: {
                        fuelType: true
                    }
                }
            },
            orderBy: {
                date: 'desc'
            }
        });

        res.json(purchases);
    } catch (error: any) {
        console.error('Error fetching purchases:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/purchases', async (req, res) => {
    try {
        const { tankId, litres, unitCost, date } = req.body;
        console.log('Creating purchase:', { tankId, litres, unitCost, date });

        // Calculate total cost
        const totalCost = litres * unitCost;

        // Create purchase in database
        const newPurchase = await prisma.purchase.create({
            data: {
                tankId: parseInt(tankId),
                litres: parseFloat(litres),
                unitCost: parseFloat(unitCost),
                totalCost: totalCost,
                date: date ? new Date(date) : new Date()
            },
            include: {
                tank: {
                    include: {
                        fuelType: true
                    }
                }
            }
        });

        res.status(201).json(newPurchase);
    } catch (error: any) {
        console.error('Error creating purchase:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/prices', async (_req, res) => {
    try {
        const prices = [
            { id: 1, fuelTypeId: 1, perLitre: 95.50, active: true, date: new Date().toISOString() },
            { id: 2, fuelTypeId: 2, perLitre: 89.25, active: true, date: new Date().toISOString() }
        ];
        res.json(prices);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Add missing prices endpoints
app.get('/api/prices/combined', async (_req, res) => {
    try {
        // Get historical prices for all fuel types
        const prices = await prisma.price.findMany({
            include: {
                fuelType: true
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 30 // Get last 30 price records
        });

        // Group prices by date
        const priceMap: Record<string, Record<string, number>> = {};

        prices.forEach(price => {
            const date = price.createdAt.toISOString().split('T')[0];
            const fuelTypeKey = price.fuelType.name.toLowerCase().replace(/\s+/g, '');

            if (!priceMap[date]) {
                priceMap[date] = {};
            }

            priceMap[date][fuelTypeKey] = Number(price.perLitre);
        });

        // Convert to array format expected by frontend
        const combined = Object.entries(priceMap).map(([date, prices]) => ({
            date,
            ...prices
        }));

        res.json(combined);
    } catch (error: any) {
        console.error('Error fetching combined prices:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/prices/set', async (req, res) => {
    try {
        const { prices, date } = req.body;
        console.log('Setting prices:', prices, 'for date:', date);

        // Get all fuel types to map names to IDs
        const fuelTypes = await prisma.fuelType.findMany();
        const fuelTypeMap: Record<string, number> = {};

        fuelTypes.forEach(ft => {
            const key = ft.name.toLowerCase().replace(/\s+/g, '');
            fuelTypeMap[key] = ft.id;
        });

        // First, deactivate all current prices
        await prisma.price.updateMany({
            where: { active: true },
            data: { active: false }
        });

        // Create new prices for each fuel type
        const priceEntries = Object.entries(prices).map(([fuelTypeName, price]) => {
            const fuelTypeId = fuelTypeMap[fuelTypeName];
            if (!fuelTypeId) {
                throw new Error(`Unknown fuel type: ${fuelTypeName}`);
            }

            return {
                fuelTypeId: fuelTypeId,
                perLitre: parseFloat(price as string),
                active: true,
                createdAt: date ? new Date(date) : new Date()
            };
        });

        await prisma.price.createMany({
            data: priceEntries
        });

        res.json({
            success: true,
            message: 'Prices updated successfully',
            data: { prices, date }
        });
    } catch (error: any) {
        console.error('Error setting prices:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add missing POST endpoints that frontend needs
app.post('/api/clients', async (req, res) => {
    try {
        const { name, ownerName, phone, address, creditLimit } = req.body;
        console.log('Creating client:', { name, ownerName, phone, address, creditLimit });

        // Create new client in database
        const newClient = await prisma.client.create({
            data: {
                name,
                ownerName,
                phone,
                address,
                creditLimit: creditLimit ? parseFloat(creditLimit) : 0,
                balance: 0
            }
        });

        res.status(201).json(newClient);
    } catch (error: any) {
        console.error('Error creating client:', error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/clients/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, ownerName, phone, address, creditLimit, balance } = req.body;
        console.log('Updating client:', id, { name, ownerName, phone, address, creditLimit, balance });

        // Update client in database
        const updatedClient = await prisma.client.update({
            where: { id: parseInt(id) },
            data: {
                name,
                ownerName,
                phone,
                address,
                creditLimit: creditLimit ? parseFloat(creditLimit) : undefined,
                balance: balance ? parseFloat(balance) : undefined
            }
        });

        res.json(updatedClient);
    } catch (error: any) {
        console.error('Error updating client:', error);
        if (error.code === 'P2025') {
            res.status(404).json({ error: 'Client not found' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// DELETE client endpoint
app.delete('/api/clients/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log('Deleting client:', id);

        // Check if client has any related records (credits, sales, etc.)
        const clientCredits = await prisma.clientCredit.count({
            where: { clientId: parseInt(id) }
        });

        const clientSales = await prisma.sale.count({
            where: { clientId: parseInt(id) }
        });

        if (clientCredits > 0 || clientSales > 0) {
            return res.status(400).json({
                error: 'Cannot delete client with existing credits or sales. Please clear all related records first.'
            });
        }

        // Delete client from database
        await prisma.client.delete({
            where: { id: parseInt(id) }
        });

        res.json({ message: 'Client deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting client:', error);
        if (error.code === 'P2025') {
            res.status(404).json({ error: 'Client not found' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

app.post('/api/credits', async (req, res) => {
    try {
        const { clientId, fuelTypeId, litres, pricePerLitre, totalAmount, date, note } = req.body;
        console.log('Adding credit:', { clientId, fuelTypeId, litres, pricePerLitre, totalAmount, date, note });

        // Create credit in database
        const newCredit = await prisma.clientCredit.create({
            data: {
                clientId: parseInt(clientId),
                fuelTypeId: parseInt(fuelTypeId),
                litres: parseFloat(litres),
                pricePerLitre: parseFloat(pricePerLitre),
                totalAmount: parseFloat(totalAmount),
                date: date ? new Date(date) : new Date(),
                note: note || ""
            },
            include: {
                client: true,
                fuelType: true
            }
        });

        res.status(201).json(newCredit);
    } catch (error: any) {
        console.error('Error creating credit:', error);
        res.status(500).json({ error: error.message });
    }
});

// Mark credit as paid with payment method
app.put('/api/credits/:id/mark-paid', async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentMethod } = req.body;
        console.log('Marking credit as paid:', id, 'Payment method:', paymentMethod);

        // Validate payment method
        const validMethods = ['UPI', 'Worker', 'Owner'];
        if (!paymentMethod || !validMethods.includes(paymentMethod)) {
            return res.status(400).json({ error: 'Payment method is required. Valid options: UPI, Worker, Owner' });
        }

        // Update credit status to paid with payment method
        const updatedCredit = await prisma.clientCredit.update({
            where: { id: parseInt(id) },
            data: {
                status: 'paid',
                paidDate: new Date(),
                paymentMethod: paymentMethod
            } as any, // Type assertion to bypass Prisma type checking temporarily
            include: {
                client: true,
                fuelType: true
            }
        });

        res.json(updatedCredit);
    } catch (error: any) {
        console.error('Error marking credit as paid:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/cash-receipts', async (req, res) => {
    try {
        const { pumpId, amount, date } = req.body;
        console.log('Adding cash receipt:', { pumpId, amount, date });

        // Create cash receipt in database
        const newReceipt = await prisma.cashReceipt.create({
            data: {
                pumpId: parseInt(pumpId),
                amount: parseFloat(amount),
                date: date ? new Date(date) : new Date()
            },
            include: {
                pump: {
                    include: {
                        fuelType: true
                    }
                }
            }
        });

        res.status(201).json(newReceipt);
    } catch (error: any) {
        console.error('Error creating cash receipt:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/online-payments', async (req, res) => {
    try {
        const { amount, method, reference, description, date } = req.body;
        console.log('Adding online payment:', { amount, method, reference, description, date });

        // Create online payment in database
        const newPayment = await prisma.onlinePayment.create({
            data: {
                amount: parseFloat(amount),
                method: method || "UPI",
                reference: reference || "",
                description: description || "",
                date: date ? new Date(date) : new Date()
            }
        });

        res.status(201).json(newPayment);
    } catch (error: any) {
        console.error('Error creating online payment:', error);
        res.status(500).json({ error: error.message });
    }
});

// Bulk cash receipts endpoint
app.post('/api/cash-receipts/bulk', async (req, res) => {
    try {
        const { receipts } = req.body;
        console.log('Adding bulk cash receipts:', receipts);

        // Create bulk cash receipts in database
        const newReceipts = await prisma.cashReceipt.createMany({
            data: receipts.map((receipt: any) => ({
                pumpId: parseInt(receipt.pumpId),
                amount: parseFloat(receipt.amount),
                date: receipt.date ? new Date(receipt.date) : new Date()
            }))
        });

        res.status(201).json({ success: true, count: newReceipts.count });
    } catch (error: any) {
        console.error('Error creating bulk cash receipts:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add missing endpoints that frontend needs
app.get('/api/validation', async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = date ? new Date(date as string) : new Date();

        // Calculate date range for the day
        const startDate = new Date(targetDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(targetDate);
        endDate.setHours(23, 59, 59, 999);

        // Get sales for the day
        const sales = await prisma.sale.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        // Get cash receipts for the day
        const cashReceipts = await prisma.cashReceipt.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        // Get online payments for the day
        const onlinePayments = await prisma.onlinePayment.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        // Get credit sales for the day
        const creditSales = await prisma.clientCredit.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        // Calculate totals
        const grossSales = sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
        const totalCashReceipts = cashReceipts.reduce((sum, receipt) => sum + Number(receipt.amount), 0);
        const totalOnlinePayments = onlinePayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
        const totalCreditSales = creditSales.reduce((sum, credit) => sum + Number(credit.totalAmount), 0);
        const totalReceived = totalCashReceipts + totalOnlinePayments;
        const difference = grossSales - totalReceived;
        const isBalanced = Math.abs(difference) < 0.01; // Allow for small rounding differences

        const validationData = {
            date: targetDate.toISOString().split('T')[0],
            grossSales,
            cashReceipts: totalCashReceipts,
            onlinePayments: totalOnlinePayments,
            creditSales: totalCreditSales,
            totalReceived,
            difference,
            isBalanced
        };

        res.json(validationData);
    } catch (error: any) {
        console.error('Error fetching validation data:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/readings', async (_req, res) => {
    try {
        const readings = await prisma.dailyReading.findMany({
            include: {
                pump: {
                    include: {
                        fuelType: true
                    }
                }
            },
            orderBy: {
                date: 'desc'
            }
        });

        res.json(readings);
    } catch (error: any) {
        console.error('Error fetching readings:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/readings', async (req, res) => {
    try {
        const { pumpId, date, openingLitres, closingLitres, pricePerLitre, revenue } = req.body;
        console.log('Saving reading:', { pumpId, date, openingLitres, closingLitres, pricePerLitre, revenue });

        // Create or update daily reading
        const reading = await prisma.dailyReading.upsert({
            where: {
                pumpId_date: {
                    pumpId: parseInt(pumpId),
                    date: new Date(date)
                }
            },
            update: {
                openingLitres: parseFloat(openingLitres),
                closingLitres: parseFloat(closingLitres),
                pricePerLitre: parseFloat(pricePerLitre),
                revenue: parseFloat(revenue || 0)
            },
            create: {
                pumpId: parseInt(pumpId),
                date: new Date(date),
                openingLitres: parseFloat(openingLitres),
                closingLitres: parseFloat(closingLitres),
                pricePerLitre: parseFloat(pricePerLitre),
                revenue: parseFloat(revenue || 0)
            },
            include: {
                pump: {
                    include: {
                        fuelType: true
                    }
                }
            }
        });

        res.status(201).json(reading);
    } catch (error: any) {
        console.error('Error saving reading:', error);
        res.status(500).json({ error: error.message });
    }
});

// Bulk readings endpoint for saving multiple readings at once
// Each pump can have only ONE reading per day - updates existing record if found
app.post('/api/readings/bulk', async (req, res) => {
    try {
        const { readings } = req.body;
        console.log('Saving bulk readings:', readings);

        if (!readings || !Array.isArray(readings)) {
            return res.status(400).json({ error: 'Readings array is required' });
        }

        const savedReadings = [];

        for (const reading of readings) {
            const { pumpId, date, openingLitres, closingLitres, pricePerLitre, revenue } = reading;

            // UPSERT: Update existing reading for this pump+date, or create new one
            // This ensures only ONE reading per pump per day
            const savedReading = await prisma.dailyReading.upsert({
                where: {
                    pumpId_date: {
                        pumpId: parseInt(pumpId),
                        date: new Date(date)
                    }
                },
                update: {
                    openingLitres: parseFloat(openingLitres),
                    closingLitres: parseFloat(closingLitres),
                    pricePerLitre: parseFloat(pricePerLitre),
                    revenue: parseFloat(revenue || 0)
                },
                create: {
                    pumpId: parseInt(pumpId),
                    date: new Date(date),
                    openingLitres: parseFloat(openingLitres),
                    closingLitres: parseFloat(closingLitres),
                    pricePerLitre: parseFloat(pricePerLitre),
                    revenue: parseFloat(revenue || 0)
                },
                include: {
                    pump: {
                        include: {
                            fuelType: true
                        }
                    }
                }
            });

            savedReadings.push(savedReading);
        }

        res.status(201).json({
            success: true,
            message: `${savedReadings.length} readings saved successfully`,
            readings: savedReadings
        });
    } catch (error: any) {
        console.error('Error saving bulk readings:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/purchase-prices', async (_req, res) => {
    try {
        // Get latest purchase prices for each tank
        const tanks = await prisma.tank.findMany();
        const purchasePrices: Record<number, number> = {};

        for (const tank of tanks) {
            const latestPrice = await prisma.purchasePrice.findFirst({
                where: { tankId: tank.id },
                orderBy: { createdAt: 'desc' }
            });

            if (latestPrice) {
                purchasePrices[tank.id] = Number(latestPrice.price);
            } else {
                // Default prices if no purchase price found
                purchasePrices[tank.id] = 0;
            }
        }

        res.json(purchasePrices);
    } catch (error: any) {
        console.error('Error fetching purchase prices:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/purchase-prices', async (req, res) => {
    try {
        const { prices } = req.body;
        console.log('Saving purchase prices:', prices);

        // Save purchase prices to database
        const priceEntries = Object.entries(prices).map(([tankId, price]) => ({
            tankId: parseInt(tankId),
            price: parseFloat(price as string)
        }));

        await prisma.purchasePrice.createMany({
            data: priceEntries
        });

        res.json({ success: true, message: 'Purchase prices saved successfully' });
    } catch (error: any) {
        console.error('Error saving purchase prices:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/receipts', async (_req, res) => {
    try {
        // Get daily receipts from the database
        const receipts = await prisma.dailyReceipt.findMany({
            orderBy: {
                date: 'desc'
            }
        });

        res.json(receipts);
    } catch (error: any) {
        console.error('Error fetching receipts:', error);
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

