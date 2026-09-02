import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding initial data with real Ethereal credentials');

    // Create default test user
    const user = await prisma.user.upsert({
        where: { email: 'demo@reachinbox.ai' },
        update: {},
        create: {
            googleId: 'google-demo-id-101',
            email: 'demo@reachinbox.ai',
            name: 'Demo Student',
            avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Demo',
        },
    });

    // clearn invalid sender
    await prisma.sender.deleteMany({ where: { userId: user.id } });

    // Generate 2 working Ethereal accounts

    console.log('Generating Ethereal Acc1');
    const eth1 = await nodemailer.createTestAccount();
    const sender1 = await prisma.sender.create({
        data: {
            userId: user.id,
            email: eth1.user,
            smtpConfig: {
                host: eth1.smtp.host,
                port: eth1.smtp.port,
                user: eth1.user,
                pass: eth1.pass,
            },
            maxEmailsPerHour: 50,
        },
    });

    console.log('Generating Ethereal Acc2');
    const eth2 = await nodemailer.createTestAccount();
    const sender2 = await prisma.sender.create({
        data: {
            userId: user.id,
            email: eth2.user,
            smtpConfig: {
                host: eth2.smtp.host,
                port: eth2.smtp.port,
                user: eth2.user,
                pass: eth2.pass,
            },
            maxEmailsPerHour: 50,
        },
    });

    console.log('Seeding completed with valid Ethereal cred');
    console.log(`User: ${user.email} | Senders: ${sender1.email}, ${sender2.email}`);
}

main()
    .catch((e) => {
        console.error('Seeding failed', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
