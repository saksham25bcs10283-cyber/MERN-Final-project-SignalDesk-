import { Router } from 'express';
import { query } from '../db/index.js';
import { syncInsightsFromFeedback, getEnrichedInsights } from '../services/insights.js';

const router = Router();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(id) {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

/**
 * GET /api/insights
 * Returns all evidence-backed insights with supporting signal counts, sentiment breakdown, and real quotes.
 */
router.get('/', async (req, res, next) => {
  try {
    const insights = await getEnrichedInsights();
    res.status(200).json({
      status: 'success',
      data: insights,
      total: insights.length,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/insights/generate
 * Triggers idempotent aggregation of categorized feedback into evidence-backed insights.
 */
router.post('/generate', async (req, res, next) => {
  try {
    const result = await syncInsightsFromFeedback();
    res.status(200).json({
      status: 'success',
      data: result.insights,
      message: result.message,
      count: result.generated,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/insights/:id
 * Returns a single insight by ID with its linked feedback evidence.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid insight ID format. Must be a valid UUID.',
      });
    }

    const insights = await getEnrichedInsights(id);
    if (!insights || insights.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Insight not found.',
      });
    }

    res.status(200).json({
      status: 'success',
      data: insights[0],
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/insights/:id
 * Deletes an insight and cascades to insight_feedback junction records.
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid insight ID format. Must be a valid UUID.',
      });
    }

    const deleteRes = await query('DELETE FROM insights WHERE id = $1 RETURNING id;', [id]);

    if (deleteRes.rowCount === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Insight not found.',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Insight deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
