import { Router } from 'express';

const router = Router();

/**
 * GET /api/health
 * Returns status indicating the API is online and operational.
 */
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'SignalDesk API is operational',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime())
  });
});

export default router;
