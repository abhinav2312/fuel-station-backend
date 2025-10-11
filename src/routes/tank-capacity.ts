import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { backendLogger } from '../utils/logger';

const router = Router();

// Update tank capacities safely
router.post('/update-capacity', async (req, res) => {
    try {
        const { updates } = req.body;

        if (!updates || !Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({ error: 'Updates array is required' });
        }

        backendLogger.info('Starting tank capacity updates', { updateCount: updates.length });

        const results = [];

        for (const update of updates) {
            const { tankId, newCapacity, reason } = update;

            if (!tankId || !newCapacity || newCapacity <= 0) {
                backendLogger.warn('Invalid capacity update', { update });
                continue;
            }

            // Get current tank data
            const currentTank = await prisma.tank.findUnique({
                where: { id: tankId },
                include: { fuelType: true }
            });

            if (!currentTank) {
                backendLogger.warn('Tank not found for capacity update', { tankId });
                continue;
            }

            // Validate the update
            if (newCapacity < currentTank.currentLevel) {
                backendLogger.warn('New capacity is less than current level', {
                    tankId,
                    currentLevel: currentTank.currentLevel,
                    newCapacity
                });
            }

            // Calculate new percentage
            const newPercentage = Math.min((currentTank.currentLevel / newCapacity) * 100, 100);

            // Create audit log before update
            await prisma.auditLog.create({
                data: {
                    action: 'TANK_CAPACITY_UPDATE',
                    entityType: 'Tank',
                    entityId: tankId,
                    oldValues: JSON.stringify({
                        capacity: currentTank.capacityLit,
                        level: currentTank.currentLevel,
                        percentage: (currentTank.currentLevel / currentTank.capacityLit) * 100
                    }),
                    newValues: JSON.stringify({
                        capacity: newCapacity,
                        level: currentTank.currentLevel,
                        percentage: newPercentage
                    },
                        reason: reason || 'Capacity update',
                        timestamp: new Date()
                }
            });

            // Update the tank capacity
            const updatedTank = await prisma.tank.update({
                where: { id: tankId },
                data: {
                    capacityLit: newCapacity
                },
                include: { fuelType: true }
            });

            backendLogger.info('Tank capacity updated successfully', {
                tankId,
                tankName: updatedTank.name,
                oldCapacity: currentTank.capacityLit,
                newCapacity: updatedTank.capacityLit,
                currentLevel: updatedTank.currentLevel,
                newPercentage
            });

            results.push({
                tankId,
                tankName: updatedTank.name,
                fuelType: updatedTank.fuelType.name,
                oldCapacity: currentTank.capacityLit,
                newCapacity: updatedTank.capacityLit,
                currentLevel: updatedTank.currentLevel,
                oldPercentage: (currentTank.currentLevel / currentTank.capacityLit) * 100,
                newPercentage,
                reason
            });
        }

        backendLogger.info('All tank capacity updates completed', {
            successCount: results.length,
            totalUpdates: updates.length
        });

        res.json({
            success: true,
            message: `Successfully updated ${results.length} tank capacities`,
            results,
            summary: {
                totalUpdated: results.length,
                totalRequested: updates.length
            }
        });

    } catch (error) {
        backendLogger.error('Failed to update tank capacities', { error });
        res.status(500).json({
            error: 'Failed to update tank capacities',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Get capacity update history
router.get('/history', async (req, res) => {
    try {
        const { tankId, limit = 50 } = req.query;

        const whereClause = {
            action: 'TANK_CAPACITY_UPDATE',
            ...(tankId && { entityId: Number(tankId) })
        };

        const history = await prisma.auditLog.findMany({
            where: whereClause,
            orderBy: { timestamp: 'desc' },
            take: Number(limit)
        });

        res.json({
            history,
            count: history.length
        });

    } catch (error) {
        backendLogger.error('Failed to get capacity update history', { error });
        res.status(500).json({
            error: 'Failed to get capacity update history',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Get tank capacity statistics
router.get('/stats', async (req, res) => {
    try {
        const tanks = await prisma.tank.findMany({
            include: { fuelType: true }
        });

        const stats = tanks.map(tank => {
            const percentage = (tank.currentLevel / tank.capacityLit) * 100;
            return {
                id: tank.id,
                name: tank.name,
                fuelType: tank.fuelType.name,
                currentLevel: tank.currentLevel,
                capacity: tank.capacityLit,
                percentage: Math.round(percentage * 100) / 100,
                availableCapacity: tank.capacityLit - tank.currentLevel,
                status: percentage > 90 ? 'high' : percentage > 70 ? 'medium' : 'low'
            };
        });

        const totalCapacity = tanks.reduce((sum, tank) => sum + tank.capacityLit, 0);
        const totalCurrentLevel = tanks.reduce((sum, tank) => sum + tank.currentLevel, 0);
        const overallPercentage = (totalCurrentLevel / totalCapacity) * 100;

        res.json({
            tanks: stats,
            summary: {
                totalTanks: tanks.length,
                totalCapacity,
                totalCurrentLevel,
                overallPercentage: Math.round(overallPercentage * 100) / 100,
                highLevelTanks: stats.filter(t => t.status === 'high').length,
                mediumLevelTanks: stats.filter(t => t.status === 'medium').length,
                lowLevelTanks: stats.filter(t => t.status === 'low').length
            }
        });

    } catch (error) {
        backendLogger.error('Failed to get tank capacity statistics', { error });
        res.status(500).json({
            error: 'Failed to get tank capacity statistics',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
