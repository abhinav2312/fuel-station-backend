/**
 * Business Setup Script for Fuel Station Management
 * This script sets up initial data for a real fuel station business
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setupBusinessData() {
    console.log('🏪 Setting up Fuel Station Business Data...');

    try {
        // 1. Create Fuel Types
        console.log('⛽ Creating fuel types...');

        let petrol, premiumPetrol, diesel;

        // Check if fuel types already exist
        const existingFuelTypes = await prisma.fuelType.findMany();
        if (existingFuelTypes.length > 0) {
            console.log('✅ Fuel types already exist, using existing data');
            petrol = existingFuelTypes.find(ft => ft.name === 'Petrol');
            premiumPetrol = existingFuelTypes.find(ft => ft.name === 'Premium Petrol');
            diesel = existingFuelTypes.find(ft => ft.name === 'Diesel');

            if (!petrol || !premiumPetrol || !diesel) {
                throw new Error('Some fuel types are missing from existing data');
            }
        } else {
            petrol = await prisma.fuelType.create({
                data: { name: 'Petrol' }
            });

            premiumPetrol = await prisma.fuelType.create({
                data: { name: 'Premium Petrol' }
            });

            diesel = await prisma.fuelType.create({
                data: { name: 'Diesel' }
            });
        }

        console.log('✅ Fuel types created');

        // 2. Create Storage Tanks
        console.log('🛢️ Creating storage tanks...');
        const tanks = [
            {
                name: 'Petrol Storage Tank 1',
                capacityLit: 20000,
                currentLevel: 0,
                fuelTypeId: petrol.id
            },
            {
                name: 'Petrol Storage Tank 2',
                capacityLit: 15000,
                currentLevel: 0,
                fuelTypeId: petrol.id
            },
            {
                name: 'Premium Petrol Storage',
                capacityLit: 10000,
                currentLevel: 0,
                fuelTypeId: premiumPetrol.id
            },
            {
                name: 'Diesel Storage Tank 1',
                capacityLit: 25000,
                currentLevel: 0,
                fuelTypeId: diesel.id
            },
            {
                name: 'Diesel Storage Tank 2',
                capacityLit: 20000,
                currentLevel: 0,
                fuelTypeId: diesel.id
            }
        ];

        for (const tankData of tanks) {
            await prisma.tank.upsert({
                where: { name: tankData.name },
                update: tankData,
                create: tankData
            });
        }

        console.log('✅ Storage tanks created');

        // 3. Create Pumps
        console.log('⛽ Creating fuel pumps...');
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
            await prisma.pump.upsert({
                where: { name: pumpData.name },
                update: pumpData,
                create: pumpData
            });
        }

        console.log('✅ Fuel pumps created');

        // 4. Set Initial Prices
        console.log('💰 Setting initial fuel prices...');
        const prices = [
            { fuelTypeId: petrol.id, price: 0, isActive: true },
            { fuelTypeId: premiumPetrol.id, price: 0, isActive: true },
            { fuelTypeId: diesel.id, price: 0, isActive: true }
        ];

        for (const priceData of prices) {
            await prisma.price.create({
                data: {
                    fuelTypeId: priceData.fuelTypeId,
                    price: priceData.price,
                    isActive: priceData.isActive
                }
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
            await prisma.purchasePrice.upsert({
                where: { fuelTypeId: purchasePrice.fuelTypeId },
                update: { price: purchasePrice.price },
                create: {
                    fuelTypeId: purchasePrice.fuelTypeId,
                    price: purchasePrice.price
                }
            });
        }

        console.log('✅ Purchase prices set');

        // 6. Create Sample Clients
        console.log('👥 Creating sample clients...');
        const clients = [
            {
                name: 'ABC Transport Company',
                ownerName: 'Rajesh Kumar',
                phone: '+91-9876543210',
                address: '123 Transport Nagar, Mumbai',
                creditLimit: 50000,
                balance: 0
            },
            {
                name: 'XYZ Logistics',
                ownerName: 'Priya Sharma',
                phone: '+91-9876543211',
                address: '456 Logistics Park, Delhi',
                creditLimit: 75000,
                balance: 0
            },
            {
                name: 'City Cab Services',
                ownerName: 'Amit Singh',
                phone: '+91-9876543212',
                address: '789 Cab Stand, Bangalore',
                creditLimit: 30000,
                balance: 0
            }
        ];

        for (const clientData of clients) {
            await prisma.client.upsert({
                where: { phone: clientData.phone },
                update: clientData,
                create: clientData
            });
        }

        console.log('✅ Sample clients created');

        // 7. Create Sample Sales (for demonstration)
        console.log('💼 Creating sample sales data...');
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        // Get pumps for sample sales
        const allPumps = await prisma.pump.findMany();

        // Create sample sales for yesterday
        const sampleSales = [
            {
                pumpId: allPumps[0].id,
                litres: 25.5,
                pricePerLitre: 95.50,
                totalAmount: 2435.25,
                method: 'CASH',
                createdAt: yesterday
            },
            {
                pumpId: allPumps[1].id,
                litres: 30.0,
                pricePerLitre: 95.50,
                totalAmount: 2865.00,
                method: 'CARD',
                createdAt: yesterday
            },
            {
                pumpId: allPumps[5].id,
                litres: 40.0,
                pricePerLitre: 89.25,
                totalAmount: 3570.00,
                method: 'CASH',
                createdAt: yesterday
            }
        ];

        for (const sale of sampleSales) {
            await prisma.sale.create({
                data: sale
            });
        }

        console.log('✅ Sample sales created');

        // 8. Create Sample Daily Readings
        console.log('📊 Creating sample daily readings...');
        const readings = [
            {
                pumpId: allPumps[0].id,
                date: yesterday,
                openingLitres: 1000,
                closingLitres: 950,
                pricePerLitre: 95.50,
                revenue: 4775.00
            },
            {
                pumpId: allPumps[1].id,
                date: yesterday,
                openingLitres: 800,
                closingLitres: 750,
                pricePerLitre: 95.50,
                revenue: 4775.00
            },
            {
                pumpId: allPumps[5].id,
                date: yesterday,
                openingLitres: 1200,
                closingLitres: 1100,
                pricePerLitre: 89.25,
                revenue: 8925.00
            }
        ];

        for (const reading of readings) {
            await prisma.dailyReading.upsert({
                where: {
                    pumpId_date: {
                        pumpId: reading.pumpId,
                        date: reading.date
                    }
                },
                update: reading,
                create: reading
            });
        }

        console.log('✅ Sample daily readings created');

        console.log('🎉 Business setup completed successfully!');
        console.log('');
        console.log('📋 Summary:');
        console.log('   • 3 Fuel types (Petrol, Premium Petrol, Diesel)');
        console.log('   • 5 Storage tanks (empty - ready for fuel)');
        console.log('   • 9 Fuel pumps (3 Petrol, 2 Premium, 4 Diesel)');
        console.log('   • Fuel prices set to 0 (update with current market prices)');
        console.log('   • Purchase prices set to 0 (configure as needed)');
        console.log('   • 3 Sample clients with credit limits');
        console.log('   • Sample sales and readings for yesterday');
        console.log('');
        console.log('🚀 Your fuel station is ready for business!');
        console.log('📝 Next steps:');
        console.log('   1. Update fuel prices with current market rates');
        console.log('   2. Set purchase prices for profit tracking');
        console.log('   3. Add fuel to tanks (update current levels)');
        console.log('   4. Start recording daily operations');

    } catch (error) {
        console.error('❌ Error setting up business data:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the setup
setupBusinessData()
    .then(() => {
        console.log('✅ Business setup completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Business setup failed:', error);
        process.exit(1);
    });
