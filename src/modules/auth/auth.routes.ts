import type { Express } from 'express';
import { authTokenSecret, db, eq, hashPassword, issueSessionToken, sanitizeUser, users, verifyPassword } from '../../routes/context';

export function registerAuthRoutes(app: Express) {
  app.post('/auth/register', async (req, res) => {
    try {
      const fullName = String(req.body?.fullName ?? '').trim();
      const email = String(req.body?.email ?? '').trim().toLowerCase();
      const password = String(req.body?.password ?? '');
      const phone = String(req.body?.phone ?? '').trim();
      const role = 'customer';

      if (!fullName || !email || !password) {
        return res.status(400).json({ error: 'Full name, email, and password are required.' });
      }

      const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
      if (existing.length > 0) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }

      const result = await db.insert(users).values({
        fullName,
        email,
        passwordHash: await hashPassword(password),
        phone: phone || null,
        role,
        status: 'active',
        isVerified: true,
      }).returning();

      const session = issueSessionToken(result[0], authTokenSecret);
      return res.status(201).json({
        user: sanitizeUser(result[0]),
        token: session.token,
        expiresAt: session.expiresAt,
      });
    } catch (error) {
      console.error('Register error', error);
      return res.status(500).json({ error: 'Unable to create account.' });
    }
  });

  app.post('/auth/login', async (req, res) => {
    try {
      const email = String(req.body?.email ?? '').trim().toLowerCase();
      const password = String(req.body?.password ?? '');

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }

      const result = await db.select().from(users).where(eq(users.email, email));
      const account = result[0];

      if (!account?.passwordHash) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const verification = await verifyPassword(password, account.passwordHash);
      if (!verification.valid) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
      if (verification.needsRehash) {
        await db.update(users)
          .set({ passwordHash: await hashPassword(password), updatedAt: new Date() })
          .where(eq(users.id, account.id));
      }

      const session = issueSessionToken(account, authTokenSecret);
      return res.json({
        user: sanitizeUser(account),
        token: session.token,
        expiresAt: session.expiresAt,
      });
    } catch (error) {
      console.error('Login error', error);
      return res.status(500).json({ error: 'Unable to sign in.' });
    }
  });
}
