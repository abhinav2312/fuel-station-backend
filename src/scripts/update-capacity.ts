/**
 * Safe Tank Capacity Update Script
 * Updates tank capacities without data loss
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CapacityUpdate {
    tankId: number;
    newCapacity: number;
    reason?: string;
}

async function updateTankCapacity(updates: CapacityUpdate[]) {
    console.log('🛢️ Starting safe tank capacity update...');

    try {
        for (const update of updates) {
            console.log(`\n📊 Updating Tank ID: ${update.tankId}`);

            // 1. Get current tank data
            const currentTank = await prisma.tank.findUnique({
                where: { id: update.tankId },
                include: {
                    fuelType: true
                }
            });

            if (!currentTank) {
                console.log(`❌ Tank with ID ${update.tankId} not found`);
                continue;
            }

            console.log(`   Current: ${currentTank.name}`);
            console.log(`   Old Capacity: ${currentTank.capacityLit}L`);
            console.log(`   Current Level: ${currentTank.currentLevel}L`);
            console.log(`   New Capacity: ${update.newCapacity}L`);

            // 2. Validate the update
            if (update.newCapacity < currentTank.currentLevel) {
                console.log(`⚠️  WARNING: New capacity (${update.newCapacity}L) is less than current level (${currentTank.currentLevel}L)`);
                console.log(`   This will result in 100% tank level. Consider this carefully.`);
            }

            // 3. Calculate new percentage
            const newPercentage = Math.min((currentTank.currentLevel / update.newCapacity) * 100, 100);

            console.log(`   New Level Percentage: ${newPercentage.toFixed(2)}%`);

            // 4. Create backup record
            const backupRecord = {
                tankId: currentTank.id,
                oldCapacity: currentTank.capacityLit,
                newCapacity: update.newCapacity,
                currentLevel: currentTank.currentLevel,
                oldPercentage: (currentTank.currentLevel / currentTank.capacityLit) * 100,
                newPercentage: newPercentage,
                reason: update.reason || 'Capacity update',
                updatedAt: new Date()
            };

            // 5. Update the tank capacity
            const updatedTank = await prisma.tank.update({
                where: { id: update.tankId },
                data: {
                    capacityLit: update.newCapacity,
                    // Keep current level the same, only capacity changes
                }
            });

            // 6. Log the change
            console.log(`✅ Tank updated successfully`);
            console.log(`   New capacity: ${updatedTank.capacityLit}L`);
            console.log(`   Current level: ${updatedTank.currentLevel}L`);
            console.log(`   Level percentage: ${newPercentage.toFixed(2)}%`);

            // 7. Create audit log (if you have an audit table)
            try {
                await prisma.auditLog.create({
                    data: {
                        action: 'TANK_CAPACITY_UPDATE',
                        entityType: 'Tank',
                        entityId: update.tankId,
                        oldValues: JSON.stringify({
                            capacity: currentTank.capacityLit,
                            level: currentTank.currentLevel,
                            percentage: (currentTank.currentLevel / currentTank.capacityLit) * 100
                        }),
                        newValues: JSON.stringify({
                            capacity: update.newCapacity,
                            level: currentTank.currentLevel,
                            percentage: newPercentage
                        }),
                        reason: update.reason || 'Capacity update',
                        timestamp: new Date()
                    }
                });
            } catch (auditError) {
                console.log(`⚠️  Could not create audit log: ${auditError}`);
            }
        }

        console.log('\n🎉 All tank capacities updated successfully!');
        console.log('\n📋 Summary of changes:');

        // Show final status
        const allTanks = await prisma.tank.findMany({
            include: { fuelType: true }
        });

        for (const tank of allTanks) {
            const percentage = (tank.currentLevel / tank.capacityLit) * 100;
            console.log(`   ${tank.name}: ${tank.currentLevel}L / ${tank.capacityLit}L (${percentage.toFixed(1)}%)`);
        }

    } catch (error) {
        console.error('❌ Error updating tank capacities:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Example usage function
async function exampleCapacityUpdates() {
    console.log('📝 Example: Updating tank capacities...\n');

    // Example updates - modify these for your actual needs
    const updates: CapacityUpdate[] = [
        {
            tankId: 1, // Petrol Storage Tank 1
            newCapacity: 25000, // Increase from 20,000L to 25,000L
            reason: 'Tank expansion completed'
        },
        {
            tankId: 2, // Petrol Storage Tank 2
            newCapacity: 18000, // Increase from 15,000L to 18,000L
            reason: 'Tank upgrade'
        },
        {
            tankId: 4, // Diesel Storage Tank 1
            newCapacity: 30000, // Increase from 25,000L to 30,000L
            reason: 'New larger tank installed'
        }
    ];

    await updateTankCapacity(updates);
}

// Interactive capacity update
async function interactiveCapacityUpdate() {
    console.log('🛢️ Interactive Tank Capacity Update');
    console.log('==================================\n');

    // Get all tanks
    const tanks = await prisma.tank.findMany({
        include: { fuelType: true }
    });

    console.log('Current tank status:');
    tanks.forEach((tank, index) => {
        const percentage = (tank.currentLevel / tank.capacityLit) * 100;
        console.log(`${index + 1}. ${tank.name} (${tank.fuelType.name})`);
        console.log(`   Current: ${tank.currentLevel}L / ${tank.capacityLit}L (${percentage.toFixed(1)}%)`);
    });

    console.log('\nTo update capacities, modify the script with your specific tank IDs and new capacities.');
    console.log('Example:');
    console.log('const updates = [');
    console.log('  { tankId: 1, newCapacity: 25000, reason: "Tank expansion" },');
    console.log('  { tankId: 2, newCapacity: 18000, reason: "Tank upgrade" }');
    console.log('];');
    console.log('await updateTankCapacity(updates);');
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
    const command = process.argv[2];

    switch (command) {
        case 'example':
            exampleCapacityUpdates();
            break;
        case 'interactive':
            interactiveCapacityUpdate();
            break;
        default:
            console.log('Usage:');
            console.log('  npm run update-capacity example     - Run example updates');
            console.log('  npm run update-capacity interactive - Show current status');
            console.log('');
            console.log('To update specific tanks, modify the script with your requirements.');
    }
}

export { updateTankCapacity, CapacityUpdate };
