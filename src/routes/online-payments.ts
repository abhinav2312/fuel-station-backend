import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

export function createOnlinePaymentsRouter(prisma: PrismaClient) {
    const router = Router();

    // Get online payments for a date
    router.get('/', async (req, res) => {
        const dateStr = String(req.query.date);
        if (!dateStr) return res.status(400).json({ message: 'date query param required (YYYY-MM-DD)' });

        const { start, end } = dayRange(dateStr);
        const payments = await prisma.onlinePayment.findMany({
            where: { date: { gte: start, lte: end } },
            orderBy: { createdAt: 'desc' },
        });
        res.json(payments);
    });

    // Create an online payment
    router.post('/', async (req, res) => {
        const { date, amount, method, reference, description } = req.body ?? {};
        if (!date || !amount || !method) {
            return res.status(400).json({ message: 'date, amount, and method are required' });
        }

        const dateKey = new Date(date);
        const result = await prisma.onlinePayment.create({
            data: { date: dateKey, amount, method, reference, description },
        });
        res.status(201).json(result);
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
