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
  const nonExistentUUID = '00000000-0000-0000-0000-000000000000';

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
