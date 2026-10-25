import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
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
