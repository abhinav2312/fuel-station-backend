import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

export function createReportsRouter(prisma: PrismaClient) {
    const router = Router();

    router.get('/summary', async (req, res) => {
        const dateStr = String(req.query.date || '');
        const period = String(req.query.period || 'daily'); // daily|weekly|monthly|yearly
        const now = dateStr ? new Date(dateStr) : new Date();
        const start = period === 'daily' ? getPeriodStart(now, 'daily') : getPeriodStart(now, period);

        // Aggregate from DailyReading with per fuel type totals
        const readings = await prisma.dailyReading.findMany({
            where: { date: { gte: start, lte: endOfPeriod(start, period) } },
            include: { pump: { include: { fuelType: true } } },
        });
        let litres = 0, revenue = 0;
        let petrolLitres = 0, dieselLitres = 0, premiumPetrolLitres = 0;
        let petrolRevenue = 0, dieselRevenue = 0, premiumPetrolRevenue = 0;
        for (const r of readings) {
            const sold = Number(r.openingLitres) - Number(r.closingLitres); // opening - closing = sold
            const readingRevenue = Number(r.revenue);
            litres += sold;
            revenue += readingRevenue; // Use stored revenue instead of calculating
            const fuelTypeName = r.pump.fuelType.name.toLowerCase();
            if (fuelTypeName === 'petrol') {
                petrolLitres += sold;
                petrolRevenue += readingRevenue;
            } else if (fuelTypeName === 'diesel') {
                dieselLitres += sold;
                dieselRevenue += readingRevenue;
            } else if (fuelTypeName === 'premium petrol') {
                premiumPetrolLitres += sold;
                premiumPetrolRevenue += readingRevenue;
            }
        }

        // Credit totals from Sales where method == CREDIT (sum by date range)
        const creditAgg = await prisma.sale.aggregate({
            _sum: { totalAmount: true },
            where: { paymentMethod: 'CREDIT', createdAt: { gte: start, lte: endOfPeriod(start, period) } },
        });
        const saleCreditTotal = Number(creditAgg._sum.totalAmount ?? 0);

        // Credit totals from ClientCredit table
        const clientCreditAgg = await prisma.clientCredit.aggregate({
            _sum: { totalAmount: true },
            where: { date: { gte: start, lte: endOfPeriod(start, period) } }
        });
        const clientCreditTotal = Number(clientCreditAgg._sum.totalAmount ?? 0);

        const creditTotal = saleCreditTotal + clientCreditTotal;

        // Cash from CashReceipt
        const cashAgg = await prisma.cashReceipt.aggregate({
            _sum: { amount: true },
            where: { date: { gte: start, lte: endOfPeriod(start, period) } }
        });
        const cashTotal = Number(cashAgg._sum.amount ?? 0);

        // Online from OnlinePayment
        const onlineAgg = await prisma.onlinePayment.aggregate({
            _sum: { amount: true },
            where: { date: { gte: start, lte: endOfPeriod(start, period) } }
        });
        const onlineTotal = Number(onlineAgg._sum.amount ?? 0);

        // Debug logging
        console.log('Payment Debug:', {
            start: start.toISOString(),
            end: endOfPeriod(start, period).toISOString(),
            cashTotal,
            onlineTotal,
            creditTotal
        });

        // Debug revenue calculation
        console.log('Revenue Debug:', {
            totalReadings: readings.length,
            petrolRevenue,
            dieselRevenue,
            premiumPetrolRevenue,
            totalRevenue: revenue,
            sampleReading: readings[0] ? {
                id: readings[0].id,
                revenue: readings[0].revenue,
                openingLitres: readings[0].openingLitres,
                closingLitres: readings[0].closingLitres,
                pricePerLitre: readings[0].pricePerLitre,
                fuelType: readings[0].pump?.fuelType?.name
            } : 'No readings found'
        });

        res.json({
            period,
            start,
            end: endOfPeriod(start, period),
            totals: {
                litres,
                petrolLitres,
                dieselLitres,
                premiumPetrolLitres,
                revenue,
                profit: revenue, // No cost calculation for now
            },
            revenues: {
                petrolRevenue,
                dieselRevenue,
                premiumPetrolRevenue,
            },
            financials: {
                totalRevenue: revenue,
                creditToCollect: creditTotal,
                moneyReceived: revenue - creditTotal,
                cashReceived: cashTotal,
                onlineReceived: onlineTotal,
            },
        });
    });

    return router;
}

function getPeriodStart(now: Date, period: string): Date {
    const d = new Date(now);
    if (period === 'daily') {
        d.setHours(0, 0, 0, 0);
        return d;
    }
    if (period === 'weekly') {
        const day = d.getDay();
        const diff = (day + 6) % 7; // Monday start
        d.setDate(d.getDate() - diff);
        d.setHours(0, 0, 0, 0);
        return d;
    }
    if (period === 'monthly') {
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        return d;
    }
    if (period === 'yearly') {
        d.setMonth(0, 1);
        d.setHours(0, 0, 0, 0);
        return d;
    }
    d.setHours(0, 0, 0, 0);
    return d;
}

function endOfPeriod(start: Date, period: string): Date {
    const end = new Date(start);
    if (period === 'daily') {
        end.setDate(end.getDate() + 1);
        end.setMilliseconds(end.getMilliseconds() - 1);
        return end;
    }
    if (period === 'weekly') {
        end.setDate(end.getDate() + 7);
        end.setMilliseconds(end.getMilliseconds() - 1);
        return end;
    }
    if (period === 'monthly') {
        end.setMonth(end.getMonth() + 1);
        end.setMilliseconds(end.getMilliseconds() - 1);
        return end;
    }
    if (period === 'yearly') {
        end.setFullYear(end.getFullYear() + 1);
        end.setMilliseconds(end.getMilliseconds() - 1);
        return end;
    }
    return end;
}


