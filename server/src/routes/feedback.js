import { Router } from 'express';
import { query } from '../db/index.js';
import { classifyFeedbackContent } from '../services/ai.js';

const router = Router();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_SENTIMENTS = ['positive', 'neutral', 'negative'];
const ALLOWED_URGENCIES = ['low', 'medium', 'high', 'critical'];

/**
 * Validates a UUID string.
 */
function isValidUUID(id) {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

/**
 * GET /api/feedback
 * List feedback records with optional search, filters, and pagination.
 */
router.get('/', async (req, res, next) => {
  try {
    const { search, category, source, sentiment, urgency, limit = 50, offset = 0 } = req.query;

    const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));
    const parsedOffset = Math.max(0, parseInt(offset, 10) || 0);

    const conditions = [];
    const params = [];

    if (search && typeof search === 'string' && search.trim()) {
      params.push(`%${search.trim()}%`);
      conditions.push(`(content ILIKE $${params.length} OR summary ILIKE $${params.length} OR category ILIKE $${params.length})`);
    }

    if (category && typeof category === 'string' && category !== 'All') {
      params.push(category.trim());
      conditions.push(`category = $${params.length}`);
    }

    if (source && typeof source === 'string' && source !== 'All') {
      params.push(source.trim());
      conditions.push(`source ILIKE $${params.length}`);
    }

    if (sentiment && typeof sentiment === 'string' && sentiment !== 'All') {
      const lower = sentiment.trim().toLowerCase();
      if (ALLOWED_SENTIMENTS.includes(lower)) {
        params.push(lower);
        conditions.push(`sentiment = $${params.length}`);
      }
    }

    if (urgency && typeof urgency === 'string' && urgency !== 'All') {
      const lower = urgency.trim().toLowerCase();
      if (ALLOWED_URGENCIES.includes(lower)) {
        params.push(lower);
        conditions.push(`urgency = $${params.length}`);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count query for pagination
    const countQuery = `SELECT COUNT(*)::int AS total FROM feedback ${whereClause};`;
    const countResult = await query(countQuery, params);
    const total = countResult.rows[0]?.total ?? 0;

    // Data query
    const dataParams = [...params];
    dataParams.push(parsedLimit);
    const limitPlaceholder = `$${dataParams.length}`;
    dataParams.push(parsedOffset);
    const offsetPlaceholder = `$${dataParams.length}`;

    const dataQuery = `
      SELECT id, content, source, sentiment, category, urgency, summary, classified_at, created_at, updated_at
      FROM feedback
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder};
    `;

    const dataResult = await query(dataQuery, dataParams);

    res.status(200).json({
      status: 'success',
      data: dataResult.rows,
      pagination: {
        total,
        limit: parsedLimit,
        offset: parsedOffset,
        hasMore: parsedOffset + dataResult.rows.length < total
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/feedback/:id
 * Retrieve a single feedback record by UUID.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid feedback ID format. Expected a valid UUID.'
      });
    }

    const result = await query(
      `SELECT id, content, source, sentiment, category, urgency, summary, classified_at, created_at, updated_at
       FROM feedback
       WHERE id = $1;`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: `Feedback record with ID '${id}' not found.`
      });
    }

    res.status(200).json({
      status: 'success',
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/feedback
 * Create a new feedback record.
 */
router.post('/', async (req, res, next) => {
  try {
    const { content, source, sentiment, category, urgency, summary } = req.body;

    const errors = [];

    // Validation: content
    const cleanContent = typeof content === 'string' ? content.trim() : (typeof summary === 'string' ? summary.trim() : '');
    if (!cleanContent) {
      errors.push("'content' or 'summary' is required and must not be empty.");
    }

    // Validation: source
    const cleanSource = typeof source === 'string' ? source.trim() : 'Intercom';
    if (!cleanSource || cleanSource.length > 50) {
      errors.push("'source' must be between 1 and 50 characters.");
    }

    // Validation: sentiment
    let cleanSentiment = 'neutral';
    if (sentiment !== undefined && sentiment !== null) {
      const lower = String(sentiment).trim().toLowerCase();
      if (!ALLOWED_SENTIMENTS.includes(lower)) {
        errors.push(`'sentiment' must be one of: ${ALLOWED_SENTIMENTS.join(', ')}.`);
      } else {
        cleanSentiment = lower;
      }
    }

    // Validation: urgency
    let cleanUrgency = 'medium';
    if (urgency !== undefined && urgency !== null) {
      const lower = String(urgency).trim().toLowerCase();
      if (!ALLOWED_URGENCIES.includes(lower)) {
        errors.push(`'urgency' must be one of: ${ALLOWED_URGENCIES.join(', ')}.`);
      } else {
        cleanUrgency = lower;
      }
    }

    // Validation: category
    const cleanCategory = typeof category === 'string' ? category.trim().slice(0, 50) : 'General';
    const cleanSummary = typeof summary === 'string' && summary.trim() ? summary.trim() : cleanContent.slice(0, 160);

    if (errors.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors
      });
    }

    const insertQuery = `
      INSERT INTO feedback (content, source, sentiment, category, urgency, summary)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, content, source, sentiment, category, urgency, summary, classified_at, created_at, updated_at;
    `;

    const result = await query(insertQuery, [
      cleanContent,
      cleanSource,
      cleanSentiment,
      cleanCategory,
      cleanUrgency,
      cleanSummary
    ]);

    res.status(201).json({
      status: 'success',
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/feedback/:id
 * Update editable fields of an existing feedback record.
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid feedback ID format. Expected a valid UUID.'
      });
    }

    const { content, source, sentiment, category, urgency, summary } = req.body;

    const updates = [];
    const params = [id]; // $1 is id
    const errors = [];

    if (content !== undefined) {
      if (typeof content !== 'string' || !content.trim()) {
        errors.push("'content' cannot be empty.");
      } else {
        params.push(content.trim());
        updates.push(`content = $${params.length}`);
      }
    }

    if (source !== undefined) {
      if (typeof source !== 'string' || !source.trim() || source.trim().length > 50) {
        errors.push("'source' must be between 1 and 50 characters.");
      } else {
        params.push(source.trim());
        updates.push(`source = $${params.length}`);
      }
    }

    if (sentiment !== undefined) {
      const lower = String(sentiment).trim().toLowerCase();
      if (!ALLOWED_SENTIMENTS.includes(lower)) {
        errors.push(`'sentiment' must be one of: ${ALLOWED_SENTIMENTS.join(', ')}.`);
      } else {
        params.push(lower);
        updates.push(`sentiment = $${params.length}`);
      }
    }

    if (urgency !== undefined) {
      const lower = String(urgency).trim().toLowerCase();
      if (!ALLOWED_URGENCIES.includes(lower)) {
        errors.push(`'urgency' must be one of: ${ALLOWED_URGENCIES.join(', ')}.`);
      } else {
        params.push(lower);
        updates.push(`urgency = $${params.length}`);
      }
    }

    if (category !== undefined) {
      if (typeof category !== 'string') {
        errors.push("'category' must be a string.");
      } else {
        params.push(category.trim().slice(0, 50));
        updates.push(`category = $${params.length}`);
      }
    }

    if (summary !== undefined) {
      if (typeof summary !== 'string') {
        errors.push("'summary' must be a string.");
      } else {
        params.push(summary.trim());
        updates.push(`summary = $${params.length}`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors
      });
    }

    if (updates.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'At least one editable field must be provided in request body.'
      });
    }

    const updateQuery = `
      UPDATE feedback
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING id, content, source, sentiment, category, urgency, summary, classified_at, created_at, updated_at;
    `;

    const result = await query(updateQuery, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: `Feedback record with ID '${id}' not found.`
      });
    }

    res.status(200).json({
      status: 'success',
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/feedback/:id
 * Delete a feedback record by UUID.
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid feedback ID format. Expected a valid UUID.'
      });
    }

    const result = await query('DELETE FROM feedback WHERE id = $1 RETURNING id;', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: `Feedback record with ID '${id}' not found.`
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Feedback deleted successfully',
      data: { id }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/feedback/:id/classify
 * Classifies feedback content using AI (sentiment, category, urgency, summary).
 * Protects against accidental reclassification unless { force: true } or { reclassify: true } is sent.
 */
router.post('/:id/classify', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { force, reclassify } = req.body || {};

    if (!isValidUUID(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid feedback ID format. Expected a valid UUID.'
      });
    }

    // 1. Fetch current feedback record
    const lookup = await query(
      `SELECT id, content, summary, category, urgency, sentiment, classified_at
       FROM feedback
       WHERE id = $1;`,
      [id]
    );

    if (lookup.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: `Feedback record with ID '${id}' not found.`
      });
    }

    const record = lookup.rows[0];

    // 2. Prevent accidental overwriting of existing classification
    if (record.classified_at && !force && !reclassify) {
      return res.status(409).json({
        status: 'error',
        message: 'Feedback record has already been classified. Provide { "reclassify": true } or { "force": true } to reclassify.',
        data: {
          id: record.id,
          classified_at: record.classified_at
        }
      });
    }

    // 3. Extract text to classify (only necessary customer content)
    const textToClassify = record.content || record.summary;
    if (!textToClassify || !textToClassify.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Feedback record contains no content to classify.'
      });
    }

    // 4. Request and validate structured classification from AI
    const classification = await classifyFeedbackContent(textToClassify);

    // 5. Persist validated classification to the database
    const updateResult = await query(
      `UPDATE feedback
       SET sentiment = $1, category = $2, urgency = $3, summary = $4, classified_at = NOW()
       WHERE id = $5
       RETURNING id, content, source, sentiment, category, urgency, summary, classified_at, created_at, updated_at;`,
      [
        classification.sentiment,
        classification.category,
        classification.urgency,
        classification.summary,
        id
      ]
    );

    res.status(200).json({
      status: 'success',
      message: 'Feedback classified successfully with AI',
      data: updateResult.rows[0]
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        status: 'error',
        message: err.message
      });
    }
    next(err);
  }
});

export default router;
