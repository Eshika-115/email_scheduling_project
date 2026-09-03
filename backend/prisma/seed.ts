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


    await prisma.sender.updateMany({
        data: {
            maxEmailsPerHour: 1000,
        },
    });


    const count = await prisma.sender.count();
    if (count === 0) {
        const eth1 = await nodemailer.createTestAccount();
        await prisma.sender.create({
            data: {
                userId: user.id,
                email: eth1.user,
                smtpConfig: {
                    host: eth1.smtp.host,
                    port: eth1.smtp.port,
                    user: eth1.user,
                    pass: eth1.pass,
                },
                maxEmailsPerHour: 1000,
            },
        });
    }

    console.log('Seeding completed successfully');
}

main()
    .catch((e) => {
        console.error('Seeding failed', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
