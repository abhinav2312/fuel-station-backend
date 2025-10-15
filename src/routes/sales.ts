import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { TankValidator } from '../utils/tank-validations';

export function createSalesRouter(prisma: PrismaClient, tankValidator: TankValidator) {
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

        // Validate tank capacity before proceeding
        const validation = await tankValidator.validateSale(tankId, Number(litres));
        if (!validation.isValid) {
            return res.status(400).json({
                message: 'Sale validation failed',
                error: validation.error,
                details: {
                    availableFuel: validation.availableFuel,
                    currentLevel: validation.currentLevel,
                    capacity: validation.capacity
                }
            });
        }

        const result = await prisma.$transaction(async (tx) => {
            const tank = await tx.tank.findUnique({ where: { id: tankId }, include: { fuelType: true } });
            if (!tank) throw new Error('Tank not found');

            // Double-check capacity (in case of race conditions)
            if (Number(tank.currentLevel) < Number(litres)) {
                throw new Error(`Insufficient fuel in tank. Available: ${tank.currentLevel}L, trying to sell: ${litres}L`);
            }

            const price = await tx.price.findFirst({ where: { fuelTypeId: tank.fuelTypeId, isActive: true }, orderBy: { createdAt: 'desc' } });
            if (!price) throw new Error('No active price');

            const totalAmount = Number(litres) * Number(price.perLitre);

            if (method === 'CREDIT') {
                if (!clientId) throw new Error('clientId required for credit');
                const client = await tx.client.findUnique({ where: { id: clientId } });
                if (!client) throw new Error('Client not found');
                const newBalance = Number(client.balance) + totalAmount;
                if (newBalance > Number(client.creditLimit)) throw new Error('Credit limit exceeded');
                await tx.client.update({ where: { id: client.id }, data: { balance: newBalance } });
                // Note: ledgerEntry model doesn't exist, using ClientCredit instead
                await tx.clientCredit.create({
                    data: {
                        clientId: client.id,
                        fuelTypeId: tank.fuelTypeId,
                        litres: 0,
                        pricePerLitre: price.perLitre,
                        totalAmount: totalAmount,
                        status: 'unpaid',
                        date: new Date()
                    }
                });
            }

            // Use tank.avgUnitCost as cost basis
            const costPerLitre = Number(tank.avgUnitCost) || 0;
            const profit = totalAmount - costPerLitre * Number(litres);

            await tx.tank.update({ where: { id: tank.id }, data: { currentLevel: Number(tank.currentLevel) - Number(litres) } });

            const sale = await tx.sale.create({
                data: {
                    litres,
                    pricePerLitre: price.perLitre,
                    totalAmount,
                    costPerLitre,
                    profit,
                    paymentMethod: method,
                    pumpId: 1, // Default pump ID - you may need to adjust this
                    fuelTypeId: tank.fuelTypeId,
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


