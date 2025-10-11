import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

export function createPumpsRouter(prisma: PrismaClient) {
    const router = Router();

    router.get('/', async (_req, res) => {
        const pumps = await prisma.pump.findMany({
            include: { fuelType: true },
            orderBy: [
                { fuelType: { name: 'asc' } },
                { name: 'asc' }
            ]
        });
        res.json(pumps);
    });

    router.post('/', async (req, res) => {
        const { name, fuelTypeId, isActive = true } = req.body ?? {};
        const pump = await prisma.pump.create({
            data: { name, fuelTypeId, isActive },
            include: { fuelType: true }
        });
        res.status(201).json(pump);
    });

    router.patch('/:id', async (req, res) => {
        const id = Number(req.params.id);
        const { name, isActive } = req.body ?? {};
        const pump = await prisma.pump.update({
            where: { id },
            data: { name, isActive },
            include: { fuelType: true }
        });
        res.json(pump);
    });

    return router;
}
