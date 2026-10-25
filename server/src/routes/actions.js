import { Router } from 'express';
import { query } from '../db/index.js';

const router = Router();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const ALLOWED_STATUSES = ['todo', 'in_progress', 'done', 'cancelled'];

function isValidUUID(id) {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

/**
 * GET /api/actions/stats
 * Returns overall action metrics (total, status breakdowns, completion percentage).
 */
router.get('/stats', async (req, res, next) => {
  try {
    const statsQuery = `
      SELECT
        COUNT(*)::int AS total,
        COUNT(CASE WHEN status = 'todo' THEN 1 END)::int AS todo,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END)::int AS in_progress,
        COUNT(CASE WHEN status = 'done' THEN 1 END)::int AS done,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END)::int AS cancelled
      FROM actions;
    `;
    const result = await query(statsQuery);
    const row = result.rows[0] || { total: 0, todo: 0, in_progress: 0, done: 0, cancelled: 0 };
    const total = row.total || 0;
    const done = row.done || 0;
    const pct_completed = total > 0 ? Math.round((done / total) * 100) : 0;

    res.status(200).json({
      status: 'success',
      data: {
        total,
        todo: row.todo || 0,
        in_progress: row.in_progress || 0,
        done,
        cancelled: row.cancelled || 0,
        pct_completed,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/actions
 * Lists actions with optional filtering by status, priority, or insight_id.
 */
router.get('/', async (req, res, next) => {
  try {
    const { status, priority, insight_id, limit = 100, offset = 0 } = req.query;

    const conditions = [];
    const params = [];

    if (status && typeof status === 'string' && status !== 'All') {
      const normalizedStatus = status.trim().toLowerCase().replace(/-/g, '_');
      if (ALLOWED_STATUSES.includes(normalizedStatus)) {
        params.push(normalizedStatus);
        conditions.push(`a.status = $${params.length}`);
      }
    }

    if (priority && typeof priority === 'string' && priority !== 'All') {
      const normalizedPriority = priority.trim().toLowerCase();
      if (ALLOWED_PRIORITIES.includes(normalizedPriority)) {
        params.push(normalizedPriority);
        conditions.push(`a.priority = $${params.length}`);
      }
    }

    if (insight_id && typeof insight_id === 'string') {
      if (!isValidUUID(insight_id)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid insight ID format. Must be a valid UUID.',
        });
      }
      params.push(insight_id);
      conditions.push(`a.insight_id = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*)::int AS total FROM actions a ${whereClause};`;
    const countRes = await query(countQuery, params);
    const total = countRes.rows[0]?.total ?? 0;

    const parsedLimit = Math.max(1, Math.min(200, parseInt(limit, 10) || 100));
    const parsedOffset = Math.max(0, parseInt(offset, 10) || 0);

    const dataParams = [...params];
    dataParams.push(parsedLimit);
    const limitPlaceholder = `$${dataParams.length}`;
    dataParams.push(parsedOffset);
    const offsetPlaceholder = `$${dataParams.length}`;

    const dataQuery = `
      SELECT
        a.id,
        a.title,
        a.description,
        a.insight_id,
        i.title AS insight_title,
        i.severity AS insight_severity,
        a.owner,
        a.priority,
        a.status,
        a.due_date,
        a.created_at,
        a.updated_at
      FROM actions a
      LEFT JOIN insights i ON a.insight_id = i.id
      ${whereClause}
      ORDER BY
        CASE a.status
          WHEN 'in_progress' THEN 1
          WHEN 'todo' THEN 2
          WHEN 'done' THEN 3
          WHEN 'cancelled' THEN 4
          ELSE 5
        END,
        CASE a.priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END,
        a.created_at DESC
      LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder};
    `;

    const result = await query(dataQuery, dataParams);

    res.status(200).json({
      status: 'success',
      data: result.rows,
      pagination: {
        total,
        limit: parsedLimit,
        offset: parsedOffset,
        hasMore: parsedOffset + result.rows.length < total,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/actions/:id
 * Retrieves a single action by ID.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid action ID format. Must be a valid UUID.',
      });
    }

    const singleQuery = `
      SELECT
        a.id,
        a.title,
        a.description,
        a.insight_id,
        i.title AS insight_title,
        i.severity AS insight_severity,
        a.owner,
        a.priority,
        a.status,
        a.due_date,
        a.created_at,
        a.updated_at
      FROM actions a
      LEFT JOIN insights i ON a.insight_id = i.id
      WHERE a.id = $1;
    `;

    const result = await query(singleQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Action not found.',
      });
    }

    res.status(200).json({
      status: 'success',
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/actions
 * Creates a new action record.
 */
router.post('/', async (req, res, next) => {
  try {
    const { title, description, insight_id, owner, priority = 'medium', status = 'todo', due_date } = req.body;

    const errors = [];

    // Title validation
    if (!title || typeof title !== 'string' || !title.trim()) {
      errors.push('title is required and cannot be empty.');
    } else if (title.trim().length > 255) {
      errors.push('title cannot exceed 255 characters.');
    }

    // Priority validation
    const normalizedPriority = priority ? String(priority).trim().toLowerCase() : 'medium';
    if (!ALLOWED_PRIORITIES.includes(normalizedPriority)) {
      errors.push(`priority must be one of: ${ALLOWED_PRIORITIES.join(', ')}.`);
    }

    // Status validation
    const normalizedStatus = status ? String(status).trim().toLowerCase().replace(/-/g, '_') : 'todo';
    if (!ALLOWED_STATUSES.includes(normalizedStatus)) {
      errors.push(`status must be one of: ${ALLOWED_STATUSES.join(', ')}.`);
    }

    // Owner validation
    if (owner !== undefined && owner !== null) {
      if (typeof owner !== 'string' || owner.trim().length > 100) {
        errors.push('owner must be a string up to 100 characters.');
      }
    }

    // Due date validation
    let parsedDueDate = null;
    if (due_date) {
      const d = new Date(due_date);
      if (Number.isNaN(d.getTime())) {
        errors.push('due_date must be a valid date format.');
      } else {
        parsedDueDate = d.toISOString();
      }
    }

    // Insight foreign key validation
    let validInsightId = null;
    if (insight_id) {
      if (!isValidUUID(insight_id)) {
        errors.push('insight_id must be a valid UUID.');
      } else {
        const checkInsight = await query('SELECT id FROM insights WHERE id = $1;', [insight_id]);
        if (checkInsight.rows.length === 0) {
          errors.push(`Referenced insight with ID '${insight_id}' does not exist.`);
        } else {
          validInsightId = insight_id;
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors,
      });
    }

    const insertQuery = `
      INSERT INTO actions (title, description, insight_id, owner, priority, status, due_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;

    const insertResult = await query(insertQuery, [
      title.trim(),
      description && typeof description === 'string' ? description.trim() : null,
      validInsightId,
      owner && typeof owner === 'string' ? owner.trim() : null,
      normalizedPriority,
      normalizedStatus,
      parsedDueDate,
    ]);

    const createdAction = insertResult.rows[0];

    // Fetch joined insight title if applicable
    if (validInsightId) {
      const insightRes = await query('SELECT title, severity FROM insights WHERE id = $1;', [validInsightId]);
      if (insightRes.rows.length > 0) {
        createdAction.insight_title = insightRes.rows[0].title;
        createdAction.insight_severity = insightRes.rows[0].severity;
      }
    }

    res.status(201).json({
      status: 'success',
      data: createdAction,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/actions/:id
 * Updates editable fields of an action.
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid action ID format. Must be a valid UUID.',
      });
    }

    const { title, description, insight_id, owner, priority, status, due_date } = req.body;

    const allowedFields = ['title', 'description', 'insight_id', 'owner', 'priority', 'status', 'due_date'];
    const fieldsToUpdate = allowedFields.filter((f) => req.body[f] !== undefined);

    if (fieldsToUpdate.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'At least one editable field must be provided.',
      });
    }

    const errors = [];
    const updates = [];
    const values = [];

    // Title
    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        errors.push('title cannot be empty.');
      } else if (title.trim().length > 255) {
        errors.push('title cannot exceed 255 characters.');
      } else {
        values.push(title.trim());
        updates.push(`title = $${values.length}`);
      }
    }

    // Description
    if (description !== undefined) {
      if (description === null || description === '') {
        values.push(null);
        updates.push(`description = $${values.length}`);
      } else if (typeof description === 'string') {
        values.push(description.trim());
        updates.push(`description = $${values.length}`);
      } else {
        errors.push('description must be a string or null.');
      }
    }

    // Owner
    if (owner !== undefined) {
      if (owner === null || owner === '') {
        values.push(null);
        updates.push(`owner = $${values.length}`);
      } else if (typeof owner === 'string' && owner.trim().length <= 100) {
        values.push(owner.trim());
        updates.push(`owner = $${values.length}`);
      } else {
        errors.push('owner must be a string up to 100 characters.');
      }
    }

    // Priority
    if (priority !== undefined) {
      const lower = String(priority).trim().toLowerCase();
      if (ALLOWED_PRIORITIES.includes(lower)) {
        values.push(lower);
        updates.push(`priority = $${values.length}`);
      } else {
        errors.push(`priority must be one of: ${ALLOWED_PRIORITIES.join(', ')}.`);
      }
    }

    // Status
    if (status !== undefined) {
      const normStatus = String(status).trim().toLowerCase().replace(/-/g, '_');
      if (ALLOWED_STATUSES.includes(normStatus)) {
        values.push(normStatus);
        updates.push(`status = $${values.length}`);
      } else {
        errors.push(`status must be one of: ${ALLOWED_STATUSES.join(', ')}.`);
      }
    }

    // Due date
    if (due_date !== undefined) {
      if (due_date === null || due_date === '') {
        values.push(null);
        updates.push(`due_date = $${values.length}`);
      } else {
        const d = new Date(due_date);
        if (Number.isNaN(d.getTime())) {
          errors.push('due_date must be a valid date format.');
        } else {
          values.push(d.toISOString());
          updates.push(`due_date = $${values.length}`);
        }
      }
    }

    // Insight ID
    if (insight_id !== undefined) {
      if (insight_id === null || insight_id === '') {
        values.push(null);
        updates.push(`insight_id = $${values.length}`);
      } else if (!isValidUUID(insight_id)) {
        errors.push('insight_id must be a valid UUID.');
      } else {
        const checkInsight = await query('SELECT id FROM insights WHERE id = $1;', [insight_id]);
        if (checkInsight.rows.length === 0) {
          errors.push(`Referenced insight with ID '${insight_id}' does not exist.`);
        } else {
          values.push(insight_id);
          updates.push(`insight_id = $${values.length}`);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors,
      });
    }

    values.push(id);
    const updateQuery = `
      UPDATE actions
      SET ${updates.join(', ')}
      WHERE id = $${values.length}
      RETURNING *;
    `;

    const updateRes = await query(updateQuery, values);

    if (updateRes.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Action not found.',
      });
    }

    const updated = updateRes.rows[0];

    // Enrich with insight details if linked
    if (updated.insight_id) {
      const insRes = await query('SELECT title, severity FROM insights WHERE id = $1;', [updated.insight_id]);
      if (insRes.rows.length > 0) {
        updated.insight_title = insRes.rows[0].title;
        updated.insight_severity = insRes.rows[0].severity;
      }
    }

    res.status(200).json({
      status: 'success',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/actions/:id
 * Deletes an action record.
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid action ID format. Must be a valid UUID.',
      });
    }

    const deleteRes = await query('DELETE FROM actions WHERE id = $1 RETURNING id;', [id]);

    if (deleteRes.rowCount === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Action not found.',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Action deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
