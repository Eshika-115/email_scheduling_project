import { Router } from 'express';
import { prisma } from '../config/db';

const router = Router();


router.get('/analytics', async (req, res) => {
  try {
    const totalCampaigns = await prisma.emailCampaign.count();
    const totalJobs = await prisma.emailJob.count();

    const sentCount = await prisma.emailJob.count({ where: { status: 'sent' } });
    const failedCount = await prisma.emailJob.count({ where: { status: 'failed' } });
    const delayedCount = await prisma.emailJob.count({ where: { status: 'delayed_rate_limit' } });
    const pendingOnlyCount = await prisma.emailJob.count({ where: { status: 'pending' } });


    const scheduledCount = pendingOnlyCount + delayedCount;

    res.json({
      summary: {
        totalCampaigns,
        totalJobs,
        sentCount,
        failedCount,
        delayedCount,
        pendingCount: scheduledCount,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
