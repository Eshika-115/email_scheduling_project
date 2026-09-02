import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding initial data...');

    // Create or update default demo user
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

    // Create sample SMTP senders
    const sender1 = await prisma.sender.create({
        data: {
            userId: user.id,
            email: 'sender1@ethereal.email',
            smtpConfig: {
                host: 'smtp.ethereal.email',
                port: 587,
                user: 'sender1@ethereal.email',
                pass: 'secretpass1',
            },
            maxEmailsPerHour: 50,
        },
    });

    const sender2 = await prisma.sender.create({
        data: {
            userId: user.id,
            email: 'sender2@ethereal.email',
            smtpConfig: {
                host: 'smtp.ethereal.email',
                port: 587,
                user: 'sender2@ethereal.email',
                pass: 'secretpass2',
            },
            maxEmailsPerHour: 50,
        },
    });

    console.log('Seeding completed successfully!');
    console.log(`Created User ID: ${user.id}`);
    console.log(`Created Senders: ${sender1.email}, ${sender2.email}`);
}

main()
    .catch((e) => {
        console.error('Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
