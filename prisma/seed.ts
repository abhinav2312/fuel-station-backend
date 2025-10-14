import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...');

    // Check if data already exists
    const existingFuelTypes = await prisma.fuelType.count();
    if (existingFuelTypes > 0) {
        console.log('✅ Database already has data, skipping seed');
        return;
    }

    // 1. Create Fuel Types
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

    // 2. Create Storage Tanks (One per fuel type)
    console.log('🛢️  Creating storage tanks...');
    const tanks = [
        {
            name: 'Petrol Tank',
            capacityLit: 10000,
            currentLevel: 0,
            fuelTypeId: petrol.id
        },
        {
            name: 'Diesel Tank',
            capacityLit: 12000,
            currentLevel: 0,
            fuelTypeId: diesel.id
        },
        {
            name: 'Premium Petrol Tank',
            capacityLit: 8000,
            currentLevel: 0,
            fuelTypeId: premiumPetrol.id
        }
    ];

    for (const tankData of tanks) {
        await prisma.tank.create({
            data: tankData
        });
    }

    console.log('✅ Storage tanks created');

    // 3. Create Fuel Pumps
    console.log('⛽ Creating fuel pumps...');
    const pumps = [
        // 3 Petrol Pumps
        { name: 'Petrol Pump 1', fuelTypeId: petrol.id },
        { name: 'Petrol Pump 2', fuelTypeId: petrol.id },
        { name: 'Petrol Pump 3', fuelTypeId: petrol.id },

        // 4 Diesel Pumps
        { name: 'Diesel Pump 1', fuelTypeId: diesel.id },
        { name: 'Diesel Pump 2', fuelTypeId: diesel.id },
        { name: 'Diesel Pump 3', fuelTypeId: diesel.id },
        { name: 'Diesel Pump 4', fuelTypeId: diesel.id },

        // 2 Premium Petrol Pumps
        { name: 'Premium Petrol Pump 1', fuelTypeId: premiumPetrol.id },
        { name: 'Premium Petrol Pump 2', fuelTypeId: premiumPetrol.id }
    ];

    for (const pumpData of pumps) {
        await prisma.pump.create({
            data: pumpData
        });
    }

    console.log('✅ Fuel pumps created');

    // 4. Set Initial Prices (set to 0 - user should update with real prices)
    console.log('💰 Setting initial prices...');
    const prices = [
        { fuelTypeId: petrol.id, perLitre: 0, isActive: true },
        { fuelTypeId: premiumPetrol.id, perLitre: 0, isActive: true },
        { fuelTypeId: diesel.id, perLitre: 0, isActive: true }
    ];

    for (const priceData of prices) {
        await prisma.price.create({
            data: priceData
        });
    }

    console.log('✅ Initial prices set');

    // 5. Create Sample Clients
    console.log('👥 Creating sample clients...');
    const clients = [
        {
            name: 'ABC Transport',
            ownerName: 'John Doe',
            phone: '9876543210',
            address: '123 Main St, City',
            creditLimit: 50000,
            balance: 0
        },
        {
            name: 'XYZ Logistics',
            ownerName: 'Jane Smith',
            phone: '9876543211',
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

    console.log('🎉 Database seed completed successfully!');
    console.log('📋 Summary:');
    console.log('   • 3 Fuel types (Petrol, Premium Petrol, Diesel)');
    console.log('   • 5 Storage tanks (empty - ready for fuel)');
    console.log('   • 9 Fuel pumps (3 Petrol, 2 Premium, 4 Diesel)');
    console.log('   • Fuel prices set to 0 (update with current market prices)');
    console.log('   • 2 Sample clients with credit limits');
    console.log('🚀 Your fuel station is ready for business!');
}

// Export the main function for Prisma
export { main };

// Run the seed function
main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

