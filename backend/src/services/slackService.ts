import axios from 'axios';

// slack par rate limit alert send krne ke liye
export async function sendRateLimitSlackAlert(
    senderEmail: string,
    limit: number,
    webhookUrl?: string
) {
    const url = webhookUrl || process.env.SLACK_WEBHOOK_URL;

    if (!url || url.includes('YOUR/WEBHOOK/URL')) {
        console.log('No slack webhook found, skipping alert.');
        return;
    }

    const message = {
        text: `Rate Limit Exceeded Alert: Sender ${senderEmail} reached limit of ${limit} emails per hour.`,
    };

    try {
        await axios.post(url, message);
        console.log(`Slack alert sent for ${senderEmail}`);
    } catch (err: any) {
        console.error('Slack alert error:', err.message);
    }
}
