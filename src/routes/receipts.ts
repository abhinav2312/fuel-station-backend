import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

export function createReceiptsRouter(prisma: PrismaClient) {
    const router = Router();

    router.get('/', async (req, res) => {
        const dateStr = String(req.query.date);
        if (!dateStr) return res.status(400).json({ message: 'date query param required (YYYY-MM-DD)' });
        const { start, end } = dayRange(dateStr);
        const receipt = await prisma.dailyReceipt.findFirst({ where: { date: { gte: start, lte: end } } });
        res.json(receipt ?? null);
    });

    router.post('/', async (req, res) => {
        const { date, cashTotal, onlineTotal, note } = req.body ?? {};
        if (!date) return res.status(400).json({ message: 'date required' });
        const day = new Date(date);
        const existing = await prisma.dailyReceipt.findUnique({ where: { date: day } });
        const result = await prisma.dailyReceipt.upsert({
            where: { date: day },
            update: { cashTotal: cashTotal ?? 0, onlineTotal: onlineTotal ?? 0, note: note ?? null },
            create: { date: day, cashTotal: cashTotal ?? 0, onlineTotal: onlineTotal ?? 0, note: note ?? null },
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


