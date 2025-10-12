import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

export function createTanksRouter(prisma: PrismaClient) {
    const router = Router();


    router.get('/', async (_req, res) => {
        const tanks = await prisma.tank.findMany({
            include: {
                fuelType: {
                    select: { name: true, id: true }
                }
            },
            orderBy: { id: 'asc' },
        });

        // Get current active prices for all fuel types
        const fuelTypes = await prisma.fuelType.findMany();
        const currentPrices = await Promise.all(
            fuelTypes.map(async (ft) => {
                const price = await prisma.price.findFirst({
                    where: { fuelTypeId: ft.id, active: true },
                    orderBy: { createdAt: 'desc' }
                });
                return {
                    fuelTypeId: ft.id,
                    price: price ? Number(price.perLitre) : 0
                };
            })
        );

        // Create a price lookup map
        const priceMap = currentPrices.reduce((acc, { fuelTypeId, price }) => {
            acc[fuelTypeId] = price;
            return acc;
        }, {} as Record<number, number>);

        // Add current price to each tank's fuel type
        const tanksWithPrices = tanks.map(tank => ({
            ...tank,
            fuelType: {
                ...tank.fuelType,
                price: priceMap[tank.fuelTypeId] || 0
            }
        }));

        res.json(tanksWithPrices);
    });

    router.post('/', async (req, res) => {
        const { name, capacityLit, fuelTypeId, currentLevel } = req.body ?? {};
        const tank = await prisma.tank.create({
            data: { name, capacityLit, fuelTypeId, currentLevel: currentLevel ?? 0 },
        });
        res.status(201).json(tank);
    });

    router.patch('/:id', async (req, res) => {
        const id = Number(req.params.id);
        const { name, capacityLit, currentLevel } = req.body ?? {};
        const tank = await prisma.tank.update({
            where: { id },
            data: { name, capacityLit, currentLevel },
        });
        res.json(tank);
    });

    router.put('/:id', async (req, res) => {
        try {
            const id = Number(req.params.id);
            const { currentLevel, capacityLit } = req.body ?? {};

            // Build update data object - only include fields that are actually provided and valid
            const updateData: any = {};

            // Only validate and include currentLevel if it's provided and not empty
            if (currentLevel !== undefined && currentLevel !== null && currentLevel !== '') {
                const level = parseFloat(currentLevel);
                if (isNaN(level) || level < 0) {
                    return res.status(400).json({ message: 'Current level must be a positive number' });
                }
                updateData.currentLevel = level;
            }

            // Only validate and include capacityLit if it's provided and not empty
            if (capacityLit !== undefined && capacityLit !== null && capacityLit !== '') {
                const capacity = parseFloat(capacityLit);
                if (isNaN(capacity) || capacity <= 0) {
                    return res.status(400).json({ message: 'Capacity must be a positive number' });
                }
                updateData.capacityLit = capacity;
            }

            if (Object.keys(updateData).length === 0) {
                return res.status(400).json({ message: 'No valid fields to update' });
            }

            const tank = await prisma.tank.update({
                where: { id },
                data: updateData,
                include: { fuelType: { select: { name: true } } }
            });

            res.json(tank);
        } catch (error: any) {
            console.error('Error updating tank:', error);
            res.status(500).json({
                message: 'Failed to update tank',
                error: error.message
            });
        }
    });

    return router;
}


