import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { backendLogger, log } from './utils/logger';

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
        return [
            'https://fuelstationpro.netlify.app',
            'https://fuelmanagementpro.netlify.app'
        ];
    }
};

app.use(cors({
    origin: getCorsOrigins(),
    credentials: true
}));

app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
    const startTime = log.startTimer();
    const originalSend = res.send;

    res.send = function (data) {
        const duration = log.endTimer(startTime);
        log.api(req.method, req.path, startTime, res.statusCode, {
            endpoint: req.path,
            method: req.method,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        return originalSend.call(this, data);
    };

    next();
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.get('/health', (_req, res) => {
    res.json({ ok: true });
});

// Production status endpoint
app.get('/api/status', async (_req, res) => {
    const startTime = log.startTimer();
    try {
        await prisma.$connect();
        const duration = log.endTimer(startTime);

        backendLogger.info('Health check successful', {
            database: 'connected',
            duration
        }, {
            endpoint: '/api/status',
            method: 'GET'
        });

        res.json({
            status: 'ok',
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        const duration = log.endTimer(startTime);

        backendLogger.error('Health check failed', {
            database: 'disconnected',
            error: error instanceof Error ? error.message : 'Unknown error',
            duration
        }, {
            endpoint: '/api/status',
            method: 'GET'
        });

        res.status(500).json({
            status: 'error',
            database: 'disconnected',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
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

        // Convert Decimal fields to numbers for proper JSON serialization
        const tanksWithNumbers = tanks.map(tank => ({
            ...tank,
            capacityLit: Number(tank.capacityLit),
            currentLevel: Number(tank.currentLevel),
            avgUnitCost: Number(tank.avgUnitCost)
        }));

        console.log(`Found ${tanks.length} tanks in database`);
        console.log('Tank data:', tanksWithNumbers);
        res.json(tanksWithNumbers);
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

        // Get sales data from daily readings (actual fuel sold)
        const readings = await prisma.dailyReading.findMany({
            where: {
                date: {
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

        // Convert readings to sales format for compatibility
        const sales = readings.map(reading => ({
            id: reading.id,
            litres: Number(reading.openingLitres) - Number(reading.closingLitres),
            totalAmount: Number(reading.revenue),
            createdAt: reading.date,
            pump: reading.pump
        })).filter(sale => sale.litres > 0); // Only include positive fuel sales

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

        // Get all fuel types from database first
        const fuelTypes = await prisma.fuelType.findMany({
            orderBy: { id: 'asc' }
        });

        // Get current prices for profit calculations
        const currentPrices = await prisma.price.findMany({
            where: { isActive: true },
            include: { fuelType: true }
        });

        // Calculate detailed profit analysis
        let totalCostPrice = 0;
        let totalSellingPrice = 0;
        const fuelTypeProfits: Record<number, {
            name: string;
            litres: number;
            costPrice: number;
            sellingPrice: number;
            profit: number;
            margin: number
        }> = {};

        // Calculate profit for each fuel type
        fuelTypes.forEach(fuelType => {
            const fuelTypeSales = sales.filter(sale => sale.pump.fuelType.id === fuelType.id);
            const totalLitresForType = fuelTypeSales.reduce((sum, sale) => sum + Number(sale.litres), 0);
            const totalRevenueForType = fuelTypeSales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);

            // Get current price for this fuel type
            const currentPrice = currentPrices.find(p => p.fuelTypeId === fuelType.id);
            const sellingPricePerLitre = currentPrice ? Number(currentPrice.perLitre) : 0;

            // Estimate cost price (typically 85-90% of selling price for fuel stations)
            const costPricePerLitre = sellingPricePerLitre * 0.88; // 12% margin assumption

            const costPrice = totalLitresForType * costPricePerLitre;
            const profit = totalRevenueForType - costPrice;
            const margin = totalRevenueForType > 0 ? (profit / totalRevenueForType) * 100 : 0;

            fuelTypeProfits[fuelType.id] = {
                name: fuelType.name,
                litres: totalLitresForType,
                costPrice,
                sellingPrice: totalRevenueForType,
                profit,
                margin
            };

            totalCostPrice += costPrice;
            totalSellingPrice += totalRevenueForType;
        });

        const totalProfit = totalSellingPrice - totalCostPrice;
        const overallMargin = totalSellingPrice > 0 ? (totalProfit / totalSellingPrice) * 100 : 0;

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
                profit: totalProfit,
                costPrice: totalCostPrice,
                margin: overallMargin
            },
            fuelTypes: fuelTypesWithStats,
            fuelTypeProfits: Object.values(fuelTypeProfits),
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
            todayProfit: totalProfit,
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
            where: { isActive: true },
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
                    isActive: true
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
            where: { isActive: true },
            data: { isActive: false }
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
                isActive: true,
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

        // Get pump readings for the day (this gives us the actual fuel sold)
        const readings = await prisma.dailyReading.findMany({
            where: {
                date: {
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

        // Get current prices to calculate gross sales from readings
        const prices = await prisma.price.findMany({
            where: {
                isActive: true
            },
            include: {
                fuelType: true
            }
        });

        // Calculate gross sales from readings (actual fuel sold * current prices)
        let grossSales = 0;
        console.log(`Validation for ${targetDate.toISOString().split('T')[0]}: Found ${readings.length} readings`);

        readings.forEach(reading => {
            // Fuel sold = Opening - Closing (fuel that went out of the tank)
            const fuelSold = Number(reading.openingLitres) - Number(reading.closingLitres);
            const currentPrice = prices.find(p => p.fuelTypeId === reading.pump.fuelTypeId);

            console.log(`Pump ${reading.pumpId}: Opening=${reading.openingLitres}L, Closing=${reading.closingLitres}L, Sold=${fuelSold}L at ₹${currentPrice?.perLitre || 0}/L`);

            // Only count positive fuel sales (fuel sold, not fuel added)
            if (currentPrice && fuelSold > 0) {
                const saleAmount = fuelSold * Number(currentPrice.perLitre);
                grossSales += saleAmount;
                console.log(`Added ₹${saleAmount.toFixed(2)} to gross sales`);
            } else if (fuelSold < 0) {
                console.log(`Pump ${reading.pumpId}: Fuel was added (${Math.abs(fuelSold)}L), not sold`);
            }
        });

        console.log(`Total gross sales from readings: ₹${grossSales.toFixed(2)}`);

        // Get cash receipts (money collected by workers)
        const cashReceipts = await prisma.cashReceipt.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        // Get online payments (UPI, etc.)
        const onlinePayments = await prisma.onlinePayment.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        // Get credit sales (sales on credit - money to be received later)
        const creditSales = await prisma.clientCredit.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        // Get credit payments (credits paid today - money received from previous credit sales)
        // Only count payments made by workers or UPI, not owner payments (since owner has that money)
        const creditPayments = await prisma.clientCredit.findMany({
            where: {
                paidDate: {
                    gte: startDate,
                    lte: endDate
                },
                status: 'paid',
                paymentMethod: {
                    in: ['Worker', 'UPI'] // Only count worker and UPI payments, exclude 'Owner'
                }
            }
        });

        // Calculate totals
        const totalCashReceipts = cashReceipts.reduce((sum, receipt) => sum + Number(receipt.amount), 0);
        const totalOnlinePayments = onlinePayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
        const totalCreditSales = creditSales.reduce((sum, credit) => sum + Number(credit.totalAmount), 0);
        const totalCreditPayments = creditPayments.reduce((sum, credit) => sum + Number(credit.totalAmount), 0);

        console.log(`Money received breakdown:`);
        console.log(`- Cash receipts: ₹${totalCashReceipts.toFixed(2)} (${cashReceipts.length} receipts)`);
        console.log(`- Online payments: ₹${totalOnlinePayments.toFixed(2)} (${onlinePayments.length} payments)`);
        console.log(`- Credit payments (Worker/UPI only): ₹${totalCreditPayments.toFixed(2)} (${creditPayments.length} payments)`);
        console.log(`- Credit sales: ₹${totalCreditSales.toFixed(2)} (${creditSales.length} credits)`);

        // Total money received = Cash + Online + Credit Payments
        const totalReceived = totalCashReceipts + totalOnlinePayments + totalCreditPayments;

        // The validation: Gross Sales should equal Total Received + Credit Sales
        // (Credit Sales are money to be received later)
        const expectedTotal = totalReceived + totalCreditSales;
        const difference = grossSales - expectedTotal;
        const isBalanced = Math.abs(difference) < 0.01; // Allow for small rounding differences

        console.log(`Validation result: Gross Sales (₹${grossSales.toFixed(2)}) vs Expected (₹${expectedTotal.toFixed(2)}) = Difference: ₹${difference.toFixed(2)}`);

        const validationData = {
            date: targetDate.toISOString().split('T')[0],
            grossSales,
            cashReceipts: totalCashReceipts,
            onlinePayments: totalOnlinePayments,
            creditSales: totalCreditSales,
            creditPayments: totalCreditPayments,
            totalReceived,
            expectedTotal,
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
        const { pumpId, date, openingLitres, closingLitres, pricePerLitre } = req.body;

        // Calculate revenue automatically: fuel sold × price per litre
        const fuelSold = parseFloat(openingLitres) - parseFloat(closingLitres);
        const calculatedRevenue = fuelSold > 0 ? fuelSold * parseFloat(pricePerLitre) : 0;

        console.log('Saving reading:', { pumpId, date, openingLitres, closingLitres, pricePerLitre, fuelSold, calculatedRevenue });

        // Get pump details to find fuel type
        const pump = await prisma.pump.findUnique({
            where: { id: parseInt(pumpId) },
            include: { fuelType: true }
        });

        if (!pump) {
            return res.status(404).json({ error: 'Pump not found' });
        }

        // Find the tank for this fuel type
        const tank = await prisma.tank.findFirst({
            where: {
                fuelTypeId: pump.fuelTypeId,
                isActive: true
            }
        });

        if (!tank) {
            return res.status(404).json({ error: `No active tank found for fuel type: ${pump.fuelType.name}` });
        }

        // Use transaction to ensure both reading and tank update succeed
        const result = await prisma.$transaction(async (tx) => {
            // Create or update daily reading
            const reading = await tx.dailyReading.upsert({
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
                    revenue: calculatedRevenue
                },
                create: {
                    pumpId: parseInt(pumpId),
                    date: new Date(date),
                    openingLitres: parseFloat(openingLitres),
                    closingLitres: parseFloat(closingLitres),
                    pricePerLitre: parseFloat(pricePerLitre),
                    revenue: calculatedRevenue
                },
                include: {
                    pump: {
                        include: {
                            fuelType: true
                        }
                    }
                }
            });

            // Deduct fuel from tank if fuel was sold
            if (fuelSold > 0) {
                const newTankLevel = Number(tank.currentLevel) - fuelSold;

                if (newTankLevel < 0) {
                    throw new Error(`Insufficient fuel in tank. Tank has ${tank.currentLevel}L, trying to sell ${fuelSold}L`);
                }

                await tx.tank.update({
                    where: { id: tank.id },
                    data: { currentLevel: newTankLevel }
                });

                console.log(`Deducted ${fuelSold}L from ${tank.name}. New level: ${newTankLevel}L`);
            }

            return reading;
        });

        res.status(201).json(result);
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

        // Group readings by fuel type to calculate total fuel sold per fuel type
        const fuelTypeTotals: Record<number, number> = {};
        const savedReadings = [];

        // First pass: save all readings and calculate fuel sold per fuel type
        for (const reading of readings) {
            const { pumpId, date, openingLitres, closingLitres, pricePerLitre, revenue } = reading;

            // Get pump details to find fuel type
            const pump = await prisma.pump.findUnique({
                where: { id: parseInt(pumpId) },
                include: { fuelType: true }
            });

            if (!pump) {
                throw new Error(`Pump ${pumpId} not found`);
            }

            // Calculate fuel sold
            const fuelSold = parseFloat(openingLitres) - parseFloat(closingLitres);

            // Add to fuel type totals
            if (fuelSold > 0) {
                fuelTypeTotals[pump.fuelTypeId] = (fuelTypeTotals[pump.fuelTypeId] || 0) + fuelSold;
            }

            // UPSERT: Update existing reading for this pump+date, or create new one
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

        // Second pass: deduct fuel from tanks based on fuel type totals
        for (const [fuelTypeId, totalFuelSold] of Object.entries(fuelTypeTotals)) {
            const tank = await prisma.tank.findFirst({
                where: {
                    fuelTypeId: parseInt(fuelTypeId),
                    isActive: true
                }
            });

            if (tank) {
                const newTankLevel = Number(tank.currentLevel) - totalFuelSold;

                if (newTankLevel < 0) {
                    throw new Error(`Insufficient fuel in tank for fuel type ${fuelTypeId}. Tank has ${tank.currentLevel}L, trying to sell ${totalFuelSold}L`);
                }

                await prisma.tank.update({
                    where: { id: tank.id },
                    data: { currentLevel: newTankLevel }
                });

                console.log(`Deducted ${totalFuelSold}L from ${tank.name} (fuel type ${fuelTypeId}). New level: ${newTankLevel}L`);
            }
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
        // Get current active prices for each tank from Price table
        const tanks = await prisma.tank.findMany({
            include: { fuelType: true }
        });
        const purchasePrices: Record<number, number> = {};

        for (const tank of tanks) {
            const activePrice = await prisma.price.findFirst({
                where: {
                    fuelTypeId: tank.fuelTypeId,
                    isActive: true
                },
                orderBy: { createdAt: 'desc' }
            });

            if (activePrice) {
                purchasePrices[tank.id] = Number(activePrice.perLitre);
            } else {
                // Default prices if no active price found
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

        const results = [];

        for (const [tankId, price] of Object.entries(prices)) {
            const priceValue = Number(price);
            if (priceValue > 0) {
                // Get the tank to find its fuel type
                const tank = await prisma.tank.findUnique({
                    where: { id: parseInt(tankId) },
                    include: { fuelType: true }
                });

                if (tank) {
                    // Deactivate current price for this fuel type
                    await prisma.price.updateMany({
                        where: {
                            fuelTypeId: tank.fuelTypeId,
                            isActive: true
                        },
                        data: { isActive: false }
                    });

                    // Create new price record
                    const newPrice = await prisma.price.create({
                        data: {
                            fuelTypeId: tank.fuelTypeId,
                            perLitre: priceValue,
                            isActive: true
                        }
                    });

                    results.push({
                        tankId: parseInt(tankId),
                        fuelTypeId: tank.fuelTypeId,
                        price: priceValue,
                        priceId: newPrice.id
                    });
                }
            }
        }

        res.json({
            success: true,
            message: 'Purchase prices updated successfully',
            results
        });
    } catch (error: any) {
        console.error('Error saving purchase prices:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/receipts', async (_req, res) => {
    try {
        // Get daily receipts from the database
        const receipts = await prisma.cashReceipt.findMany({
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

// Import only the routes that are actually used by the frontend
import { createTanksRouter } from './routes/tanks';
import { createPumpsRouter } from './routes/pumps';
import { createPricesRouter } from './routes/prices';
import { createPurchasesRouter } from './routes/purchases';
import { createReportsRouter } from './routes/reports';
import { createReadingsRouter } from './routes/readings';
import { createCashReceiptsRouter } from './routes/cash-receipts';
import { createOnlinePaymentsRouter } from './routes/online-payments';
import { createValidationRouter } from './routes/validation';
import { createSeedRouter } from './routes/seed';
import logsRouter from './routes/logs';

// Register the routes
app.use('/api/tanks', createTanksRouter(prisma));
app.use('/api/pumps', createPumpsRouter(prisma));
app.use('/api/prices', createPricesRouter(prisma));
app.use('/api/purchases', createPurchasesRouter(prisma));
app.use('/api/reports', createReportsRouter(prisma));
app.use('/api/readings', createReadingsRouter(prisma));
app.use('/api/cash-receipts', createCashReceiptsRouter(prisma));
app.use('/api/online-payments', createOnlinePaymentsRouter(prisma));
app.use('/api/validation', createValidationRouter(prisma));
app.use('/api/seed', createSeedRouter(prisma));
app.use('/api/logs', logsRouter);

// Add missing API endpoints that the frontend uses
// Clients API (since we deleted the clients route file)
app.get('/api/clients', async (_req, res) => {
    try {
        const clients = await prisma.client.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(clients);
    } catch (error: any) {
        console.error('Error fetching clients:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/clients', async (req, res) => {
    try {
        const { name, ownerName, phone, address } = req.body;
        const client = await prisma.client.create({
            data: { name, ownerName, phone, address: address || null }
        });
        res.status(201).json(client);
    } catch (error: any) {
        console.error('Error creating client:', error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/clients/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, ownerName, phone, address } = req.body;
        const client = await prisma.client.update({
            where: { id: parseInt(id) },
            data: { name, ownerName, phone, address: address || null }
        });
        res.json(client);
    } catch (error: any) {
        console.error('Error updating client:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/clients/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.client.delete({ where: { id: parseInt(id) } });
        res.json({ message: 'Client deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting client:', error);
        res.status(500).json({ error: error.message });
    }
});

// Credits API (since we deleted the credits route file)
app.get('/api/credits', async (req, res) => {
    try {
        const { clientId, status } = req.query;
        const where: any = {};
        if (clientId) where.clientId = parseInt(clientId as string);
        if (status) where.status = status;

        const credits = await prisma.clientCredit.findMany({
            where,
            include: { client: true, fuelType: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(credits);
    } catch (error: any) {
        console.error('Error fetching credits:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/credits', async (req, res) => {
    try {
        const { clientId, fuelTypeId, litres, pricePerLitre, totalAmount, status, paymentMethod, note } = req.body;
        const credit = await prisma.clientCredit.create({
            data: {
                clientId,
                fuelTypeId,
                litres,
                pricePerLitre,
                totalAmount,
                status: status || 'unpaid',
                paymentMethod,
                note,
                date: new Date()
            }
        });
        res.status(201).json(credit);
    } catch (error: any) {
        console.error('Error creating credit:', error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/credits/:id/mark-paid', async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentMethod, note } = req.body;
        const credit = await prisma.clientCredit.update({
            where: { id: parseInt(id) },
            data: {
                status: 'paid',
                paymentMethod,
                note,
                paidDate: new Date()
            }
        });
        res.json(credit);
    } catch (error: any) {
        console.error('Error marking credit as paid:', error);
        res.status(500).json({ error: error.message });
    }
});

// Sales API (since we deleted the sales route file)
app.get('/api/sales', async (req, res) => {
    try {
        const sales = await prisma.sale.findMany({
            include: { client: true, fuelType: true, pump: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(sales);
    } catch (error: any) {
        console.error('Error fetching sales:', error);
        res.status(500).json({ error: error.message });
    }
});

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
    backendLogger.info('Server started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV || 'production',
        corsOrigins: getCorsOrigins()
    }, {
        endpoint: 'server_startup',
        method: 'INIT'
    });
    console.log(`Backend listening on http://localhost:${PORT}`);
});

