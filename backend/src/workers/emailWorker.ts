import { Worker, Job } from 'bullmq';
import { prisma } from '../config/db';
import { redisConnection } from '../config/redis';
import { EMAIL_QUEUE_NAME, EmailJobPayload, enqueueEmailJob } from '../queues/emailQueue';
import { sendEmailViaSmtp, getNextRoundrobinSender } from '../services/smtp.Service';
import { checkAndConsumeRateLimit, canSendSlackAlert } from '../services/rateLimiterService';
import { sendRateLimitSlackAlert } from '../services/slackService';
import { logEmailEvent } from '../services/elasticService';

const concurrency = parseInt(process.env.WORKER_CONCURRENCY || '5', 10);
const minDelayMs = parseInt(process.env.MIN_DELAY_BETWEEN_EMAILS_MS || '2000', 10);

console.log(`[Worker] Initializing Email Worker with Concurrency = ${concurrency}, Min Delay = ${minDelayMs}ms`);

export const emailWorker = new Worker<any>(
  EMAIL_QUEUE_NAME,

  async (job: Job<any>) => {
    let emailJobId: string = '';
    if (typeof job.data === 'string') {
      emailJobId = job.data;
    } else if (job.data && job.data.emailJobId) {
      emailJobId = job.data.emailJobId;
    } else if (job.id) {
      emailJobId = job.id.replace('email-job-', '');
    }

    console.log(`[Worker] Processing Job ID: ${job.id} (EmailJob: ${emailJobId})`);

    const emailJob = await prisma.emailJob.findUnique({
      where: { id: emailJobId },
      include: { campaign: true },
    });

    if (!emailJob) {
      console.error(`[Worker] EmailJob ${emailJobId} not found in DB.`);
      return;
    }

    if (emailJob.status === 'sent') {
      console.log(`[Worker] EmailJob ${emailJobId} is already SENT. Skipping.`);
      return;
    }

    const sender = await getNextRoundrobinSender(emailJob.campaign.userId, job.attemptsMade);
    if (!sender) {
      const err = 'No active SMTP sender available';
      console.error(`[Worker] ${err}`);
      await prisma.emailJob.update({
        where: { id: emailJobId },
        data: { status: 'failed', errorMessage: err },
      });
      throw new Error(err);
    }

    const campaignLimit = emailJob.campaign.hourlyLimit && emailJob.campaign.hourlyLimit > 0 ? emailJob.campaign.hourlyLimit : undefined;
    const effectiveHourlyLimit = campaignLimit || sender.maxEmailsPerHour || 50;

    const rateLimit = await checkAndConsumeRateLimit(sender.id, effectiveHourlyLimit);
    if (!rateLimit.allowed) {
      console.warn(`[Worker] Rate Limit Blocked for Sender ${sender.email} (Limit: ${effectiveHourlyLimit}/hr): ${rateLimit.reason}`);

      const retryTime = rateLimit.retryAt || new Date(Date.now() + 3600000);
      const notify = await canSendSlackAlert(sender.id);

      if (notify) {
        await sendRateLimitSlackAlert(sender.email, effectiveHourlyLimit);
      }

      await prisma.emailJob.update({
        where: { id: emailJobId },
        data: { status: 'delayed_rate_limit' },
      });

      await logEmailEvent({
        jobId: emailJob.id,
        campaignId: emailJob.campaignId,
        senderId: sender.id,
        recipientEmail: emailJob.recipientEmail,
        status: 'delayed_rate_limit',
        errorMessage: rateLimit.reason,
      });

      await enqueueEmailJob(emailJob.id, retryTime, {
        emailJobId: emailJob.id,
        recipientEmail: emailJob.recipientEmail,
        campaignId: emailJob.campaignId,
      });
      return;
    }

    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: {
        status: 'sending',
        attemptCount: { increment: 1 },
      },
    });

    try {
      const result = await sendEmailViaSmtp({
        sender,
        to: emailJob.recipientEmail,
        subject: emailJob.campaign.subject,
        html: emailJob.campaign.bodyTemplate.replace('{{email}}', emailJob.recipientEmail),
      });

      await prisma.emailJob.update({
        where: { id: emailJobId },
        data: {
          status: 'sent',
          senderId: sender.id,
          sentAt: new Date(),
        },
      });

      await logEmailEvent({
        jobId: emailJob.id,
        campaignId: emailJob.campaignId,
        senderId: sender.id,
        recipientEmail: emailJob.recipientEmail,
        status: 'sent',
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

      await logEmailEvent({
        jobId: emailJob.id,
        campaignId: emailJob.campaignId,
        senderId: sender?.id,
        recipientEmail: emailJob.recipientEmail,
        status: 'failed',
        errorMessage: error.message || 'SMTP send failed',
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
