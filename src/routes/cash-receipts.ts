import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

export function createCashReceiptsRouter(prisma: PrismaClient) {
    const router = Router();

    // Get cash receipts for a date
    router.get('/', async (req, res) => {
        const dateStr = String(req.query.date);
        if (!dateStr) return res.status(400).json({ message: 'date query param required (YYYY-MM-DD)' });

        const { start, end } = dayRange(dateStr);
        const receipts = await prisma.cashReceipt.findMany({
            where: { date: { gte: start, lte: end } },
            include: { pump: { include: { fuelType: true } } },
            orderBy: { createdAt: 'desc' },
        });
        res.json(receipts);
    });

    // Create a single cash receipt
    router.post('/', async (req, res) => {
        const { pumpId, date, amount } = req.body ?? {};
        if (!pumpId || !date || !amount) {
            return res.status(400).json({ message: 'pumpId, date, and amount are required' });
        }

        const dateKey = new Date(date);
        const result = await prisma.cashReceipt.upsert({
            where: { pumpId_date: { pumpId, date: dateKey } },
            update: { amount },
            create: { pumpId, date: dateKey, amount },
        });
        res.status(201).json(result);
    });

    // Create multiple cash receipts
    router.post('/bulk', async (req, res) => {
        const { receipts } = req.body ?? {};
        if (!receipts || !Array.isArray(receipts)) {
            return res.status(400).json({ message: 'receipts array is required' });
        }

        const results = await Promise.all(
            receipts.map(async (receipt: any) => {
                const { pumpId, date, amount } = receipt;
                const dateKey = new Date(date);
                return await prisma.cashReceipt.upsert({
                    where: { pumpId_date: { pumpId, date: dateKey } },
                    update: { amount },
                    create: { pumpId, date: dateKey, amount },
                });
            })
        );

        res.status(201).json(results);
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
