import Redis, { RedisOptions } from 'ioredis';

const cleanEnv = (val?: string) => (val ? val.trim().replace(/^["']|["']$/g, '') : undefined);

const DEFAULT_UPSTASH_REDIS = "rediss://default:gQAAAAAAAY-VAAIgcDIyYzVlNmQ2NzFiYmQ0MmRjOTYwYmRmZjY1MmMxOWVjZQ@firm-sheepdog-102293.upstash.io:6379";

const envUrl = cleanEnv(process.env.REDIS_URL);
const isProduction = process.env.NODE_ENV === 'production' || !!process.env.RENDER || !!process.env.RENDER_SERVICE_ID;

const redisUrl = envUrl || (isProduction || !process.env.REDIS_HOST ? DEFAULT_UPSTASH_REDIS : undefined);

const options: RedisOptions = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
};

if (redisUrl && (redisUrl.startsWith('rediss://') || redisUrl.includes('upstash.io'))) {
    options.tls = { rejectUnauthorized: false };
}

export const redisConnection: Redis = redisUrl
    ? new Redis(redisUrl, options)
    : new Redis({
        host: cleanEnv(process.env.REDIS_HOST) || 'localhost',
        port: parseInt(cleanEnv(process.env.REDIS_PORT) || '6380', 10),
        ...options,
    });

redisConnection.on('error', (err) => {
    console.error('[Redis Error]', err.message);
});

export const redisClient = redisConnection;

