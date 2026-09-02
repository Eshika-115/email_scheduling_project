import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

export const EMAIL_QUEUE_NAME = 'email-send';


export const emailQueue = new Queue(EMAIL_QUEUE_NAME, {

    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
    },
}
);

export interface EmailJobPayload {
    emailJobId: string;
}

//enqueue delayed job with idempotency

export async function enqueueEmailJob(emailJobId: string, scheduledFor: Date, bullJobId: string) {

    // Idempotency check



    const existingJob = await emailQueue.getJob(bullJobId);
    if (existingJob) {

        console.log(`Job ${bullJobId} already exists in queue, skipping enqueue.`);
        return existingJob;
    }

    //  delay in ms
    const now = Date.now();
    const targetTime = new Date(scheduledFor).getTime();
    const delay = Math.max(0, targetTime - now);

    const job = await emailQueue.add(
        'send-email',
        { emailJobId },
        {
            jobId: bullJobId,
            delay,
        }
    );

    console.log(`Job ${bullJobId} added to queue with ${delay}ms delay.`);
    return job;
}
