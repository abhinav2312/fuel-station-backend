import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

export function createPurchasesRouter(prisma: PrismaClient) {
    const router = Router();

    router.get('/', async (_req, res) => {
        const purchases = await prisma.purchase.findMany({ include: { tank: { include: { fuelType: true } } }, orderBy: { id: 'desc' } });
        res.json(purchases);
    });

    router.post('/', async (req, res) => {
        const { tankId, litres, unitCost, date } = req.body ?? {};
        if (!tankId || !litres || !unitCost) return res.status(400).json({ message: 'tankId, litres, unitCost required' });

        const result = await prisma.$transaction(async (tx) => {
            const tank = await tx.tank.findUnique({ where: { id: tankId } });
            if (!tank) throw new Error('Tank not found');
            const newLevel = Number(tank.currentLevel) + Number(litres);
            const totalExistingCost = Number(tank.avgUnitCost) * Number(tank.currentLevel);
            const totalNewCost = Number(unitCost) * Number(litres);
            const avgUnitCost = (totalExistingCost + totalNewCost) / (Number(tank.currentLevel) + Number(litres));

            const purchase = await tx.purchase.create({
                data: {
                    tankId,
                    litres,
                    unitCost,
                    totalCost: Number(unitCost) * Number(litres),
                    date: date ? new Date(date) : new Date()
                },
            });

            await tx.tank.update({ where: { id: tank.id }, data: { currentLevel: newLevel, avgUnitCost } });

            return purchase;
        });

        res.status(201).json(result);
    });

    return router;
}


