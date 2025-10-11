import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

export function createCreditsRouter(prisma: PrismaClient) {
    const router = Router();

    // Get all credits with filters
    router.get('/', async (req, res) => {
        const { clientId, fuelTypeId, status, startDate, endDate } = req.query as any;

        const where: any = {};
        if (clientId) where.clientId = Number(clientId);
        if (fuelTypeId) where.fuelTypeId = Number(fuelTypeId);
        if (status) where.status = status;
        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = new Date(String(startDate));
            if (endDate) where.date.lte = new Date(String(endDate));
        }

        const credits = await prisma.clientCredit.findMany({
            where,
            include: {
                client: true,
                fuelType: true
            },
            orderBy: { date: 'desc' }
        });

        res.json(credits);
    });

    // Mark credit as paid
    router.put('/:id/mark-paid', async (req, res) => {
        const id = Number(req.params.id);

        const result = await prisma.$transaction(async (tx) => {
            // Update credit status
            const credit = await tx.clientCredit.update({
                where: { id },
                data: {
                    status: 'paid',
                    paidDate: new Date()
                }
            });

            // Update client balance (reduce by the amount)
            await tx.client.update({
                where: { id: credit.clientId },
                data: { balance: { decrement: credit.totalAmount } }
            });

            // Add ledger entry for payment
            await tx.ledgerEntry.create({
                data: {
                    clientId: credit.clientId,
                    amount: -credit.totalAmount,
                    memo: 'Credit payment received'
                }
            });

            return credit;
        });

        res.json(result);
    });

    return router;
}
