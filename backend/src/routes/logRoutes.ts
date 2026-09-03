import { Router } from 'express';
import { searchLogs } from '../services/elasticService';

const router = Router();

// elasticsearch logs search route
router.get('/logs/search', async (req, res) => {
    try {
        const { recipientEmail, status } = req.query;
        const logs = await searchLogs(
            recipientEmail ? String(recipientEmail) : undefined,
            status ? String(status) : undefined
        );
        res.json({ logs });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
