import { PrismaClient } from '@prisma/client';
import { Router } from 'express';

export function createSeedRouter(prisma: PrismaClient) {
    const router = Router();

    // POST /api/seed - Manually seed the database
    router.post('/', async (req, res) => {
        try {
            console.log('🌱 Manual seed request received...');

            // Check if data already exists
            const existingFuelTypes = await prisma.fuelType.count();
            if (existingFuelTypes > 0) {
                return res.json({
                    message: 'Database already has data',
                    fuelTypes: existingFuelTypes
                });
            }

            // Create fuel types
            console.log('📝 Creating fuel types...');
            const petrol = await prisma.fuelType.create({
                data: { name: 'Petrol' }
            });

            const premiumPetrol = await prisma.fuelType.create({
                data: { name: 'Premium Petrol' }
            });

            const diesel = await prisma.fuelType.create({
                data: { name: 'Diesel' }
            });

            console.log('✅ Fuel types created');

            // Create tanks
            console.log('🛢️  Creating tanks...');
            const tanks = [
                {
                    name: 'Petrol Tank 1',
                    capacityLit: 10000,
                    currentLevel: 0,
                    fuelTypeId: petrol.id
                },
                {
                    name: 'Petrol Tank 2',
                    capacityLit: 10000,
                    currentLevel: 0,
                    fuelTypeId: petrol.id
                },
                {
                    name: 'Premium Petrol Tank',
                    capacityLit: 8000,
                    currentLevel: 0,
                    fuelTypeId: premiumPetrol.id
                },
                {
                    name: 'Diesel Tank 1',
                    capacityLit: 12000,
                    currentLevel: 0,
                    fuelTypeId: diesel.id
                },
                {
                    name: 'Diesel Tank 2',
                    capacityLit: 12000,
                    currentLevel: 0,
                    fuelTypeId: diesel.id
                }
            ];

            for (const tankData of tanks) {
                await prisma.tank.create({
                    data: tankData
                });
            }

            console.log('✅ Tanks created');

            // Create pumps
            console.log('⛽ Creating pumps...');
            const pumps = [
                { name: 'Petrol Pump 1', fuelTypeId: petrol.id },
                { name: 'Petrol Pump 2', fuelTypeId: petrol.id },
                { name: 'Petrol Pump 3', fuelTypeId: petrol.id },
                { name: 'Premium Petrol Pump 1', fuelTypeId: premiumPetrol.id },
                { name: 'Premium Petrol Pump 2', fuelTypeId: premiumPetrol.id },
                { name: 'Diesel Pump 1', fuelTypeId: diesel.id },
                { name: 'Diesel Pump 2', fuelTypeId: diesel.id },
                { name: 'Diesel Pump 3', fuelTypeId: diesel.id },
                { name: 'Diesel Pump 4', fuelTypeId: diesel.id }
            ];

            for (const pumpData of pumps) {
                await prisma.pump.create({
                    data: pumpData
                });
            }

            console.log('✅ Pumps created');

            // Set initial prices
            console.log('💰 Setting initial prices...');
            const prices = [
                { fuelTypeId: petrol.id, perLitre: 0, date: new Date() },
                { fuelTypeId: premiumPetrol.id, perLitre: 0, date: new Date() },
                { fuelTypeId: diesel.id, perLitre: 0, date: new Date() }
            ];

            for (const priceData of prices) {
                await prisma.price.create({
                    data: priceData
                });
            }

            console.log('✅ Initial prices set');

            // Create sample clients
            console.log('👥 Creating sample clients...');
            const clients = [
                {
                    name: 'ABC Transport',
                    ownerName: 'John Doe',
                    phone: '9876543210',
                    email: 'john@abctransport.com',
                    address: '123 Main St, City',
                    creditLimit: 50000,
                    balance: 0
                },
                {
                    name: 'XYZ Logistics',
                    ownerName: 'Jane Smith',
                    phone: '9876543211',
                    email: 'jane@xyzlogistics.com',
                    address: '456 Oak Ave, City',
                    creditLimit: 75000,
                    balance: 0
                }
            ];

            for (const clientData of clients) {
                await prisma.client.create({
                    data: clientData
                });
            }

            console.log('✅ Sample clients created');

            res.json({
                message: 'Database seeded successfully!',
                data: {
                    fuelTypes: 3,
                    tanks: 5,
                    pumps: 9,
                    prices: 3,
                    clients: 2
                }
            });

        } catch (error: any) {
            console.error('❌ Seed failed:', error);
            res.status(500).json({
                message: 'Failed to seed database',
                error: error.message
            });
        }
    });

    return router;
}
