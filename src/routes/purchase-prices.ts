import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

export function createPurchasePricesRouter(prisma: PrismaClient) {
    const router = Router();

    // Get current purchase prices
    router.get('/', async (req, res) => {
        try {
            const prices = await prisma.purchasePrice.findMany({
                include: { tank: { include: { fuelType: true } } },
                orderBy: { createdAt: 'desc' }
            });

            // Get the latest price for each tank
            const latestPrices: Record<number, number> = {};
            prices.forEach(price => {
                if (!latestPrices[price.tankId]) {
                    latestPrices[price.tankId] = Number(price.price);
                }
            });

            res.json(latestPrices);
        } catch (error) {
            console.error('Error fetching purchase prices:', error);
            res.status(500).json({ message: 'Failed to fetch purchase prices' });
        }
    });

    // Save purchase prices
    router.post('/', async (req, res) => {
        try {
            const prices = req.body as Record<number, number>;

            if (!prices || Object.keys(prices).length === 0) {
                return res.status(400).json({ message: 'Prices data required' });
            }

            // Create new price entries for each tank
            const priceEntries = Object.entries(prices).map(([tankId, price]) => ({
                tankId: Number(tankId),
                price: Number(price)
            }));

            await prisma.purchasePrice.createMany({
                data: priceEntries
            });

            res.json({ message: 'Purchase prices saved successfully' });
        } catch (error) {
            console.error('Error saving purchase prices:', error);
            res.status(500).json({ message: 'Failed to save purchase prices' });
        }
    });

    return router;
}
