import type { NextFunction, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { users } from '../db/schema';
import { authorizationFailure } from '../server/authorization';
import { getAuthTokenSecret } from '../config/env';
import { verifySessionToken, type SessionClaims } from '../server/security';

declare global {
  namespace Express {
    interface Request {
      auth?: SessionClaims;
    }
  }
}

export async function authenticateRequest(req: Request, res: Response, next: NextFunction) {
  if (
    req.method === 'OPTIONS'
    || req.path === '/'
    || req.path === '/health'
    || (req.path === '/auth/login' && req.method === 'POST')
    || (req.path === '/auth/register' && req.method === 'POST')
    || (req.method === 'GET' && (
      req.path === '/products'
      || /^\/products\/\d+$/.test(req.path)
      || req.path === '/service-categories'
    ))
  ) {
    return next();
  }

  const bearerToken = req.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const claims = bearerToken ? verifySessionToken(bearerToken, getAuthTokenSecret()) : null;
  if (!claims) {
    res.setHeader('WWW-Authenticate', 'Bearer');
    return res.status(401).json({ error: 'A valid bearer token is required.' });
  }

  try {
    const [account] = await db.select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, claims.userId))
      .limit(1);
    if (!account || account.role !== claims.role) {
      res.setHeader('WWW-Authenticate', 'Bearer');
      return res.status(401).json({ error: 'The authenticated account changed. Please sign in again.' });
    }
  } catch (error) {
    console.error('Authentication middleware error', error);
    return res.status(500).json({ error: 'Unable to authenticate this request.' });
  }

  req.auth = claims;
  const suppliedUserId = req.body?.userId ?? req.query.userId;
  if (suppliedUserId !== undefined) {
    const parsedUserId = Number(suppliedUserId);
    if (!Number.isSafeInteger(parsedUserId) || parsedUserId !== claims.userId) {
      return res.status(403).json({ error: 'The supplied user id does not match the authenticated account.' });
    }
  }

  const suppliedCustomerId = req.body?.customerId;
  if (suppliedCustomerId !== undefined) {
    const parsedCustomerId = Number(suppliedCustomerId);
    if (!Number.isSafeInteger(parsedCustomerId) || parsedCustomerId !== claims.userId) {
      return res.status(403).json({ error: 'The supplied customer id does not match the authenticated account.' });
    }
  }
  const suppliedPayerId = req.body?.payerId;
  if (suppliedPayerId !== undefined) {
    const parsedPayerId = Number(suppliedPayerId);
    if (!Number.isSafeInteger(parsedPayerId) || parsedPayerId !== claims.userId) {
      return res.status(403).json({ error: 'The supplied payer id does not match the authenticated account.' });
    }
  }

  const failure = authorizationFailure(req.path, req.method, claims);
  if (failure) return res.status(403).json({ error: failure });
  return next();
}
