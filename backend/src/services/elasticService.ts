import { Client } from '@elastic/elasticsearch';

const esNode = process.env.ELASTICSEARCH_NODE || 'http://localhost:9200';

export const esClient = new Client({
    node: esNode,
});

const INDEX_NAME = 'email-logs';

export interface EmailLogEvent {
    jobId: string;
    campaignId: string;
    senderId?: string;
    recipientEmail: string;
    status: string;
    errorMessage?: string;
    timestamp?: Date;
}

// elasticsearch index setup kr rhe
export async function initElasticsearch() {
    try {
        const exists = await esClient.indices.exists({ index: INDEX_NAME });
        if (!exists) {
            await esClient.indices.create({
                index: INDEX_NAME,
                mappings: {
                    properties: {
                        jobId: { type: 'keyword' },
                        campaignId: { type: 'keyword' },
                        senderId: { type: 'keyword' },
                        recipientEmail: { type: 'keyword' },
                        status: { type: 'keyword' },
                        errorMessage: { type: 'text' },
                        timestamp: { type: 'date' },
                    },
                },
            });
            console.log(`[Elasticsearch] Index '${INDEX_NAME}' created.`);
        }
    } catch (err: any) {
        console.error('[Elasticsearch] Init failed:', err.message);
    }
}

// email event log kr rhe elasticsearch me
export async function logEmailEvent(event: EmailLogEvent) {
    try {
        await esClient.index({
            index: INDEX_NAME,
            document: {
                ...event,
                timestamp: event.timestamp || new Date(),
            },
        });
        console.log(`[Elasticsearch] Logged for ${event.recipientEmail} (${event.status})`);
    } catch (err: any) {
        console.error('[Elasticsearch] Logging failed:', err.message);
    }
}

// elasticsearch me logs search krne ke liye
export async function searchLogs(recipientEmail?: string, status?: string) {
    try {
        const mustConditions: any[] = [];

        if (recipientEmail) {
            mustConditions.push({ term: { recipientEmail } });
        }
        if (status) {
            mustConditions.push({ term: { status } });
        }

        const response = await esClient.search({
            index: INDEX_NAME,
            query: mustConditions.length > 0 ? { bool: { must: mustConditions } } : { match_all: {} },
        });

        return response.hits.hits.map((hit) => hit._source);
    } catch (err: any) {
        console.error('[Elasticsearch] Search failed:', err.message);
        return [];
    }
}
