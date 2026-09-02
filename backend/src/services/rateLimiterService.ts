import Redis from 'ioredis';

const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6380', 10),
});

// env se rate limit liya
const GLOBAL_MAX_PER_HOUR = parseInt(process.env.MAX_EMAILS_PER_HOUR || '200', 10);

const SENDER_MAX_PER_HOUR = parseInt(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER || '50', 10);

export interface RateLimitCheckResult {

    allowed: boolean;
    reason?: string;
    retryAt?: Date;
}

function getCurrentHourBucket(): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const hour = String(now.getUTCHours()).padStart(2, '0');
    return `${year}-${month}-${day}T${hour}`;
}

function getNextHourTime(): Date {
    const nextHour = new Date();
    nextHour.setUTCHours(nextHour.getUTCHours() + 1, 0, 0, 0);
    return nextHour;
}

// sender aur global limit check kr rhe
export async function checkAndConsumeRateLimit(
    senderId: string,
    senderMaxOverride?: number | null
): Promise<RateLimitCheckResult> {
    const hourBucket = getCurrentHourBucket();
    const senderLimit = senderMaxOverride || SENDER_MAX_PER_HOUR;

    const senderKey = `ratelimit:${senderId}:${hourBucket}`;
    const globalKey = `ratelimit:global:${hourBucket}`;

    const currentSenderCount = parseInt((await redis.get(senderKey)) || '0', 10);

    const currentGlobalCount = parseInt((await redis.get(globalKey)) || '0', 10);

    if (currentSenderCount >= senderLimit) {

        console.log(`[RateLimiter] Sender limit hit: ${senderId}`);
        return {
            allowed: false,
            reason: `Sender rate limit exceeded (${senderLimit}/hr)`,
            retryAt: getNextHourTime(),
        };
    }

    if (currentGlobalCount >= GLOBAL_MAX_PER_HOUR) {
        console.log(`[RateLimiter] Global limit hit`);
        return {
            allowed: false,
            reason: `Global rate limit exceeded (${GLOBAL_MAX_PER_HOUR}/hr)`,
            retryAt: getNextHourTime(),
        };
    }

    // redis count badha rhe

    const pipeline = redis.pipeline();
    pipeline.incr(senderKey);
    pipeline.expire(senderKey, 7200);
    pipeline.incr(globalKey);
    pipeline.expire(globalKey, 7200);
    await pipeline.exec();

    return { allowed: true };
}

// slack alert check kr rhe

export async function shouldSendSlackAlert(senderId: string): Promise<boolean> {
    const hourBucket = getCurrentHourBucket();
    const lockKey = `ratelimit:notified:${senderId}:${hourBucket}`;

    const setSuccess = await redis.set(lockKey, 'true', 'EX', 3600, 'NX');
    return setSuccess === 'OK';
}
