import nodemailer from 'nodemailer';
import { Sender } from '@prisma/client';
import { prisma } from '../config/db';

// ethereal acc store data in database
export async function createEtherealAccountForUser(userId: string) {
  const testAccount = await nodemailer.createTestAccount();

  const sender = await prisma.sender.create({
    data: {
      userId,
      email: testAccount.user,
      smtpConfig: {
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        user: testAccount.user,
        pass: testAccount.pass,
      },
      maxEmailsPerHour: 50,
    },
  });

  return sender;
}

export interface SendEmailPayload {
  sender: Sender;
  to: string;
  subject: string;
  html: string;
}

// send email
export async function sendEmailViaSmtp(payload: SendEmailPayload) {
  const { sender, to, subject, html } = payload;
  const config = sender.smtpConfig as { host: string; port: number; user: string; pass: string };

  const transporter = nodemailer.createTransport({
    host: config.host || 'smtp.ethereal.email',
    port: Number(config.port) || 587,
    secure: false,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  const info = await transporter.sendMail({
    from: `"Email Scheduler" <${sender.email}>`,
    to,
    subject,
    html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);

  return {
    messageId: info.messageId,
    previewUrl: previewUrl || undefined,
  };
}

export async function getNextRoundrobinSender(userId: string, jobIndex: number): Promise<Sender> {
  let senders = await prisma.sender.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });

  if (senders.length === 0) {
    // Create dedicated sender for this specific userId
    const testAccount = await nodemailer.createTestAccount().catch(() => null);
    const senderEmail = testAccount ? testAccount.user : `sender-${userId.slice(0, 8)}@ethereal.email`;
    const smtpConfig = testAccount ? {
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      user: testAccount.user,
      pass: testAccount.pass,
    } : {
      host: 'smtp.ethereal.email',
      port: 587,
      user: senderEmail,
      pass: 'testpass123',
    };

    const newSender = await prisma.sender.create({
      data: {
        userId,
        email: senderEmail,
        smtpConfig,
        maxEmailsPerHour: 1000,
      },
    });
    return newSender;
  }

  return senders[jobIndex % senders.length];
}