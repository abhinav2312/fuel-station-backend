import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

export function createClientsRouter(prisma: PrismaClient) {
    const router = Router();

    router.get('/', async (_req, res) => {
        const clients = await prisma.client.findMany({ orderBy: { id: 'asc' } });
        res.json(clients);
    });

    router.post('/', async (req, res) => {
        const { name, ownerName, phone, address } = req.body ?? {};
        if (!name || !ownerName || !phone) return res.status(400).json({ message: 'name, ownerName, phone are required' });
        const client = await prisma.client.create({ data: { name, ownerName, phone, address: address ?? null } });
        res.status(201).json(client);
    });

    router.put('/:id', async (req, res) => {
        const id = Number(req.params.id);
        const { name, ownerName, phone, address } = req.body ?? {};
        if (!name || !ownerName || !phone) return res.status(400).json({ message: 'name, ownerName, phone are required' });
        const client = await prisma.client.update({
            where: { id },
            data: { name, ownerName, phone, address: address ?? null }
        });
        res.json(client);
    });

    // Record client credit for fuel taken on a date (per fuel type)
    router.post('/:id/credit', async (req, res) => {
        const id = Number(req.params.id);
        const { fuelTypeId, litres, pricePerLitre, totalAmount, date, note } = req.body ?? {};
        if (!fuelTypeId || !litres || pricePerLitre === undefined || pricePerLitre === null || !date) return res.status(400).json({ message: 'fuelTypeId, litres, pricePerLitre, date required' });
        const when = new Date(date);
        const finalTotalAmount = totalAmount ? Number(totalAmount) : Number(litres) * Number(pricePerLitre);
        const result = await prisma.$transaction(async (tx) => {
            const credit = await tx.clientCredit.create({ data: { clientId: id, fuelTypeId, litres, pricePerLitre, totalAmount: finalTotalAmount, date: when, note: note ?? null } });
            await tx.client.update({ where: { id }, data: { balance: { increment: finalTotalAmount } } });
            await tx.ledgerEntry.create({ data: { clientId: id, amount: finalTotalAmount, memo: 'Fuel on credit' } });
            return credit;
        });
        res.status(201).json(result);
    });

    // List credits by date range
    router.get('/:id/credits', async (req, res) => {
        const id = Number(req.params.id);
        const { start, end } = req.query as any;
        const where: any = { clientId: id };
        if (start && end) where.date = { gte: new Date(String(start)), lte: new Date(String(end)) };
        const credits = await prisma.clientCredit.findMany({ where, orderBy: { date: 'desc' }, include: { fuelType: true } });
        res.json(credits);
    });

    router.get('/:id/ledger', async (req, res) => {
        const id = Number(req.params.id);
        const entries = await prisma.ledgerEntry.findMany({ where: { clientId: id }, orderBy: { createdAt: 'desc' } });
        res.json(entries);
    });

    router.post('/:id/payment', async (req, res) => {
        const id = Number(req.params.id);
        const { amount, memo } = req.body ?? {};
        const result = await prisma.$transaction(async (tx) => {
            const client = await tx.client.update({
                where: { id },
                data: { balance: { decrement: amount } },
            });
            await tx.ledgerEntry.create({ data: { clientId: id, amount: -Math.abs(amount), memo: memo ?? 'Payment' } });
            return client;
        });
        res.json(result);
    });

    return router;
}


