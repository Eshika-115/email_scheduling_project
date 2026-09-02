import { ConnectionOptions } from 'bullmq';

//for redis connection option hai 

export const redisConnection: ConnectionOptions = {

    host: process.env.REDIS_HOST || 'localhost',

    port: parseInt(process.env.REDIS_PORT || '6380', 10),
};
