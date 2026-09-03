import Redis, { RedisOptions } from 'ioredis';

const redisUrl = process.env.REDIS_URL;

const options: RedisOptions = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
};

if (redisUrl && redisUrl.startsWith('rediss://')) {
    options.tls = { rejectUnauthorized: false };
}

export const redisConnection: Redis = redisUrl
    ? new Redis(redisUrl, options)
    : new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6380', 10),
        ...options,
    });

redisConnection.on('error', (err) => {
    console.error('[Redis Error]', err.message);
});

export const redisClient = redisConnection;

