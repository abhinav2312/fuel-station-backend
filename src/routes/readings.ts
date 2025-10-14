import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

export function createReadingsRouter(prisma: PrismaClient) {
    const router = Router();

    // Fetch readings for a given date (YYYY-MM-DD)
    router.get('/', async (req, res) => {
        const dateStr = String(req.query.date);
        if (!dateStr) return res.status(400).json({ message: 'date query param required (YYYY-MM-DD)' });
        const { start, end } = dayRange(dateStr);
        const readings = await prisma.dailyReading.findMany({
            where: { date: { gte: start, lte: end } },
            include: { pump: { include: { fuelType: true } } },
            orderBy: { pumpId: 'asc' },
        });
        res.json(readings);
    });

    // Upsert a reading for pump/date
    router.post('/', async (req, res) => {
        const { pumpId, date, openingLitres, closingLitres, pricePerLitre } = req.body ?? {};
        if (!pumpId || !date) return res.status(400).json({ message: 'pumpId and date are required' });
        const dateKey = new Date(date);
        let price = pricePerLitre;
        if (price === undefined || price === null) {
            // auto-fill from current active price for the pump's fuel type
            const pump = await prisma.pump.findUnique({ where: { id: Number(pumpId) } });
            if (!pump) return res.status(404).json({ message: 'Pump not found' });
            const active = await prisma.price.findFirst({ where: { fuelTypeId: pump.fuelTypeId, isActive: true }, orderBy: { createdAt: 'desc' } });
            price = Number(active?.perLitre ?? 0);
        }
        const result = await prisma.dailyReading.upsert({
            where: { pumpId_date: { pumpId, date: dateKey } },
            update: { openingLitres, closingLitres, pricePerLitre: price },
            create: { pumpId, date: dateKey, openingLitres, closingLitres, pricePerLitre: price },
        });
        res.status(201).json(result);
    });

    // Bulk upsert readings for multiple pumps
    router.post('/bulk', async (req, res) => {
        console.log('Bulk readings endpoint hit');
        console.log('Request body:', req.body);

        const { readings } = req.body ?? {};
        console.log('Extracted readings:', readings);

        if (!Array.isArray(readings) || readings.length === 0) {
            console.log('Invalid readings array');
            return res.status(400).json({ message: 'readings array is required' });
        }

        try {
            console.log('Received readings:', readings);

            // Validate each reading
            for (const reading of readings) {
                console.log('Validating reading:', reading);
                if (!reading.pumpId || !reading.date ||
                    reading.openingLitres === undefined || reading.openingLitres === null ||
                    reading.closingLitres === undefined || reading.closingLitres === null) {
                    console.log('Invalid reading data:', reading);
                    return res.status(400).json({
                        message: 'Invalid reading data',
                        reading: reading,
                        required: ['pumpId', 'date', 'openingLitres', 'closingLitres']
                    });
                }
            }

            // Try to find existing readings first
            const existingReadings = await prisma.dailyReading.findMany({
                where: {
                    pumpId: { in: readings.map(r => Number(r.pumpId)) },
                    date: {
                        gte: new Date(readings[0].date),
                        lt: new Date(new Date(readings[0].date).getTime() + 24 * 60 * 60 * 1000)
                    }
                }
            });

            console.log('Existing readings:', existingReadings);

            const results = await Promise.all(
                readings.map(async ({ pumpId, date, openingLitres, closingLitres, pricePerLitre }) => {
                    const dateKey = new Date(date);
                    console.log(`Processing reading for pump ${pumpId}, date ${dateKey}`);

                    try {
                        // First try to find existing reading
                        const existing = await prisma.dailyReading.findFirst({
                            where: {
                                pumpId: Number(pumpId),
                                date: dateKey
                            }
                        });

                        // Calculate revenue: (opening - closing) * pricePerLitre
                        const soldLitres = Number(openingLitres) - Number(closingLitres);
                        const revenue = soldLitres * Number(pricePerLitre);

                        if (existing) {
                            // Update existing reading
                            return await prisma.dailyReading.update({
                                where: { id: existing.id },
                                data: {
                                    openingLitres: Number(openingLitres),
                                    closingLitres: Number(closingLitres),
                                    pricePerLitre: Number(pricePerLitre),
                                    revenue: revenue
                                }
                            });
                        } else {
                            // Create new reading
                            return await prisma.dailyReading.create({
                                data: {
                                    pumpId: Number(pumpId),
                                    date: dateKey,
                                    openingLitres: Number(openingLitres),
                                    closingLitres: Number(closingLitres),
                                    pricePerLitre: Number(pricePerLitre),
                                    revenue: revenue
                                }
                            });
                        }
                    } catch (upsertError: any) {
                        console.error(`Error saving reading for pump ${pumpId}:`, upsertError);
                        throw upsertError;
                    }
                })
            );

            console.log('Successfully saved readings:', results);
            res.status(201).json({ message: 'All readings saved successfully', count: results.length });
        } catch (error: any) {
            console.error('Error saving bulk readings:', error);
            console.error('Error details:', error);
            console.error('Error stack:', error?.stack);
            res.status(500).json({
                message: 'Error saving readings',
                error: error?.message || 'Unknown error',
                code: error?.code,
                meta: error?.meta
            });
        }
    });

    // Helper to compute revenue/profit for a date across pumps
    router.get('/summary', async (req, res) => {
        const dateStr = String(req.query.date);
        if (!dateStr) return res.status(400).json({ message: 'date query param required (YYYY-MM-DD)' });
        const { start, end } = dayRange(dateStr);
        const readings = await prisma.dailyReading.findMany({ where: { date: { gte: start, lte: end } }, include: { pump: true } });
        let litres = 0, revenue = 0;
        for (const r of readings) {
            const sold = Number(r.openingLitres) - Number(r.closingLitres); // opening - closing = sold
            litres += sold;
            revenue += sold * Number(r.pricePerLitre);
        }
        res.json({ date: dateStr, litres, revenue, profit: revenue });
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


