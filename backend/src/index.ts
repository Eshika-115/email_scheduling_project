import dotenv from 'dotenv';
import path from 'path';

// .env config load kr rhe

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import app from './app';
import { initElasticsearch } from './services/elasticService';
import { rehydrateQueue } from './queues/emailQueue';
import './workers/emailWorker';

const PORT = process.env.PORT || 5000;

async function startServer() {




    await initElasticsearch();
    await rehydrateQueue();


    app.listen(PORT, () => {
        console.log(`[Server] Express API Server running on port ${PORT}`);
        console.log(`[Bull Board] Live Queue Dashboard available at http://localhost:${PORT}/admin/queues`);
    });
}

startServer();
