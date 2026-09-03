import { redisClient as redis } from '../config/redis';
import { prisma } from '../config/db';
import { emailQueue } from '../queues/emailQueue';


async function clearData() {
  console.log('Clearing all load test emails, campaigns, and Redis rate limit counters...');


  await redis.flushall();
  console.log('Flushed all Redis rate limiter counters.');


  await prisma.emailJob.deleteMany({});
  console.log('Cleared all EmailJob DB records');


  await prisma.emailCampaign.deleteMany({});
  console.log('Cleared all EmailCampaign DB records');


  await emailQueue.drain();
  await emailQueue.clean(0, 10000, 'completed');
  await emailQueue.clean(0, 10000, 'failed');
  await emailQueue.clean(0, 10000, 'delayed');
  await emailQueue.clean(0, 10000, 'active');
  console.log('Cleared and drained BullMQ queue.');

  console.log('Database, Queue, and Redis Rate-Limiter are now 100% Clean');
  redis.disconnect();
  process.exit(0);
}

clearData().catch((err) => {
  console.error('Clear error:', err);
  redis.disconnect();
  process.exit(1);
});
