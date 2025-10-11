import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

export function createSalesRouter(prisma: PrismaClient) {
    const router = Router();

    router.get('/', async (_req, res) => {
        const sales = await prisma.sale.findMany({ orderBy: { id: 'desc' }, take: 100 });
        res.json(sales);
    });

    router.post('/', async (req, res) => {
        const { tankId, litres, method, clientId, note } = req.body ?? {};

        if (!tankId || !litres || litres <= 0) {
            return res.status(400).json({ message: 'tankId and litres are required' });
        }

        const result = await prisma.$transaction(async (tx) => {
            const tank = await tx.tank.findUnique({ where: { id: tankId }, include: { fuelType: true } });
            if (!tank) throw new Error('Tank not found');
            if (Number(tank.currentLevel) < Number(litres)) throw new Error('Insufficient stock');

            const price = await tx.price.findFirst({ where: { fuelTypeId: tank.fuelTypeId, active: true }, orderBy: { createdAt: 'desc' } });
            if (!price) throw new Error('No active price');

            const totalAmount = Number(litres) * Number(price.perLitre);

            if (method === 'CREDIT') {
                if (!clientId) throw new Error('clientId required for credit');
                const client = await tx.client.findUnique({ where: { id: clientId } });
                if (!client) throw new Error('Client not found');
                const newBalance = Number(client.balance) + totalAmount;
                if (newBalance > Number(client.creditLimit)) throw new Error('Credit limit exceeded');
                await tx.client.update({ where: { id: client.id }, data: { balance: newBalance } });
                await tx.ledgerEntry.create({ data: { clientId: client.id, amount: totalAmount, memo: 'Fuel on credit' } });
            }

            // Use tank.avgUnitCost as cost basis
            const costPerLitre = Number(tank.avgUnitCost) || 0;
            const profit = totalAmount - costPerLitre * Number(litres);

            await tx.tank.update({ where: { id: tank.id }, data: { currentLevel: Number(tank.currentLevel) - Number(litres) } });

            const sale = await tx.sale.create({
                data: {
                    tankId: tank.id,
                    litres,
                    pricePerLitre: price.perLitre,
                    totalAmount,
                    costPerLitre,
                    profit,
                    method,
                    clientId: clientId ?? null,
                    note: note ?? null,
                },
            });

            return sale;
        });

        res.status(201).json(result);
    });

    return router;
}


