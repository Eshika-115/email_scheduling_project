import { Worker, Job } from 'bullmq';

import { PrismaClient } from '@prisma/client';
import { redisConnection } from '../config/redis';
import { EMAIL_QUEUE_NAME, EmailJobPayload, enqueueEmailJob } from '../queues/emailQueue';
import { sendEmailViaSmtp, getNextRoundrobinSender } from '../services/smtp.Service';
import { checkAndConsumeRateLimit, canSendSlackAlert } from '../services/rateLimiterService';
import { sendRateLimitSlackAlert } from '../services/slackService'

const prisma = new PrismaClient();

// Worker ki concurreny  and delay le rhe h env se 

const concurrency = parseInt(process.env.WORKER_CONCURRENCY || '5', 10);

const minDelayMs = parseInt(process.env.MIN_DELAY_BETWEEN_EMAILS_MS || '2000', 10);

console.log(`[Worker] Initializing Email Worker with Concurrency = ${concurrency}, Min Delay = ${minDelayMs}ms`);

export const emailWorker = new Worker<EmailJobPayload>(
    EMAIL_QUEUE_NAME,

    async (job: Job<EmailJobPayload>) => {
        const { emailJobId } = job.data;
        console.log(`[Worker] Processing Job ID: ${job.id} (EmailJob: ${emailJobId})`);

        // db se email ka record le rhe
        const emailJob = await prisma.emailJob.findUnique({
            where: { id: emailJobId },
            include: { campaign: true },
        });

        if (!emailJob) {
            console.error(`[Worker] EmailJob ${emailJobId} not found in DB.`);
            return;
        }

        //  email agr hi send ho chuki h toh skip krdo 
        if (emailJob.status === 'sent') {
            console.log(`[Worker] EmailJob ${emailJobId} is already SENT. Skipping.`);
            return;
        }


        const sender = await getNextRoundrobinSender(emailJob.campaign.userId, job.attemptsMade);
        if (!sender) {
            const err = 'No active SMTP sender avialable';

            console.error(`[Worker] ${err}`);
            await prisma.emailJob.update({
                where: { id: emailJobId },
                data: {
                    status: 'failed', errorMessage: err
                },
            });

            throw new Error(err);



        } const rateLimit = await checkAndConsumeRateLimit(sender.id, sender.maxEmailsPerHour);
        if (!rateLimit.allowed) {
            console.warn(`[Worker] Rate Limit Blocked for Sender ${sender.email}: ${rateLimit.reason}`);

            const retryTime = rateLimit.retryAt || new Date(Date.now() + 3600000);

            const notify = await canSendSlackAlert(sender.id);

            if (notify) {
                await sendRateLimitSlackAlert(sender.email, sender.maxEmailsPerHour || 50);
            }



            // db me status ko send kr rhe 


            await prisma.emailJob.update(
                {

                    where: { id: emailJobId },
                    data: { status: 'delayed_rate_limit' },
                });

            await enqueueEmailJob(emailJob.id, retryTime, emailJob.bullJobId);
            return;
        }
        // sending hai status
        await prisma.emailJob.update({
            where: { id: emailJobId },
            data: {
                status: 'sending', attemptCount: {
                    increment: 1
                }
            },
        });


        // nodemailer se mail bhj rhe 
        try {
            const result = await sendEmailViaSmtp({
                sender,
                to: emailJob.recipientEmail,
                subject: emailJob.campaign.subject,
                html: emailJob.campaign.bodyTemplate.replace('{{email}}', emailJob.recipientEmail),
            });




            // Update db
            await prisma.emailJob.update({
                where: { id: emailJobId },
                data: {
                    status: 'sent',
                    senderId: sender.id,
                    sentAt: new Date(),
                },
            });

            console.log(`[Worker] SUCCESS: Delivered to ${emailJob.recipientEmail}`);
            if (result.previewUrl) {
                console.log(`[Worker] Ethereal Preview URL: ${result.previewUrl}`);
            }
        } catch (error: any) {
            console.error(`[Worker] Delivery failed for ${emailJob.recipientEmail}:`, error.message);
            await prisma.emailJob.update({
                where: { id: emailJobId },
                data: {
                    status: 'failed',
                    errorMessage: error.message || 'SMTP send failed',
                },
            });
            throw error;
        }
    },
    {
        connection: redisConnection,
        concurrency,
        limiter: {
            max: 1,
            duration: minDelayMs,
        },
    }
);

emailWorker.on('completed', (job) => {

    console.log(`[Worker] Job ${job.id} finished successfully.`);
});

emailWorker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed: ${err.message}`);
});
