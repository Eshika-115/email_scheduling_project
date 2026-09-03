import { Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { redisConnection } from '../config/redis';

export const EMAIL_QUEUE_NAME = 'email-send';


export const emailQueue = new Queue(EMAIL_QUEUE_NAME, {

    connection: redisConnection,
}
);

export interface EmailJobPayload {
    emailJobId: string;
    recipientEmail: string;
    senderId?: string;
    campaignId: string;
}

//enqueue delayed job with idempotency

export async function enqueueEmailJob(emailJobId: string, scheduledFor: Date, payload: EmailJobPayload) {

    const delay = Math.max(0, scheduledFor.getTime() - Date.now());
    const bullJobId = `email-job-${emailJobId}`;

    // bullmq me job enqueue kr rhe
    await emailQueue.add('send-email', payload, {
        jobId: bullJobId,
        delay,
        removeOnComplete: false,
        removeOnFail: false,
    });
    return bullJobId;
}


export async function rehydrateQueue() {
    const prisma = new PrismaClient();
    try {
        const pendingJobs = await prisma.emailJob.findMany({
            where: {
                status: { in: ['pending', 'delayed_rate_limit'] },
            },
        });
        console.log(`[Rehydrate] Re-syncing ${pendingJobs.length} pending/delayed jobs from DB into BullMQ...`);
        for (const job of pendingJobs) {
            await enqueueEmailJob(job.id, job.scheduledFor, {
                emailJobId: job.id,
                recipientEmail: job.recipientEmail,
                campaignId: job.campaignId,
                senderId: job.senderId || undefined,
            });
        }
        console.log('[Rehydrate] Queue rehydration completed successfully');
    } catch (err: any) {
        console.error('[Rehydrate] Error rehydrating queue', err.message);
    } finally {
        await prisma.$disconnect();
    }
}



