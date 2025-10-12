/**
 * Auto-seed script that runs when the backend starts
 * This ensures the database always has initial data
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function autoSeed() {
    try {
        console.log('🌱 Starting auto-seed process...');

        // Check if data already exists
        const existingFuelTypes = await prisma.fuelType.count();
        if (existingFuelTypes > 0) {
            console.log('✅ Database already has data, skipping auto-seed');
            return;
        }

        console.log('📝 Creating fuel types...');

        // 1. Create Fuel Types
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

        // 2. Create Tanks
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

        // 3. Create Pumps
        console.log('⛽ Creating pumps...');
        const pumps = [
            // Petrol Pumps
            { name: 'Petrol Pump 1', fuelTypeId: petrol.id },
            { name: 'Petrol Pump 2', fuelTypeId: petrol.id },
            { name: 'Petrol Pump 3', fuelTypeId: petrol.id },

            // Premium Petrol Pumps
            { name: 'Premium Petrol Pump 1', fuelTypeId: premiumPetrol.id },
            { name: 'Premium Petrol Pump 2', fuelTypeId: premiumPetrol.id },

            // Diesel Pumps
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

        // 4. Set Initial Prices
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

        // 5. Set Purchase Prices
        console.log('📦 Setting purchase prices...');
        const purchasePrices = [
            { fuelTypeId: petrol.id, price: 0 },
            { fuelTypeId: premiumPetrol.id, price: 0 },
            { fuelTypeId: diesel.id, price: 0 }
        ];

        for (const purchasePrice of purchasePrices) {
            await prisma.purchasePrice.create({
                data: purchasePrice
            });
        }

        console.log('✅ Purchase prices set');

        // 6. Create Sample Clients
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

        console.log('🎉 Auto-seed completed successfully!');
        console.log('📋 Summary:');
        console.log('   • 3 Fuel types (Petrol, Premium Petrol, Diesel)');
        console.log('   • 5 Storage tanks (empty - ready for fuel)');
        console.log('   • 9 Fuel pumps (3 Petrol, 2 Premium, 4 Diesel)');
        console.log('   • Fuel prices set to 0 (update with current market prices)');
        console.log('   • Purchase prices set to 0 (configure as needed)');
        console.log('   • 2 Sample clients with credit limits');
        console.log('🚀 Your fuel station is ready for business!');

    } catch (error) {
        console.error('❌ Auto-seed failed:', error);
        // Don't throw error to prevent backend from crashing
    }
}

export { autoSeed };
