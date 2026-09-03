import { Router } from 'express';
import { prisma } from '../config/db';
import { createCampaign } from '../services/campaignService';
import { enqueueEmailJob } from '../queues/emailQueue';

const router = Router();

// campaign create & enqueue route
router.post('/campaigns', async (req, res) => {
  try {
    const { userId, subject, bodyTemplate, recipientEmails, delaySeconds, hourlyLimit, startTime, attachments } = req.body;

    if (!subject || !bodyTemplate || !recipientEmails) {
      return res.status(400).json({ error: 'Missing required campaign fields' });
    }

    const campaign = await createCampaign({
      userId,
      subject,
      bodyTemplate,
      recipientEmails,
      delaySeconds,
      hourlyLimit,
      startTime,
      attachments,
    });

    if (campaign && campaign.jobs) {

      for (const job of campaign.jobs) {
        await enqueueEmailJob(job.id, new Date(job.scheduledFor), {
          emailJobId: job.id,
          recipientEmail: job.recipientEmail,
          campaignId: campaign.id,
        });
      }
    }

    res.status(201).json({ success: true, campaign });
  } catch (err: any) {
    console.error('Create campaign error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// campaign detail route

router.get('/campaigns/:id', async (req, res) => {
  try {
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id: req.params.id },
      include: { jobs: true },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json({ campaign });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


router.get('/jobs', async (req, res) => {
  try {
    const { status, campaignId } = req.query;
    const whereClause: any = {};

    if (status) whereClause.status = String(status);
    if (campaignId) whereClause.campaignId = String(campaignId);

    const jobs = await prisma.emailJob.findMany({
      where: whereClause,
      include: { campaign: true },
      orderBy: { scheduledFor: 'asc' },
      take: 2000,
    });

    res.json({ jobs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
