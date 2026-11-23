import assert from 'node:assert/strict';
import { once } from 'node:events';
import test, { after, before } from 'node:test';
import app from '../src/app';
import { closeDatabaseConnection } from '../src/db/client';

const server = app.listen(0);
let baseUrl: string;

before(async () => {
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Test server did not bind to a TCP port.');
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  server.close();
  await once(server, 'close');
  await closeDatabaseConnection();
});

test('health check remains public and returns the existing response', async () => {
  const response = await fetch(`${baseUrl}/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
});

test('Vercel API rewrite restores the original POST path', async () => {
  const previousVercelValue = process.env.VERCEL;
  process.env.VERCEL = '1';

  try {
    const response = await fetch(`${baseUrl}/api/index?__teckup_path=auth/google`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'A Google identity token is required.' });
  } finally {
    if (previousVercelValue === undefined) {
      delete process.env.VERCEL;
    } else {
      process.env.VERCEL = previousVercelValue;
    }
  }
});

test('protected routes reject missing bearer tokens before database access', async () => {
  const response = await fetch(`${baseUrl}/repair-requests`);

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'A valid bearer token is required.' });
  assert.equal(response.headers.get('www-authenticate'), 'Bearer');
});

test('Google auth route is public but requires an identity token', async () => {
  const response = await fetch(`${baseUrl}/auth/google`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'A Google identity token is required.' });
});

test('Google web configuration exposes only the configured client ID', async () => {
  const previousClientId = process.env.GOOGLE_CLIENT_ID;
  const previousLegacyClientId = process.env.GOOGLE_WEB_CLIENT_ID;
  process.env.GOOGLE_CLIENT_ID = 'web-client-id.apps.googleusercontent.com';
  delete process.env.GOOGLE_WEB_CLIENT_ID;

  try {
    const response = await fetch(`${baseUrl}/auth/google/config`);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      clientId: 'web-client-id.apps.googleusercontent.com',
    });
  } finally {
    if (previousClientId === undefined) {
      delete process.env.GOOGLE_CLIENT_ID;
    } else {
      process.env.GOOGLE_CLIENT_ID = previousClientId;
    }
    if (previousLegacyClientId === undefined) {
      delete process.env.GOOGLE_WEB_CLIENT_ID;
    } else {
      process.env.GOOGLE_WEB_CLIENT_ID = previousLegacyClientId;
    }
  }
});
