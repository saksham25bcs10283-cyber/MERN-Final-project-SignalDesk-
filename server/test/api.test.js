import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
dotenv.config();

import app from '../src/app.js';

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

describe('API Health and Routing', () => {
  test('GET /api/health returns 200 and operational status', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.equal(body.message, 'SignalDesk API is operational');
    assert.ok(body.timestamp);
  });

  test('GET /api/unknown returns 404 with error message', async () => {
    const res = await fetch(`${baseUrl}/api/unknown`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.status, 'error');
    assert.ok(body.message.includes('Route not found'));
  });
});

describe('Validation on Feedback Endpoints', () => {
  test('GET /api/feedback/:id rejects invalid UUID with 400', async () => {
    const res = await fetch(`${baseUrl}/api/feedback/not-a-valid-uuid`);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.status, 'error');
    assert.ok(body.message.includes('Invalid feedback ID format'));
  });

  test('POST /api/feedback rejects empty body with 400 validation error', async () => {
    const res = await fetch(`${baseUrl}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.status, 'error');
    assert.ok(Array.isArray(body.errors));
    assert.ok(body.errors.some((e) => e.includes('content')));
  });

  test('POST /api/feedback rejects invalid sentiment value with 400', async () => {
    const res = await fetch(`${baseUrl}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Valid content text',
        sentiment: 'extremely-happy', // Invalid
      }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.status, 'error');
    assert.ok(body.errors.some((e) => e.includes('sentiment')));
  });

  test('POST /api/feedback rejects invalid urgency value with 400', async () => {
    const res = await fetch(`${baseUrl}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Valid content text',
        urgency: 'super-urgent', // Invalid
      }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.status, 'error');
    assert.ok(body.errors.some((e) => e.includes('urgency')));
  });

  test('PATCH /api/feedback/:id rejects invalid UUID with 400', async () => {
    const res = await fetch(`${baseUrl}/api/feedback/bad-id`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Updated' }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.status, 'error');
    assert.ok(body.message.includes('Invalid feedback ID format'));
  });

  test('PATCH /api/feedback/:id rejects empty payload with 400', async () => {
    const validUUID = '11111111-2222-3333-8888-999999999999';
    const res = await fetch(`${baseUrl}/api/feedback/${validUUID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.status, 'error');
    assert.ok(body.message.includes('At least one editable field'));
  });

  test('DELETE /api/feedback/:id rejects invalid UUID with 400', async () => {
    const res = await fetch(`${baseUrl}/api/feedback/invalid-uuid`, {
      method: 'DELETE',
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.status, 'error');
    assert.ok(body.message.includes('Invalid feedback ID format'));
  });
});

describe('Database Unconfigured Handling', () => {
  test('GET /api/feedback returns 503 when DATABASE_URL is unconfigured', async () => {
    const res = await fetch(`${baseUrl}/api/feedback`);
    if (!process.env.DATABASE_URL) {
      assert.equal(res.status, 503);
      const body = await res.json();
      assert.ok(body.message.includes('Database is not configured'));
    }
  });
});

describe('AI Feedback Classification Endpoints', () => {
  const nonExistentUUID = '123e4567-e89b-42d3-a456-426614174000';

  test('POST /api/feedback/:id/classify rejects invalid UUID with 400', async () => {
    const res = await fetch(`${baseUrl}/api/feedback/not-a-valid-uuid/classify`, {
      method: 'POST',
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.status, 'error');
    assert.ok(body.message.includes('Invalid feedback ID format'));
  });

  test('POST /api/feedback/:id/classify returns 404 for non-existent record', async () => {
    const res = await fetch(`${baseUrl}/api/feedback/${nonExistentUUID}/classify`, {
      method: 'POST',
    });
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.status, 'error');
    assert.ok(body.message.includes('not found'));
  });

  test('POST /api/feedback/:id/classify returns 503 when OPENAI_API_KEY is unconfigured', async () => {
    // Ensure no mock provider and clear OPENAI_API_KEY temporarily
    const originalKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const { resetAIProvider } = await import('../src/services/ai.js');
    resetAIProvider();

    // Create a real record to test classification endpoint on
    const createRes = await fetch(`${baseUrl}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Unconfigured test content',
        source: 'Intercom',
      }),
    });

    if (createRes.status === 201) {
      const { data: created } = await createRes.json();
      const classifyRes = await fetch(`${baseUrl}/api/feedback/${created.id}/classify`, {
        method: 'POST',
      });
      assert.equal(classifyRes.status, 503);
      const body = await classifyRes.json();
      assert.ok(body.message.includes('AI classification is not configured'));

      // Clean up
      await fetch(`${baseUrl}/api/feedback/${created.id}`, { method: 'DELETE' });
    }

    if (originalKey) process.env.OPENAI_API_KEY = originalKey;
  });

  test('POST /api/feedback/:id/classify successfully classifies with mocked LLM provider', async () => {
    const { setAIProvider, resetAIProvider } = await import('../src/services/ai.js');

    // Mock LLM provider
    setAIProvider(async (content) => {
      assert.ok(content.includes('Slow load time'));
      return {
        sentiment: 'negative',
        category: 'performance',
        urgency: 'high',
        summary: 'Dashboard is loading too slowly on login',
      };
    });

    // 1. Create a feedback record
    const createRes = await fetch(`${baseUrl}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Slow load time: The app takes 10 seconds to load on login.',
        source: 'Intercom',
      }),
    });

    assert.equal(createRes.status, 201);
    const { data: created } = await createRes.json();
    assert.equal(created.classified_at, null);

    // 2. Classify the feedback record
    const classifyRes = await fetch(`${baseUrl}/api/feedback/${created.id}/classify`, {
      method: 'POST',
    });
    assert.equal(classifyRes.status, 200);
    const classifyBody = await classifyRes.json();
    assert.equal(classifyBody.status, 'success');
    assert.equal(classifyBody.data.sentiment, 'negative');
    assert.equal(classifyBody.data.category, 'performance');
    assert.equal(classifyBody.data.urgency, 'high');
    assert.equal(classifyBody.data.summary, 'Dashboard is loading too slowly on login');
    assert.ok(classifyBody.data.classified_at);

    // 3. Prevent accidental reclassification (should return 409 Conflict)
    const duplicateRes = await fetch(`${baseUrl}/api/feedback/${created.id}/classify`, {
      method: 'POST',
    });
    assert.equal(duplicateRes.status, 409);
    const duplicateBody = await duplicateRes.json();
    assert.equal(duplicateBody.status, 'error');
    assert.ok(duplicateBody.message.includes('already been classified'));

    // 4. Explicit reclassification with { reclassify: true }
    setAIProvider(async () => ({
      sentiment: 'neutral',
      category: 'performance',
      urgency: 'medium',
      summary: 'Reclassified: App latency observed',
    }));

    const forceRes = await fetch(`${baseUrl}/api/feedback/${created.id}/classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reclassify: true }),
    });
    assert.equal(forceRes.status, 200);
    const forceBody = await forceRes.json();
    assert.equal(forceBody.data.sentiment, 'neutral');
    assert.equal(forceBody.data.urgency, 'medium');

    // Clean up
    await fetch(`${baseUrl}/api/feedback/${created.id}`, { method: 'DELETE' });
    resetAIProvider();
  });

  test('POST /api/feedback/:id/classify rejects invalid model output safely', async () => {
    const { setAIProvider, resetAIProvider } = await import('../src/services/ai.js');

    // Mock provider returning malformed data
    setAIProvider(async () => ({
      sentiment: 'unknown-sentiment-value', // Invalid
      category: 'performance',
      urgency: 'low',
      summary: 'Summary',
    }));

    const createRes = await fetch(`${baseUrl}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Feedback for invalid model output test',
        source: 'Slack',
      }),
    });

    const { data: created } = await createRes.json();

    const classifyRes = await fetch(`${baseUrl}/api/feedback/${created.id}/classify`, {
      method: 'POST',
    });
    assert.equal(classifyRes.status, 500);
    const body = await classifyRes.json();
    assert.equal(body.status, 'error');
    assert.ok(body.message.includes('Invalid sentiment'));

    // Clean up
    await fetch(`${baseUrl}/api/feedback/${created.id}`, { method: 'DELETE' });
    resetAIProvider();
  });

  test('POST /api/feedback/:id/classify handles provider failure with safe error message', async () => {
    const { setAIProvider, resetAIProvider } = await import('../src/services/ai.js');

    // Mock provider throwing a provider failure
    setAIProvider(async () => {
      const err = new Error('Upstream LLM server timeout');
      err.statusCode = 504;
      throw err;
    });

    const createRes = await fetch(`${baseUrl}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Feedback for provider failure test',
        source: 'Email',
      }),
    });

    const { data: created } = await createRes.json();

    const classifyRes = await fetch(`${baseUrl}/api/feedback/${created.id}/classify`, {
      method: 'POST',
    });
    assert.equal(classifyRes.status, 504);
    const body = await classifyRes.json();
    assert.equal(body.status, 'error');
    assert.ok(body.message.includes('timeout'));

    // Clean up
    await fetch(`${baseUrl}/api/feedback/${created.id}`, { method: 'DELETE' });
    resetAIProvider();
  });
});

describe('Evidence-Backed Insights Endpoints', () => {
  const nonExistentUUID = '00000000-0000-0000-0000-000000000000';

  test('GET /api/insights/:id rejects invalid UUID with 400', async () => {
    const res = await fetch(`${baseUrl}/api/insights/not-a-valid-uuid`);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.status, 'error');
    assert.ok(body.message.includes('Invalid insight ID format'));
  });

  test('GET /api/insights/:id returns 404 for non-existent insight', async () => {
    const res = await fetch(`${baseUrl}/api/insights/${nonExistentUUID}`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.status, 'error');
    assert.ok(body.message.includes('not found'));
  });

  test('DELETE /api/insights/:id rejects invalid UUID with 400', async () => {
    const res = await fetch(`${baseUrl}/api/insights/not-a-valid-uuid`, {
      method: 'DELETE',
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.status, 'error');
    assert.ok(body.message.includes('Invalid insight ID format'));
  });

  test('DELETE /api/insights/:id returns 404 for non-existent insight', async () => {
    const res = await fetch(`${baseUrl}/api/insights/${nonExistentUUID}`, {
      method: 'DELETE',
    });
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.status, 'error');
    assert.ok(body.message.includes('not found'));
  });

  test('GET /api/insights returns 200 with insights array', async () => {
    const res = await fetch(`${baseUrl}/api/insights`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'success');
    assert.ok(Array.isArray(body.data));
  });

  test('POST /api/insights/generate idempotently clusters feedback and links evidence', async () => {
    // 1. Seed two feedback records in 'Performance' and one in 'Billing'
    const fb1Res = await fetch(`${baseUrl}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Dashboard takes 12 seconds to load queries on login.',
        source: 'Intercom',
        category: 'Performance',
        sentiment: 'negative',
        urgency: 'high',
        summary: 'Dashboard query latency is 12s on login',
      }),
    });
    assert.equal(fb1Res.status, 201);
    const { data: fb1 } = await fb1Res.json();

    const fb2Res = await fetch(`${baseUrl}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Reports endpoint times out during weekly review.',
        source: 'Email',
        category: 'Performance',
        sentiment: 'neutral',
        urgency: 'medium',
        summary: 'Reports endpoint times out on weekly run',
      }),
    });
    assert.equal(fb2Res.status, 201);
    const { data: fb2 } = await fb2Res.json();

    const fb3Res = await fetch(`${baseUrl}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Invoice download was fast and clean, very happy with billing.',
        source: 'Slack',
        category: 'Billing',
        sentiment: 'positive',
        urgency: 'low',
        summary: 'Invoice download works smoothly',
      }),
    });
    assert.equal(fb3Res.status, 201);
    const { data: fb3 } = await fb3Res.json();

    try {
      // 2. Generate insights
      const genRes1 = await fetch(`${baseUrl}/api/insights/generate`, {
        method: 'POST',
      });
      assert.equal(genRes1.status, 200);
      const genBody1 = await genRes1.json();
      assert.equal(genBody1.status, 'success');
      assert.ok(genBody1.data.length >= 2);

      const perfInsight = genBody1.data.find((i) => i.title.toLowerCase().includes('performance'));
      assert.ok(perfInsight, 'Performance insight must be generated');
      assert.ok(perfInsight.count >= 2, 'Performance insight must link at least 2 feedback records');
      assert.ok(perfInsight.feedback_ids.includes(fb1.id));
      assert.ok(perfInsight.feedback_ids.includes(fb2.id));
      assert.ok(perfInsight.quotes.some((q) => q.id === fb1.id && q.text.includes('12 seconds')));
      assert.equal(perfInsight.sentiment_breakdown.negative >= 1, true);

      // 3. Test Idempotency: re-running generation must not create duplicate insights or duplicate links
      const genRes2 = await fetch(`${baseUrl}/api/insights/generate`, {
        method: 'POST',
      });
      assert.equal(genRes2.status, 200);
      const genBody2 = await genRes2.json();
      assert.equal(genBody2.data.length, genBody1.data.length);

      const perfInsight2 = genBody2.data.find((i) => i.title.toLowerCase().includes('performance'));
      assert.equal(perfInsight2.id, perfInsight.id, 'Idempotent regeneration must preserve insight ID');
      assert.equal(perfInsight2.count, perfInsight.count, 'Idempotent regeneration must not duplicate links');

      // 4. Fetch single insight by ID
      const singleRes = await fetch(`${baseUrl}/api/insights/${perfInsight.id}`);
      assert.equal(singleRes.status, 200);
      const singleBody = await singleRes.json();
      assert.equal(singleBody.data.id, perfInsight.id);
      assert.ok(singleBody.data.quotes.length >= 2);

      // 5. Delete insight
      const deleteRes = await fetch(`${baseUrl}/api/insights/${perfInsight.id}`, {
        method: 'DELETE',
      });
      assert.equal(deleteRes.status, 200);

      // Verify it's gone
      const verifyGoneRes = await fetch(`${baseUrl}/api/insights/${perfInsight.id}`);
      assert.equal(verifyGoneRes.status, 404);

      // Verify the feedback records themselves were NOT deleted (only junction links cascaded)
      const fbCheckRes = await fetch(`${baseUrl}/api/feedback/${fb1.id}`);
      assert.equal(fbCheckRes.status, 200);
    } finally {
      // Clean up feedback records
      await fetch(`${baseUrl}/api/feedback/${fb1.id}`, { method: 'DELETE' });
      await fetch(`${baseUrl}/api/feedback/${fb2.id}`, { method: 'DELETE' });
      await fetch(`${baseUrl}/api/feedback/${fb3.id}`, { method: 'DELETE' });
    }
  });
});

describe('Action Workflows Endpoints', () => {
  const nonExistentUUID = '00000000-0000-0000-0000-000000000000';

  test('GET /api/actions/stats returns action metrics with safe percentage', async () => {
    const res = await fetch(`${baseUrl}/api/actions/stats`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'success');
    assert.equal(typeof body.data.total, 'number');
    assert.equal(typeof body.data.todo, 'number');
    assert.equal(typeof body.data.in_progress, 'number');
    assert.equal(typeof body.data.done, 'number');
    assert.equal(typeof body.data.pct_completed, 'number');
  });

  test('POST /api/actions rejects missing or empty title with 400', async () => {
    const res = await fetch(`${baseUrl}/api/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'No title provided' }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.status, 'error');
    assert.ok(body.errors.some((e) => e.includes('title')));
  });

  test('POST /api/actions rejects invalid priority with 400', async () => {
    const res = await fetch(`${baseUrl}/api/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Valid title',
        priority: 'super-urgent', // Invalid, must be low/medium/high/urgent
      }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.status, 'error');
    assert.ok(body.errors.some((e) => e.includes('priority')));
  });

  test('POST /api/actions rejects invalid status with 400', async () => {
    const res = await fetch(`${baseUrl}/api/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Valid title',
        status: 'archived', // Invalid, must be todo/in_progress/done/cancelled
      }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.status, 'error');
    assert.ok(body.errors.some((e) => e.includes('status')));
  });

  test('POST /api/actions rejects non-existent insight_id with 400', async () => {
    const res = await fetch(`${baseUrl}/api/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Action linking to fake insight',
        insight_id: nonExistentUUID,
      }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.status, 'error');
    assert.ok(body.errors.some((e) => e.includes('Referenced insight')));
  });

  test('GET /api/actions/:id rejects invalid UUID with 400', async () => {
    const res = await fetch(`${baseUrl}/api/actions/invalid-uuid`);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.status, 'error');
    assert.ok(body.message.includes('Invalid action ID format'));
  });

  test('GET /api/actions/:id returns 404 for non-existent action', async () => {
    const res = await fetch(`${baseUrl}/api/actions/${nonExistentUUID}`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.status, 'error');
    assert.ok(body.message.includes('not found'));
  });

  test('PATCH /api/actions/:id rejects empty payload with 400', async () => {
    const res = await fetch(`${baseUrl}/api/actions/${nonExistentUUID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.status, 'error');
    assert.ok(body.message.includes('At least one editable field'));
  });

  test('DELETE /api/actions/:id returns 404 for non-existent action', async () => {
    const res = await fetch(`${baseUrl}/api/actions/${nonExistentUUID}`, {
      method: 'DELETE',
    });
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.status, 'error');
    assert.ok(body.message.includes('not found'));
  });

  test('Complete action lifecycle: create linked to insight, list, update, and delete', async () => {
    const { query } = await import('../src/db/index.js');

    // 1. Create a real test insight
    const insRes = await query(
      `INSERT INTO insights (title, description, severity, recommendation)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title;`,
      [
        'Test Insight for Actions',
        'Customer friction identified in onboarding flow.',
        'high',
        'Redesign onboarding screen step 2.',
      ]
    );
    const testInsight = insRes.rows[0];

    try {
      // 2. Create action linked to the insight
      const createRes = await fetch(`${baseUrl}/api/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Redesign onboarding step 2 with clearer CTA',
          description: 'High drop-off reported on step 2.',
          insight_id: testInsight.id,
          priority: 'urgent',
          owner: 'Engineering Team',
          status: 'todo',
        }),
      });

      assert.equal(createRes.status, 201);
      const createBody = await createRes.json();
      assert.equal(createBody.status, 'success');
      const action = createBody.data;
      assert.equal(action.title, 'Redesign onboarding step 2 with clearer CTA');
      assert.equal(action.insight_id, testInsight.id);
      assert.equal(action.insight_title, 'Test Insight for Actions');
      assert.equal(action.priority, 'urgent');
      assert.equal(action.status, 'todo');
      assert.equal(action.owner, 'Engineering Team');

      // 3. List actions with filter
      const listRes = await fetch(`${baseUrl}/api/actions?status=todo&priority=urgent`);
      assert.equal(listRes.status, 200);
      const listBody = await listRes.json();
      assert.ok(listBody.data.some((a) => a.id === action.id));

      // 4. Retrieve single action by ID
      const getRes = await fetch(`${baseUrl}/api/actions/${action.id}`);
      assert.equal(getRes.status, 200);
      const getBody = await getRes.json();
      assert.equal(getBody.data.id, action.id);
      assert.equal(getBody.data.insight_title, 'Test Insight for Actions');

      // 5. Update action (transition to in_progress then done)
      const patchProgRes = await fetch(`${baseUrl}/api/actions/${action.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress', owner: 'Priya Sharma' }),
      });
      assert.equal(patchProgRes.status, 200);
      const patchProgBody = await patchProgRes.json();
      assert.equal(patchProgBody.data.status, 'in_progress');
      assert.equal(patchProgBody.data.owner, 'Priya Sharma');

      const patchDoneRes = await fetch(`${baseUrl}/api/actions/${action.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' }),
      });
      assert.equal(patchDoneRes.status, 200);
      const patchDoneBody = await patchDoneRes.json();
      assert.equal(patchDoneBody.data.status, 'done');

      // 6. Delete action
      const delRes = await fetch(`${baseUrl}/api/actions/${action.id}`, {
        method: 'DELETE',
      });
      assert.equal(delRes.status, 200);

      // Verify deletion
      const verifyRes = await fetch(`${baseUrl}/api/actions/${action.id}`);
      assert.equal(verifyRes.status, 404);
    } finally {
      // Clean up insight
      await query('DELETE FROM insights WHERE id = $1;', [testInsight.id]);
    }
  });
});
