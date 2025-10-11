import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

export function createPricesRouter(prisma: PrismaClient) {
    const router = Router();

    router.get('/', async (_req, res) => {
        const prices = await prisma.price.findMany({ include: { fuelType: true }, orderBy: { createdAt: 'desc' } });
        res.json(prices);
    });

    // Current active prices for all fuel types
    router.get('/current', async (_req, res) => {
        const fuelTypes = await prisma.fuelType.findMany();
        const prices = await Promise.all(
            fuelTypes.map(async (ft) => {
                const price = await prisma.price.findFirst({
                    where: { fuelTypeId: ft.id, active: true },
                    orderBy: { createdAt: 'desc' }
                });
                return {
                    fuelTypeId: ft.id,
                    name: ft.name,
                    price: price ? Number(price.perLitre) : null,
                    updatedAt: price?.createdAt || null
                };
            })
        );

        const result = prices.reduce((acc, { name, price, updatedAt }) => {
            const key = name.toLowerCase().replace(/\s+/g, '');
            acc[key] = price;
            if (updatedAt && (!acc.updatedAt || updatedAt > acc.updatedAt)) {
                acc.updatedAt = updatedAt;
            }
            return acc;
        }, { updatedAt: null });

        res.json(result);
    });

    router.post('/', async (req, res) => {
        const { fuelTypeId, perLitre } = req.body ?? {};
        // Deactivate current active price for this fuel type, then create new
        await prisma.$transaction(async (tx) => {
            await tx.price.updateMany({ where: { fuelTypeId, active: true }, data: { active: false } });
            await tx.price.create({ data: { fuelTypeId, perLitre, active: true } });
        });
        res.status(201).json({ ok: true });
    });

    // Set prices for all fuel types together; snapshots all with same timestamp
    router.post('/set', async (req, res) => {
        const { prices, date } = req.body ?? {} as { prices?: Record<string, number>; date?: string };

        if (!prices || typeof prices !== 'object') {
            return res.status(400).json({ message: 'prices object is required' });
        }

        const fuelTypes = await prisma.fuelType.findMany();
        const fuelTypeMap = new Map(fuelTypes.map(ft => [ft.name.toLowerCase().replace(/\s+/g, ''), ft]));

        // Validate all fuel types have prices
        const missingTypes = fuelTypes.filter(ft => {
            const key = ft.name.toLowerCase().replace(/\s+/g, '');
            return !(key in prices) || isNaN(Number(prices[key]));
        });

        if (missingTypes.length > 0) {
            return res.status(400).json({
                message: `Missing or invalid prices for: ${missingTypes.map(ft => ft.name).join(', ')}`
            });
        }

        let createdAt = date ? new Date(date) : new Date();

        // Ensure unique timestamp when user supplies a date
        if (date) {
            for (let i = 0; i < 60; i++) {
                const existing = await prisma.price.findFirst({ where: { createdAt }, select: { id: true } });
                if (!existing) break;
                createdAt = new Date(createdAt.getTime() + 1000);
            }
        }

        const result = await prisma.$transaction(async (tx) => {
            // Deactivate current for all fuel types
            await tx.price.updateMany({
                where: { fuelTypeId: { in: fuelTypes.map(ft => ft.id) }, active: true },
                data: { active: false }
            });

            // Create new prices for all fuel types
            const newPrices = await Promise.all(
                fuelTypes.map(async (ft) => {
                    const key = ft.name.toLowerCase().replace(/\s+/g, '');
                    return await tx.price.create({
                        data: {
                            fuelTypeId: ft.id,
                            perLitre: Number(prices[key]),
                            active: true,
                            createdAt
                        }
                    });
                })
            );

            return newPrices;
        });

        res.status(201).json(result);
    });

    // Combined history: all fuel types, date (group by createdAt timestamp)
    router.get('/combined', async (_req, res) => {
        const fuelTypes = await prisma.fuelType.findMany();
        if (fuelTypes.length === 0) return res.json([]);

        const prices = await prisma.price.findMany({
            where: { fuelTypeId: { in: fuelTypes.map(ft => ft.id) } },
            orderBy: { createdAt: 'desc' },
            take: 200,
        });

        const byTs = new Map<string, Record<string, any>>();
        for (const p of prices) {
            const ts = p.createdAt.toISOString();
            const row = byTs.get(ts) ?? { date: ts };
            const fuelType = fuelTypes.find(ft => ft.id === p.fuelTypeId);
            if (fuelType) {
                const key = fuelType.name.toLowerCase().replace(/\s+/g, '');
                row[key] = Number(p.perLitre);
            }
            byTs.set(ts, row);
        }

        const rows = Array.from(byTs.entries())
            .map(([_, v]) => v)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        res.json(rows);
    });

    return router;
}


