import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

export function createPurchasesRouter(prisma: PrismaClient) {
    const router = Router();

    router.get('/', async (_req, res) => {
        const purchases = await prisma.purchase.findMany({ include: { tank: { include: { fuelType: true } } }, orderBy: { id: 'desc' } });
        res.json(purchases);
    });

    router.post('/', async (req, res) => {
        try {
            const { tankId, litres, unitCost, date } = req.body ?? {};
            if (!tankId || !litres || !unitCost) return res.status(400).json({ message: 'tankId, litres, unitCost required' });

            console.log('Purchase request:', { tankId, litres, unitCost, date });

            // Get tank first
            const tank = await prisma.tank.findUnique({ where: { id: tankId } });
            if (!tank) {
                console.error('❌ Tank not found:', tankId);
                return res.status(404).json({ message: 'Tank not found' });
            }

            // Create purchase record (without updating tank levels yet)
            console.log('💾 Creating purchase record...');
            const purchase = await prisma.purchase.create({
                data: {
                    tankId,
                    litres,
                    unitCost,
                    totalCost: Number(unitCost) * Number(litres),
                    date: date ? new Date(date) : new Date(),
                    status: 'pending' // Mark as pending until unloaded
                },
            });
            console.log('✅ Purchase record created:', purchase.id);

            console.log('🎉 Purchase recorded successfully! Tank will be updated when marked as unloaded.');
            res.status(201).json(purchase);
        } catch (error: any) {
            console.error('❌ Purchase failed:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            res.status(500).json({
                error: 'Purchase failed',
                message: error.message,
                details: 'Check server logs for more information'
            });
        }
    });

    router.put('/:id/unload', async (req, res) => {
        try {
            const { id } = req.params;
            const purchaseId = parseInt(id);

            // Get the purchase record
            const purchase = await prisma.purchase.findUnique({
                where: { id: purchaseId },
                include: { tank: true }
            });

            if (!purchase) {
                return res.status(404).json({ message: 'Purchase not found' });
            }

            if (purchase.status === 'unloaded') {
                return res.status(400).json({ message: 'Purchase already marked as unloaded' });
            }

            // Get tank data
            const tank = purchase.tank;
            const newLevel = Number(tank.currentLevel) + Number(purchase.litres);

            // Check if tank has enough capacity
            if (newLevel > Number(tank.capacityLit)) {
                const errorMsg = `Cannot unload ${purchase.litres}L to tank. Tank capacity is ${tank.capacityLit}L and current level is ${tank.currentLevel}L. Maximum that can be added is ${Number(tank.capacityLit) - Number(tank.currentLevel)}L`;
                return res.status(400).json({ message: errorMsg });
            }

            // Calculate new average unit cost
            const totalExistingCost = Number(tank.avgUnitCost) * Number(tank.currentLevel);
            const totalNewCost = Number(purchase.unitCost) * Number(purchase.litres);
            const avgUnitCost = (totalExistingCost + totalNewCost) / (Number(tank.currentLevel) + Number(purchase.litres));

            // Update purchase status and tank level
            await prisma.$transaction(async (tx) => {
                // Update purchase status
                await tx.purchase.update({
                    where: { id: purchaseId },
                    data: { status: 'unloaded' }
                });

                // Update tank level
                await tx.tank.update({
                    where: { id: tank.id },
                    data: {
                        currentLevel: newLevel,
                        avgUnitCost: avgUnitCost
                    }
                });
            });

            console.log('✅ Purchase marked as unloaded and tank updated:', {
                purchaseId,
                tankName: tank.name,
                oldLevel: tank.currentLevel,
                newLevel,
                addedLitres: purchase.litres
            });

            res.json({
                message: 'Purchase marked as unloaded and tank updated successfully',
                purchaseId,
                tankName: tank.name,
                newLevel,
                addedLitres: purchase.litres
            });
        } catch (error: any) {
            console.error('Error marking purchase as unloaded:', error);
            res.status(500).json({ error: error.message });
        }
    });

    router.delete('/cleanup', async (_req, res) => {
        try {
            // Delete all purchase records with 0 litres (price-setting records)
            const result = await prisma.purchase.deleteMany({
                where: {
                    litres: 0
                }
            });

            console.log(`🧹 Cleaned up ${result.count} price-setting records`);
            res.json({ message: `Cleaned up ${result.count} records`, count: result.count });
        } catch (error: any) {
            console.error('Error cleaning up purchases:', error);
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}
