import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { createEtherealAccountForUser } from '../services/smtp.Service';

const router = Router();
const prisma = new PrismaClient();

// list senders route
router.get('/senders', async (req, res) => {
    try {
        const senders = await prisma.sender.findMany({
            orderBy: { createdAt: 'desc' },
        });
        res.json({ senders });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// create sender route
router.post('/senders', async (req, res) => {
    try {
        const { userId, name, email, host, port, user, pass, maxEmailsPerHour } = req.body;

        if (!host || !user || !pass) {
            if (!userId) return res.status(400).json({ error: 'userId required' });
            const etherealSender = await createEtherealAccountForUser(userId);
            return res.status(201).json({ sender: etherealSender });
        }

        const sender = await prisma.sender.create({
            data: {
                userId,
                name: name || user,
                email: email || user,
                host,
                port: parseInt(port || '587', 10),
                user,
                pass,
                maxEmailsPerHour: parseInt(maxEmailsPerHour || '50', 10),
            },
        });

        res.status(201).json({ sender });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
