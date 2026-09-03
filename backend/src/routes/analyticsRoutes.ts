import { Router } from 'express';
import { prisma } from '../config/db';

const router = Router();


router.get('/analytics', async (req, res) => {
  try {
    const { userId, userEmail } = req.query;
    const activeUserId = (req.user as any)?.id || (userId ? String(userId) : undefined);
    const activeUserEmail = (req.user as any)?.email || (userEmail ? String(userEmail) : undefined);

    const userJobWhere: any = {};
    const userCampaignWhere: any = {};

    if (activeUserId) {
      userJobWhere.campaign = { userId: activeUserId };
      userCampaignWhere.userId = activeUserId;
    } else if (activeUserEmail) {
      userJobWhere.campaign = { user: { email: activeUserEmail } };
      userCampaignWhere.user = { email: activeUserEmail };
    }

    const totalCampaigns = await prisma.emailCampaign.count({ where: userCampaignWhere });
    const totalJobs = await prisma.emailJob.count({ where: userJobWhere });

    const sentCount = await prisma.emailJob.count({ where: { ...userJobWhere, status: 'sent' } });
    const failedCount = await prisma.emailJob.count({ where: { ...userJobWhere, status: 'failed' } });
    const delayedCount = await prisma.emailJob.count({ where: { ...userJobWhere, status: 'delayed_rate_limit' } });
    const pendingOnlyCount = await prisma.emailJob.count({ where: { ...userJobWhere, status: 'pending' } });

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
