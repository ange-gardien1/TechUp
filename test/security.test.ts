import assert from 'node:assert/strict';
import test from 'node:test';
import {
  hashLegacyPassword,
  hashPassword,
  issueSessionToken,
  verifyPassword,
  verifySessionToken,
} from '../src/server/security';
import { authorizationFailure } from '../src/server/authorization';

const secret = 'test-secret-that-is-at-least-32-bytes-long';

test('scrypt password hashes verify matching credentials only', async () => {
  const passwordHash = await hashPassword('correct horse battery staple');

  assert.match(passwordHash, /^scrypt\$/);
  assert.deepEqual(await verifyPassword('correct horse battery staple', passwordHash), {
    valid: true,
    needsRehash: false,
  });
  assert.deepEqual(await verifyPassword('wrong password', passwordHash), {
    valid: false,
    needsRehash: false,
  });
});

test('legacy SHA-256 password hashes remain verifiable for login-time rehash', async () => {
  const legacyHash = hashLegacyPassword('legacy password');

  assert.deepEqual(await verifyPassword('legacy password', legacyHash), {
    valid: true,
    needsRehash: true,
  });
  assert.deepEqual(await verifyPassword('different password', legacyHash), {
    valid: false,
    needsRehash: true,
  });
});

test('session tokens reject modification and expiry', () => {
  const issuedAt = 1_800_000_000_000;
  const session = issueSessionToken({ id: 42, role: 'manager' }, secret, issuedAt);

  assert.deepEqual(verifySessionToken(session.token, secret, issuedAt + 1_000), {
    userId: 42,
    role: 'manager',
    issuedAt: Math.floor(issuedAt / 1000),
    expiresAt: session.expiresAt,
  });
  const [header, payload, signature] = session.token.split('.');
  const changedSignature = `${signature[0] === 'a' ? 'b' : 'a'}${signature.slice(1)}`;
  assert.equal(verifySessionToken(`${header}.${payload}.${changedSignature}`, secret, issuedAt + 1_000), null);
  assert.equal(verifySessionToken(session.token, secret, issuedAt + 8 * 60 * 60 * 1000), null);
});

test('session tokens are bound to the signing secret', () => {
  const session = issueSessionToken({ id: 7, role: 'customer' }, secret);

  assert.equal(verifySessionToken(session.token, 'a-different-secret-of-sufficient-length'), null);
});

test('role policies preserve customer quote reads but restrict sensitive actions', () => {
  const customer = { userId: 7, role: 'customer' };
  const manager = { userId: 8, role: 'manager' };

  assert.equal(authorizationFailure('/repair-requests/12/quotes', 'GET', customer), null);
  assert.match(
    authorizationFailure('/repair-requests/12/quotes', 'POST', customer) ?? '',
    /Only an admin or manager/,
  );
  assert.equal(authorizationFailure('/repair-requests/12/close', 'POST', manager), null);
  assert.match(
    authorizationFailure('/repair-requests/12/close', 'POST', customer) ?? '',
    /role cannot perform/,
  );
});

test('identity-scoped route policies prevent cross-user reads', () => {
  assert.match(
    authorizationFailure('/notifications/8', 'GET', { userId: 7, role: 'customer' }) ?? '',
    /own notifications/,
  );
  assert.equal(
    authorizationFailure('/users/7/profile', 'GET', { userId: 7, role: 'customer' }),
    null,
  );
  assert.match(
    authorizationFailure('/users/8/profile', 'GET', { userId: 7, role: 'customer' }) ?? '',
    /own profile/,
  );
  assert.equal(
    authorizationFailure('/technician/dashboard/7', 'GET', { userId: 7, role: 'technician' }),
    null,
  );
  assert.match(
    authorizationFailure('/technician/dashboard/8', 'GET', { userId: 7, role: 'technician' }) ?? '',
    /own technician dashboard/,
  );
});
