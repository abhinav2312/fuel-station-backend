import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const diesel = await prisma.fuelType.upsert({
        where: { name: 'Diesel' },
        update: {},
        create: { name: 'Diesel' },
    });
    const petrol = await prisma.fuelType.upsert({
        where: { name: 'Petrol' },
        update: {},
        create: { name: 'Petrol' },
    });
    const premiumPetrol = await prisma.fuelType.upsert({
        where: { name: 'Premium Petrol' },
        update: {},
        create: { name: 'Premium Petrol' },
    });

    // Ensure one active price per fuel type
    const dieselActive = await prisma.price.findFirst({ where: { fuelTypeId: diesel.id, active: true } });
    if (!dieselActive) {
        await prisma.price.create({ data: { fuelTypeId: diesel.id, perLitre: 1.5, active: true } });
    }
    const petrolActive = await prisma.price.findFirst({ where: { fuelTypeId: petrol.id, active: true } });
    if (!petrolActive) {
        await prisma.price.create({ data: { fuelTypeId: petrol.id, perLitre: 1.7, active: true } });
    }
    const premiumPetrolActive = await prisma.price.findFirst({ where: { fuelTypeId: premiumPetrol.id, active: true } });
    if (!premiumPetrolActive) {
        await prisma.price.create({ data: { fuelTypeId: premiumPetrol.id, perLitre: 1.9, active: true } });
    }

    // Ensure tanks exist (for storage)
    const dieselTank = await prisma.tank.findFirst({ where: { name: 'Main Diesel Storage' } });
    if (!dieselTank) {
        await prisma.tank.create({ data: { name: 'Main Diesel Storage', capacityLit: 10000, fuelTypeId: diesel.id, currentLevel: 8000 } });
    }
    const petrolTank = await prisma.tank.findFirst({ where: { name: 'Petrol Storage' } });
    if (!petrolTank) {
        await prisma.tank.create({ data: { name: 'Petrol Storage', capacityLit: 8000, fuelTypeId: petrol.id, currentLevel: 6000 } });
    }
    const premiumPetrolTank = await prisma.tank.findFirst({ where: { name: 'Premium Petrol Storage' } });
    if (!premiumPetrolTank) {
        await prisma.tank.create({ data: { name: 'Premium Petrol Storage', capacityLit: 6000, fuelTypeId: premiumPetrol.id, currentLevel: 4000 } });
    }

    // Create pumps for each fuel type
    // Petrol pumps (3 pumps)
    for (let i = 1; i <= 3; i++) {
        const pumpName = `Petrol Pump ${i}`;
        const existingPump = await prisma.pump.findFirst({ where: { name: pumpName } });
        if (!existingPump) {
            await prisma.pump.create({ data: { name: pumpName, fuelTypeId: petrol.id } });
        }
    }

    // Diesel pumps (4 pumps)
    for (let i = 1; i <= 4; i++) {
        const pumpName = `Diesel Pump ${i}`;
        const existingPump = await prisma.pump.findFirst({ where: { name: pumpName } });
        if (!existingPump) {
            await prisma.pump.create({ data: { name: pumpName, fuelTypeId: diesel.id } });
        }
    }

    // Premium Petrol pumps (2 pumps)
    for (let i = 1; i <= 2; i++) {
        const pumpName = `Premium Petrol Pump ${i}`;
        const existingPump = await prisma.pump.findFirst({ where: { name: pumpName } });
        if (!existingPump) {
            await prisma.pump.create({ data: { name: pumpName, fuelTypeId: premiumPetrol.id } });
        }
    }

    let client = await prisma.client.findFirst({ where: { name: 'Acme Logistics' } });
    if (!client) {
        client = await prisma.client.create({
            data: {
                name: 'Acme Logistics',
                ownerName: 'John Smith',
                phone: '+1234567890',
                creditLimit: 2000
            }
        });
    }

    const dieselPrice = await prisma.price.findFirst({ where: { fuelTypeId: diesel.id, active: true } });
    const dieselPump = await prisma.pump.findFirst({ where: { fuelTypeId: diesel.id } });

    if (dieselPrice && dieselPump) {
        await prisma.sale.create({
            data: {
                pumpId: dieselPump.id,
                litres: 50,
                pricePerLitre: dieselPrice.perLitre,
                totalAmount: 50 * Number(dieselPrice.perLitre),
                method: 'CASH',
                note: 'Initial sale example',
            },
        });
    }

    console.log('Seed completed');
}

main().finally(async () => {
    await prisma.$disconnect();
});

