import {
  createHash,
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const SCRYPT_KEY_LENGTH = 64;
const SESSION_DURATION_SECONDS = 8 * 60 * 60;
const LEGACY_SHA256_PATTERN = /^[a-f0-9]{64}$/i;

export type SessionClaims = {
  userId: number;
  role: string;
  issuedAt: number;
  expiresAt: number;
};

export type PasswordVerification = {
  valid: boolean;
  needsRehash: boolean;
};

function safeStringEqual(first: string, second: string) {
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);
  return firstBuffer.length === secondBuffer.length && timingSafeEqual(firstBuffer, secondBuffer);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, SCRYPT_KEY_LENGTH) as Buffer;
  return `scrypt$${salt.toString('base64url')}$${derivedKey.toString('base64url')}`;
}

export async function verifyPassword(password: string, encodedHash: string): Promise<PasswordVerification> {
  if (LEGACY_SHA256_PATTERN.test(encodedHash)) {
    const legacyHash = createHash('sha256').update(password).digest('hex');
    return { valid: safeStringEqual(legacyHash, encodedHash.toLowerCase()), needsRehash: true };
  }

  const [scheme, encodedSalt, encodedKey, extra] = encodedHash.split('$');
  if (scheme !== 'scrypt' || !encodedSalt || !encodedKey || extra !== undefined) {
    return { valid: false, needsRehash: false };
  }

  if (!/^[A-Za-z0-9_-]+$/.test(encodedSalt) || !/^[A-Za-z0-9_-]+$/.test(encodedKey)) {
    return { valid: false, needsRehash: false };
  }
  const salt = Buffer.from(encodedSalt, 'base64url');
  const expectedKey = Buffer.from(encodedKey, 'base64url');
  if (salt.length !== 16 || expectedKey.length !== SCRYPT_KEY_LENGTH) {
    return { valid: false, needsRehash: false };
  }
  const actualKey = await scrypt(password, salt, SCRYPT_KEY_LENGTH) as Buffer;
  return { valid: timingSafeEqual(actualKey, expectedKey), needsRehash: false };
}

function base64UrlJson(value: Record<string, unknown>) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function signatureFor(input: string, secret: string) {
  return createHmac('sha256', secret).update(input).digest('base64url');
}

export function issueSessionToken(
  user: { id: number; role: string },
  secret: string,
  now = Date.now(),
) {
  const issuedAt = Math.floor(now / 1000);
  const expiresAt = issuedAt + SESSION_DURATION_SECONDS;
  const header = base64UrlJson({ alg: 'HS256', typ: 'JWT' });
  const payload = base64UrlJson({ sub: user.id, role: user.role, iat: issuedAt, exp: expiresAt });
  const signingInput = `${header}.${payload}`;
  const token = `${signingInput}.${signatureFor(signingInput, secret)}`;

  return { token, expiresAt };
}

export function verifySessionToken(
  token: string,
  secret: string,
  now = Date.now(),
): SessionClaims | null {
  if (token.length > 4096) return null;
  const segments = token.split('.');
  if (segments.length !== 3) return null;

  const [headerSegment, payloadSegment, suppliedSignature] = segments;
  const signingInput = `${headerSegment}.${payloadSegment}`;
  if (!safeStringEqual(signatureFor(signingInput, secret), suppliedSignature)) return null;

  try {
    const header: unknown = JSON.parse(Buffer.from(headerSegment, 'base64url').toString('utf8'));
    const payload: unknown = JSON.parse(Buffer.from(payloadSegment, 'base64url').toString('utf8'));
    if (typeof header !== 'object' || header === null || !('alg' in header) || header.alg !== 'HS256') return null;
    if (typeof payload !== 'object' || payload === null) return null;
    if (!('sub' in payload) || !('role' in payload) || !('iat' in payload) || !('exp' in payload)) return null;

    const userId = Number(payload.sub);
    const role = payload.role;
    const issuedAt = Number(payload.iat);
    const expiresAt = Number(payload.exp);
    const nowSeconds = Math.floor(now / 1000);
    if (!Number.isSafeInteger(userId) || userId < 1 || typeof role !== 'string') return null;
    if (!Number.isSafeInteger(issuedAt) || !Number.isSafeInteger(expiresAt)) return null;
    if (issuedAt > nowSeconds || expiresAt <= nowSeconds || expiresAt - issuedAt > SESSION_DURATION_SECONDS) return null;

    return { userId, role, issuedAt, expiresAt };
  } catch {
    return null;
  }
}

export function hashLegacyPassword(password: string) {
  return createHash('sha256').update(password).digest('hex');
}
