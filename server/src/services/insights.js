import { query, withTransaction } from '../db/index.js';

const CATEGORY_TITLES = {
  Performance: 'Dashboard Performance & Latency',
  Bug: 'Application Bugs & System Defects',
  UX: 'User Experience & Navigation Flow',
  Billing: 'Billing & Subscription Management',
  'Feature Request': 'Feature Requests & Enhancements',
  Security: 'Security & Access Control',
  Onboarding: 'User Onboarding & Activation Friction',
  Integration: 'Third-Party Integrations & API Access',
};

/**
 * Normalizes a category string to title case.
 */
export function normalizeCategory(raw) {
  if (!raw || typeof raw !== 'string') return 'General';
  const trimmed = raw.trim();
  if (!trimmed) return 'General';
  return trimmed
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Calculates insight severity based on urgency and sentiment breakdowns.
 * Must be one of: 'low', 'medium', 'high', 'critical'
 */
export function calculateSeverity(urgencyBreakdown, sentimentBreakdown, totalCount) {
  if (urgencyBreakdown.critical > 0) {
    return 'critical';
  }
  if (urgencyBreakdown.high >= 2 && sentimentBreakdown.negative > sentimentBreakdown.positive) {
    return 'critical';
  }
  if (urgencyBreakdown.high >= 1 || (sentimentBreakdown.negative / totalCount) >= 0.5) {
    return 'high';
  }
  if (urgencyBreakdown.medium >= 1 || (sentimentBreakdown.negative / totalCount) >= 0.25) {
    return 'medium';
  }
  return 'low';
}

/**
 * Generates an evidence-backed factual description based on actual customer quotes.
 */
function generateDescription(categoryName, items, sentimentBreakdown) {
  const total = items.length;
  const negCount = sentimentBreakdown.negative;
  const negPct = Math.round((negCount / total) * 100);

  const representative = items.find((it) => it.summary && it.summary.trim()) || items[0];
  const quoteSnippet = representative?.summary || representative?.content?.slice(0, 100);

  let desc = `${total} customer signal${total > 1 ? 's' : ''} analyzed for ${categoryName} (${negPct}% negative sentiment).`;
  if (quoteSnippet) {
    desc += ` Primary customer quote: "${quoteSnippet.trim()}"`;
  }
  return desc;
}

/**
 * Generates an actionable recommendation based on severity and category.
 */
function generateRecommendation(categoryName, severity, count) {
  if (severity === 'critical' || severity === 'high') {
    return `Immediate remediation recommended for ${categoryName}. Prioritize resolving ${count} customer-reported blockers and track resolution via targeted engineering actions.`;
  }
  if (severity === 'medium') {
    return `Review ${count} customer signal${count > 1 ? 's' : ''} in ${categoryName} to address common friction points in the next product cycle.`;
  }
  return `Monitor incoming feedback for ${categoryName} to maintain positive satisfaction levels.`;
}

/**
 * Synchronizes and generates evidence-backed insights deterministically from classified feedback.
 * Idempotent: repeated calls update existing insights and avoid duplicate records or links.
 */
export async function syncInsightsFromFeedback() {
  // 1. Fetch all feedback that has been categorized
  const feedbackRes = await query(
    `SELECT id, content, source, sentiment, category, urgency, summary, classified_at, created_at
     FROM feedback
     WHERE category IS NOT NULL AND TRIM(category) != ''
     ORDER BY created_at DESC;`
  );

  const feedbackRows = feedbackRes.rows;
  if (feedbackRows.length === 0) {
    return {
      generated: 0,
      insights: [],
      message: 'No categorized feedback available to generate insights. Classify feedback in the Inbox first.',
    };
  }

  // 2. Group feedback by normalized category
  const groupsByCategory = new Map();
  for (const row of feedbackRows) {
    const normalized = normalizeCategory(row.category);
    if (!groupsByCategory.has(normalized)) {
      groupsByCategory.set(normalized, []);
    }
    groupsByCategory.get(normalized).push(row);
  }

  // 3. Perform idempotent synchronization inside a database transaction
  return await withTransaction(async (client) => {
    // Acquire transaction-scoped advisory lock to prevent concurrent duplicate generation runs
    await client.query("SELECT pg_advisory_xact_lock(hashtext('signaldesk_insights_generate'));");

    // Fetch existing insights to match by title
    const existingInsightsRes = await client.query('SELECT id, title FROM insights;');
    const existingByTitle = new Map();
    for (const row of existingInsightsRes.rows) {
      existingByTitle.set(row.title, row.id);
    }

    const activeInsightIds = new Set();

    for (const [categoryName, items] of groupsByCategory.entries()) {
      const totalCount = items.length;
      const sentimentBreakdown = { positive: 0, neutral: 0, negative: 0 };
      const urgencyBreakdown = { low: 0, medium: 0, high: 0, critical: 0 };

      items.forEach((item) => {
        if (sentimentBreakdown[item.sentiment] !== undefined) {
          sentimentBreakdown[item.sentiment]++;
        }
        if (urgencyBreakdown[item.urgency] !== undefined) {
          urgencyBreakdown[item.urgency]++;
        }
      });

      const title = CATEGORY_TITLES[categoryName] || `${categoryName} Feedback & Themes`;
      const severity = calculateSeverity(urgencyBreakdown, sentimentBreakdown, totalCount);
      const description = generateDescription(categoryName, items, sentimentBreakdown);
      const recommendation = generateRecommendation(categoryName, severity, totalCount);

      let insightId = existingByTitle.get(title);

      if (insightId) {
        // Update existing insight
        await client.query(
          `UPDATE insights
           SET description = $1, severity = $2, recommendation = $3, updated_at = NOW()
           WHERE id = $4;`,
          [description, severity, recommendation, insightId]
        );
      } else {
        // Insert new insight
        const insertRes = await client.query(
          `INSERT INTO insights (title, description, severity, recommendation)
           VALUES ($1, $2, $3, $4)
           RETURNING id;`,
          [title, description, severity, recommendation]
        );
        insightId = insertRes.rows[0].id;
      }

      activeInsightIds.add(insightId);

      // Refresh junction table links for this insight
      await client.query('DELETE FROM insight_feedback WHERE insight_id = $1;', [insightId]);

      for (const item of items) {
        await client.query(
          `INSERT INTO insight_feedback (insight_id, feedback_id)
           VALUES ($1, $2)
           ON CONFLICT (insight_id, feedback_id) DO NOTHING;`,
          [insightId, item.id]
        );
      }
    }

    // Clean up stale insights that no longer have any supporting feedback links
    if (activeInsightIds.size > 0) {
      const activeArray = Array.from(activeInsightIds);
      await client.query(
        `DELETE FROM insights WHERE id NOT IN (SELECT unnest($1::uuid[]));`,
        [activeArray]
      );
    }

    // Return all enriched insights
    const enriched = await getEnrichedInsightsInternal(client);
    return {
      generated: enriched.length,
      insights: enriched,
      message: `Successfully synchronized ${enriched.length} evidence-backed insight themes.`,
    };
  });
}

/**
 * Retrieves all enriched insights with supporting feedback count, percentages, breakdowns, and quotes.
 */
export async function getEnrichedInsights(insightId = null) {
  return await getEnrichedInsightsInternal(null, insightId);
}

/**
 * Internal query runner for enriched insights, supporting either a transaction client or the global pool query.
 */
async function getEnrichedInsightsInternal(client, insightId = null) {
  const runQuery = client ? (text, params) => client.query(text, params) : query;

  let queryText = `
    SELECT
      i.id,
      i.title,
      i.description,
      i.severity,
      i.recommendation,
      i.created_at,
      i.updated_at,
      COUNT(ifb.feedback_id)::int AS count
    FROM insights i
    LEFT JOIN insight_feedback ifb ON i.id = ifb.insight_id
  `;

  const params = [];
  if (insightId) {
    params.push(insightId);
    queryText += ` WHERE i.id = $1 `;
  }
  queryText += ` GROUP BY i.id ORDER BY count DESC, i.created_at DESC;`;

  const insightsRes = await runQuery(queryText, params);
  if (insightsRes.rows.length === 0) {
    return [];
  }

  // Get total classified feedback count in system to calculate accurate percentages
  const totalRes = await runQuery(
    `SELECT COUNT(*)::int AS total FROM feedback WHERE category IS NOT NULL AND TRIM(category) != '';`
  );
  const totalClassified = totalRes.rows[0]?.total || 0;

  // Fetch linked feedback details
  const insightIds = insightsRes.rows.map((row) => row.id);
  const feedbackRes = await runQuery(
    `SELECT
       ifb.insight_id,
       f.id,
       f.content,
       f.source,
       f.sentiment,
       f.urgency,
       f.category,
       f.summary,
       f.created_at
     FROM insight_feedback ifb
     JOIN feedback f ON ifb.feedback_id = f.id
     WHERE ifb.insight_id = ANY($1::uuid[])
     ORDER BY f.created_at DESC;`,
    [insightIds]
  );

  // Group feedback by insight_id
  const feedbackByInsight = new Map();
  for (const row of feedbackRes.rows) {
    if (!feedbackByInsight.has(row.insight_id)) {
      feedbackByInsight.set(row.insight_id, []);
    }
    feedbackByInsight.get(row.insight_id).push(row);
  }

  return insightsRes.rows.map((insight) => {
    const linkedFeedback = feedbackByInsight.get(insight.id) || [];
    const count = linkedFeedback.length;
    const percent = totalClassified > 0 ? Math.round((count / totalClassified) * 100) : 0;

    const sentiment_breakdown = { positive: 0, neutral: 0, negative: 0 };
    const urgency_breakdown = { low: 0, medium: 0, high: 0, critical: 0 };

    linkedFeedback.forEach((f) => {
      if (sentiment_breakdown[f.sentiment] !== undefined) {
        sentiment_breakdown[f.sentiment]++;
      }
      if (urgency_breakdown[f.urgency] !== undefined) {
        urgency_breakdown[f.urgency]++;
      }
    });

    const quotes = linkedFeedback.map((f) => ({
      id: f.id,
      text: f.content,
      summary: f.summary,
      content: f.content,
      source: f.source,
      sentiment: f.sentiment,
      urgency: f.urgency,
      created_at: f.created_at,
    }));

    return {
      id: insight.id,
      title: insight.title,
      description: insight.description,
      severity: insight.severity,
      recommendation: insight.recommendation,
      count,
      percent,
      sentiment_breakdown,
      urgency_breakdown,
      quotes,
      feedback_ids: linkedFeedback.map((f) => f.id),
      created_at: insight.created_at,
      updated_at: insight.updated_at,
    };
  });
}
