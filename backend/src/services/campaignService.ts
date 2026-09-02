import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateCampaignInput {
    userId: string;
    subject: string;
    bodyTemplate: string;
    recipientEmails: string[];
    delaySeconds?: number;
    hourlyLimit?: number;
    startTime?: Date;
}

//emailjob record in databse  campign create
export async function createCampaign(input: CreateCampaignInput) {
    const { userId, subject, bodyTemplate, recipientEmails, delaySeconds = 0, hourlyLimit = 50, startTime } = input;

    const campaign = await prisma.emailCampaign.create({
        data: {
            userId,
            subject,
            bodyTemplate,
            delaySeconds,
            hourlyLimit,
            startTime: startTime || new Date(),
            status: 'scheduled',
        },
    });

    const scheduledBase = startTime ? new Date(startTime) : new Date();

    // Create EmailJob entry  bullJob id  implodency ke liye
    const jobsData = recipientEmails.map((email, index) => {
        const jobScheduledTime = new Date(scheduledBase.getTime() + index * (delaySeconds * 1000));
        return {
            campaignId: campaign.id,
            recipientEmail: email,
            status: 'pending',
            scheduledFor: jobScheduledTime,
            bullJobId: `email-job-${campaign.id}-${index}`,
        };
    });

    await prisma.emailJob.createMany({
        data: jobsData,
    });

    return prisma.emailCampaign.findUnique({
        where: { id: campaign.id },
        include: { jobs: true },
    });
}

//   EmailJob status update kra
export async function updateJobStatus(
    jobId: string,
    status: string,
    extra?: { senderId?: string; sentAt?: Date; errorMessage?: string }
) {
    return prisma.emailJob.update({
        where: { id: jobId },
        data: {
            status,
            senderId: extra?.senderId,
            sentAt: extra?.sentAt,
            errorMessage: extra?.errorMessage,
            attemptCount: { increment: 1 },
        },
    });
}

//  fetch kr rhe h bache wale scheduled jobs
export async function listScheduledJobs(userId: string) {
    return prisma.emailJob.findMany({
        where: {
            campaign: { userId },
            status: { in: ['pending', 'scheduled', 'delayed_rate_limit'] },
        },
        include: { campaign: true, sender: true },
        orderBy: { scheduledFor: 'asc' },
    });
}

//  fetch kr rhe h jo complete sent jobs h jo
export async function listSentJobs(userId: string) {
    return prisma.emailJob.findMany({
        where: {
            campaign: { userId },
            status: 'sent',
        },
        include: { campaign: true, sender: true },
        orderBy: { sentAt: 'desc' },
    });
}
