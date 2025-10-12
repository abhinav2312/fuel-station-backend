/**
 * Simple seed script that uses raw SQL to avoid Prisma schema issues
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function simpleSeed() {
    try {
        console.log('🌱 Starting simple seed process...');

        // Check if data already exists
        const existingFuelTypes = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "FuelType"`;
        const count = (existingFuelTypes as any)[0]?.count || 0;

        if (count > 0) {
            console.log('✅ Database already has data, skipping seed');
            return;
        }

        console.log('📝 Creating fuel types with raw SQL...');
        
        // Use raw SQL to insert fuel types
        await prisma.$executeRaw`
            INSERT INTO "FuelType" (name) VALUES 
            ('Petrol'),
            ('Premium Petrol'),
            ('Diesel')
        `;

        console.log('✅ Fuel types created');

        // Get the created fuel type IDs
        const fuelTypes = await prisma.$queryRaw`
            SELECT id, name FROM "FuelType" ORDER BY id
        ` as any[];

        const petrol = fuelTypes.find(ft => ft.name === 'Petrol');
        const premiumPetrol = fuelTypes.find(ft => ft.name === 'Premium Petrol');
        const diesel = fuelTypes.find(ft => ft.name === 'Diesel');

        console.log('🛢️  Creating tanks with raw SQL...');
        
        // Create tanks using raw SQL
        await prisma.$executeRaw`
            INSERT INTO "Tank" (name, "capacityLit", "fuelTypeId", "currentLevel", "avgUnitCost") VALUES 
            ('Petrol Tank 1', 10000, ${petrol.id}, 0, 0),
            ('Petrol Tank 2', 10000, ${petrol.id}, 0, 0),
            ('Premium Petrol Tank', 8000, ${premiumPetrol.id}, 0, 0),
            ('Diesel Tank 1', 12000, ${diesel.id}, 0, 0),
            ('Diesel Tank 2', 12000, ${diesel.id}, 0, 0)
        `;

        console.log('✅ Tanks created');

        console.log('⛽ Creating pumps with raw SQL...');
        
        // Create pumps using raw SQL
        await prisma.$executeRaw`
            INSERT INTO "Pump" (name, "fuelTypeId", "isActive") VALUES 
            ('Petrol Pump 1', ${petrol.id}, true),
            ('Petrol Pump 2', ${petrol.id}, true),
            ('Petrol Pump 3', ${petrol.id}, true),
            ('Premium Petrol Pump 1', ${premiumPetrol.id}, true),
            ('Premium Petrol Pump 2', ${premiumPetrol.id}, true),
            ('Diesel Pump 1', ${diesel.id}, true),
            ('Diesel Pump 2', ${diesel.id}, true),
            ('Diesel Pump 3', ${diesel.id}, true),
            ('Diesel Pump 4', ${diesel.id}, true)
        `;

        console.log('✅ Pumps created');

        console.log('💰 Setting initial prices with raw SQL...');
        
        // Create prices using raw SQL
        await prisma.$executeRaw`
            INSERT INTO "Price" ("fuelTypeId", "perLitre", "active", "createdAt") VALUES 
            (${petrol.id}, 0, true, NOW()),
            (${premiumPetrol.id}, 0, true, NOW()),
            (${diesel.id}, 0, true, NOW())
        `;

        console.log('✅ Initial prices set');

        console.log('👥 Creating sample clients with raw SQL...');
        
        // Create clients using raw SQL
        await prisma.$executeRaw`
            INSERT INTO "Client" (name, "ownerName", phone, email, address, "creditLimit", balance) VALUES 
            ('ABC Transport', 'John Doe', '9876543210', 'john@abctransport.com', '123 Main St, City', 50000, 0),
            ('XYZ Logistics', 'Jane Smith', '9876543211', 'jane@xyzlogistics.com', '456 Oak Ave, City', 75000, 0)
        `;

        console.log('✅ Sample clients created');

        console.log('🎉 Simple seed completed successfully!');
        console.log('📋 Summary:');
        console.log('   • 3 Fuel types (Petrol, Premium Petrol, Diesel)');
        console.log('   • 5 Storage tanks (empty - ready for fuel)');
        console.log('   • 9 Fuel pumps (3 Petrol, 2 Premium, 4 Diesel)');
        console.log('   • Fuel prices set to 0 (update with current market prices)');
        console.log('   • 2 Sample clients with credit limits');
        console.log('🚀 Your fuel station is ready for business!');

    } catch (error) {
        console.error('❌ Simple seed failed:', error);
        // Don't throw error to prevent backend from crashing
    } finally {
        await prisma.$disconnect();
    }
}

// Run the seed
simpleSeed()
    .then(() => {
        console.log('✅ Simple seed completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Simple seed failed:', error);
        process.exit(1);
    });
