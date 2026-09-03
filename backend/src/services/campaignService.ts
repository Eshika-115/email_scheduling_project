import { prisma } from '../config/db';

export interface CreateCampaignInput {
  userId?: string;
  subject: string;
  bodyTemplate: string;
  recipientEmails: string[];
  delaySeconds?: number;
  hourlyLimit?: number;
  startTime?: Date | string;
  attachments?: any;
}

// emailjob record in database campaign create
export async function createCampaign(input: CreateCampaignInput) {
  const { userId, subject, bodyTemplate, recipientEmails, delaySeconds = 0, hourlyLimit = 50, startTime, attachments } = input;

  // DB me real user fetch ya create kr rhe
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        googleId: 'google-demo-id-101',
        email: 'eshikamathur01@gmail.com',
        name: 'Eshika Mathur',
      },
    });
  }

  const parsedStartTime = startTime ? new Date(startTime) : new Date();
  const limitVal = Number(hourlyLimit) > 0 ? Number(hourlyLimit) : 50;
  const delayVal = Number(delaySeconds);

  const campaign = await prisma.emailCampaign.create({
    data: {
      userId: user.id,
      subject,
      bodyTemplate,
      delaySeconds: delayVal,
      hourlyLimit: limitVal,
      startTime: parsedStartTime,
      attachments: attachments || [],
      status: 'scheduled',
    },
  });

  // Hourly limit aur delay seconds ke according unique schedule time compute kr rhe
  const jobsData = recipientEmails.map((email, index) => {
    const hourOffset = Math.floor(index / limitVal);
    const intraHourDelaySec = (index % limitVal) * delayVal;

    const totalOffsetMs = (hourOffset * 3600 * 1000) + (intraHourDelaySec * 1000);
    const jobScheduledTime = new Date(parsedStartTime.getTime() + totalOffsetMs);

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

// EmailJob status update kra
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

// fetch kr rhe h bache wale scheduled jobs
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

// fetch kr rhe h jo complete sent jobs h
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
