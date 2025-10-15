import { PrismaClient } from '@prisma/client';

export interface TankValidationResult {
    isValid: boolean;
    error?: string;
    availableCapacity?: number;
    currentLevel?: number;
    capacity?: number;
}

export interface SalesValidationResult extends TankValidationResult {
    canSell: boolean;
    availableFuel?: number;
}

export interface PurchaseValidationResult extends TankValidationResult {
    canUnload: boolean;
    availableSpace?: number;
}

export class TankValidator {
    constructor(private prisma: PrismaClient) { }

    /**
     * Validate if a sale can be made (check if tank has enough fuel)
     */
    async validateSale(tankId: number, litresToSell: number): Promise<SalesValidationResult> {
        try {
            const tank = await this.prisma.tank.findUnique({
                where: { id: tankId },
                include: { fuelType: true }
            });

            if (!tank) {
                return {
                    isValid: false,
                    canSell: false,
                    error: `Tank with ID ${tankId} not found`
                };
            }

            const currentLevel = Number(tank.currentLevel);
            const availableFuel = currentLevel;

            if (litresToSell <= 0) {
                return {
                    isValid: false,
                    canSell: false,
                    error: 'Litres to sell must be greater than 0'
                };
            }

            if (availableFuel < litresToSell) {
                return {
                    isValid: false,
                    canSell: false,
                    error: `Insufficient fuel in tank. Available: ${availableFuel}L, trying to sell: ${litresToSell}L`,
                    availableFuel,
                    currentLevel,
                    capacity: Number(tank.capacityLit)
                };
            }

            return {
                isValid: true,
                canSell: true,
                availableFuel,
                currentLevel,
                capacity: Number(tank.capacityLit)
            };

        } catch (error: any) {
            return {
                isValid: false,
                canSell: false,
                error: `Validation error: ${error.message}`
            };
        }
    }

    /**
     * Validate if a purchase can be unloaded (check if tank has enough space)
     */
    async validatePurchase(tankId: number, litresToUnload: number): Promise<PurchaseValidationResult> {
        try {
            const tank = await this.prisma.tank.findUnique({
                where: { id: tankId },
                include: { fuelType: true }
            });

            if (!tank) {
                return {
                    isValid: false,
                    canUnload: false,
                    error: `Tank with ID ${tankId} not found`
                };
            }

            const currentLevel = Number(tank.currentLevel);
            const capacity = Number(tank.capacityLit);
            const availableSpace = capacity - currentLevel;

            if (litresToUnload <= 0) {
                return {
                    isValid: false,
                    canUnload: false,
                    error: 'Litres to unload must be greater than 0'
                };
            }

            if (availableSpace < litresToUnload) {
                return {
                    isValid: false,
                    canUnload: false,
                    error: `Insufficient space in tank. Available space: ${availableSpace}L, trying to unload: ${litresToUnload}L. Tank capacity: ${capacity}L, current level: ${currentLevel}L`,
                    availableSpace,
                    currentLevel,
                    capacity
                };
            }

            return {
                isValid: true,
                canUnload: true,
                availableSpace,
                currentLevel,
                capacity
            };

        } catch (error: any) {
            return {
                isValid: false,
                canUnload: false,
                error: `Validation error: ${error.message}`
            };
        }
    }

    /**
     * Validate tank capacity update
     */
    async validateCapacityUpdate(tankId: number, newCapacity: number): Promise<TankValidationResult> {
        try {
            const tank = await this.prisma.tank.findUnique({
                where: { id: tankId }
            });

            if (!tank) {
                return {
                    isValid: false,
                    error: `Tank with ID ${tankId} not found`
                };
            }

            const currentLevel = Number(tank.currentLevel);

            if (newCapacity <= 0) {
                return {
                    isValid: false,
                    error: 'New capacity must be greater than 0'
                };
            }

            if (newCapacity < currentLevel) {
                return {
                    isValid: false,
                    error: `New capacity (${newCapacity}L) cannot be less than current level (${currentLevel}L). You must first reduce the current level.`,
                    currentLevel,
                    capacity: newCapacity
                };
            }

            return {
                isValid: true,
                currentLevel,
                capacity: newCapacity
            };

        } catch (error: any) {
            return {
                isValid: false,
                error: `Validation error: ${error.message}`
            };
        }
    }

    /**
     * Get tank status summary
     */
    async getTankStatus(tankId: number): Promise<{
        tank: any;
        status: {
            currentLevel: number;
            capacity: number;
            availableSpace: number;
            percentage: number;
            canSell: boolean;
            canUnload: boolean;
        };
    } | null> {
        try {
            const tank = await this.prisma.tank.findUnique({
                where: { id: tankId },
                include: { fuelType: true }
            });

            if (!tank) {
                return null;
            }

            const currentLevel = Number(tank.currentLevel);
            const capacity = Number(tank.capacityLit);
            const availableSpace = capacity - currentLevel;
            const percentage = (currentLevel / capacity) * 100;

            return {
                tank,
                status: {
                    currentLevel,
                    capacity,
                    availableSpace,
                    percentage,
                    canSell: currentLevel > 0,
                    canUnload: availableSpace > 0
                }
            };

        } catch (error: any) {
            console.error('Error getting tank status:', error);
            return null;
        }
    }
}

// Export a function to create validator with existing prisma instance
export function createTankValidator(prisma: PrismaClient) {
    return new TankValidator(prisma);
}
