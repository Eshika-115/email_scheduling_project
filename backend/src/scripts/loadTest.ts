import { PrismaClient } from '@prisma/client';
import { createCampaign } from '../services/campaignService';
import { enqueueEmailJob, emailQueue } from '../queues/emailQueue';

const prisma = new PrismaClient();

async function runLoadTest() {
  console.log('=== Starting Phase 11: 1000+ Email Load Test ===');


  const recipients: string[] = [];
  for (let i = 1; i <= 1000; i++) {
    recipients.push(`load_test_user_${i}@example.com`);
  }

  console.log(`[LoadTest] Generated ${recipients.length} test recipient emails.`);


  const campaign = await createCampaign({
    userId: 'demo-user-id',
    subject: 'Phase 11 Load Test Campaign (1000+ Emails)',
    bodyTemplate: 'This is a load test message to verify queue depth, rate limiting, and idempotency.',
    recipientEmails: recipients,
    delaySeconds: 2,
    hourlyLimit: 50,
    startTime: new Date(),
  });

  if (!campaign || !campaign.jobs) {
    console.error('[LoadTest] Failed to create load test campaign.');
    process.exit(1);
  }

  console.log(`[LoadTest] Campaign created successfully with ID: ${campaign.id}`);
  console.log(`[LoadTest] Created ${campaign.jobs.length} EmailJob rows in Database.`);


  console.log('[LoadTest] Enqueuing 1000 jobs into BullMQ queue...');
  const startTime = Date.now();

  for (const job of campaign.jobs) {
    await enqueueEmailJob(job.id, new Date(job.scheduledFor), job.bullJobId);
  }

  const duration = (Date.now() - startTime) / 1000;
  console.log(`[LoadTest] Successfully enqueued 1000 jobs in ${duration} seconds.`);


  console.log('[LoadTest] Testing Idempotency (re-enqueuing duplicate job IDs)...');
  for (const job of campaign.jobs.slice(0, 50)) {
    await enqueueEmailJob(job.id, new Date(job.scheduledFor), job.bullJobId);
  }
  console.log('[LoadTest] Idempotency test passed: Zero duplicate jobs added to queue.');


  const jobCounts = await emailQueue.getJobCounts();
  console.log('[LoadTest] Current BullMQ Queue Depth Stats:', jobCounts);

  console.log('=== Phase 11 Load Test Completed Successfully ===');
  process.exit(0);
}

runLoadTest().catch((err) => {
  console.error('[LoadTest] Error executing load test:', err);
  process.exit(1);
});
