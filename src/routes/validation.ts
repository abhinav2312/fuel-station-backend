import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

export function createValidationRouter(prisma: PrismaClient) {
    const router = Router();

    // Get validation data for a date
    router.get('/', async (req, res) => {
        const dateStr = String(req.query.date);
        if (!dateStr) return res.status(400).json({ message: 'date query param required (YYYY-MM-DD)' });

        const { start, end } = dayRange(dateStr);

        try {
            // Get gross sales from readings
            const readings = await prisma.dailyReading.findMany({
                where: { date: { gte: start, lte: end } },
                include: { pump: { include: { fuelType: true } } },
            });

            let grossSales = 0;
            for (const reading of readings) {
                const sold = Number(reading.openingLitres) - Number(reading.closingLitres);
                grossSales += sold * Number(reading.pricePerLitre);
            }

            // Get cash receipts
            const cashReceipts = await prisma.cashReceipt.findMany({
                where: { date: { gte: start, lte: end } },
            });

            const totalCashReceipts = cashReceipts.reduce((sum, receipt) => sum + Number(receipt.amount), 0);

            // Get online payments
            const onlinePayments = await prisma.onlinePayment.findMany({
                where: { date: { gte: start, lte: end } },
            });

            const totalOnlinePayments = onlinePayments.reduce((sum, payment) => sum + Number(payment.amount), 0);

            // Get credit sales from both Sale table and ClientCredit table
            const [saleCredits, clientCredits] = await Promise.all([
                prisma.sale.aggregate({
                    _sum: { totalAmount: true },
                    where: {
                        paymentMethod: 'CREDIT',
                        createdAt: { gte: start, lte: end }
                    },
                }),
                prisma.clientCredit.aggregate({
                    _sum: { totalAmount: true },
                    where: {
                        date: { gte: start, lte: end }
                    },
                })
            ]);

            const totalCreditSales = Number(saleCredits._sum.totalAmount ?? 0) + Number(clientCredits._sum.totalAmount ?? 0);

            const totalReceived = totalCashReceipts + totalOnlinePayments + totalCreditSales;
            const difference = totalReceived - grossSales;
            const isBalanced = Math.abs(difference) < 0.01; // Allow for small rounding differences

            res.json({
                date: dateStr,
                grossSales,
                cashReceipts: totalCashReceipts,
                onlinePayments: totalOnlinePayments,
                creditSales: totalCreditSales,
                totalReceived,
                difference,
                isBalanced,
            });
        } catch (error) {
            console.error('Error calculating validation data:', error);
            res.status(500).json({ message: 'Error calculating validation data' });
        }
    });

    return router;
}

function dayRange(dateStr: string) {
    const d = new Date(dateStr);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    end.setMilliseconds(end.getMilliseconds() - 1);
    return { start, end };
}
