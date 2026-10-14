import type { Express } from 'express';
import { customerProfiles, db, eq, omitPasswordHash, sanitizeUser, userResponseColumns, users } from '../../routes/context';

export function registerUserRoutes(app: Express) {
  app.get('/users/:id/profile', async (req, res) => {
    const userId = Number(req.params.id);
    if (!Number.isSafeInteger(userId) || userId < 1) {
      return res.status(400).json({ error: 'A valid user ID is required.' });
    }

    try {
      const [account] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!account) {
        return res.status(404).json({ error: 'User profile not found.' });
      }

      const [customerProfile] = account.role === 'customer'
        ? await db.select().from(customerProfiles).where(eq(customerProfiles.userId, userId)).limit(1)
        : [];

      return res.json({
        user: sanitizeUser(account),
        customerProfile: customerProfile
          ? {
              address: customerProfile.address,
              city: customerProfile.city,
              emergencyContactName: customerProfile.emergencyContactName,
              emergencyContactPhone: customerProfile.emergencyContactPhone,
              preferredLanguage: customerProfile.preferredLanguage,
            }
          : null,
      });
    } catch (error) {
      console.error('User profile lookup error', error);
      return res.status(500).json({ error: 'Unable to load user profile.' });
    }
  });

  app.put('/users/:id/profile', async (req, res) => {
    const userId = Number(req.params.id);
    if (!Number.isSafeInteger(userId) || userId < 1) {
      return res.status(400).json({ error: 'A valid user ID is required.' });
    }

    const body = req.body;
    const fullName = typeof body?.fullName === 'string' ? body.fullName.trim() : '';
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
    const profileFields = [
      ['address', 'address', 300],
      ['city', 'city', 100],
      ['emergencyContactName', 'emergencyContactName', 120],
      ['emergencyContactPhone', 'emergencyContactPhone', 40],
    ] as const;
    const customerProfileUpdate: {
      address?: string | null;
      city?: string | null;
      emergencyContactName?: string | null;
      emergencyContactPhone?: string | null;
      preferredLanguage?: string;
    } = {};

    if (!fullName || fullName.length > 120) {
      return res.status(400).json({ error: 'Full name is required and must be 120 characters or fewer.' });
    }
    if (phone.length > 40) {
      return res.status(400).json({ error: 'Phone number must be 40 characters or fewer.' });
    }

    for (const [inputKey, profileKey, maxLength] of profileFields) {
      if (body?.[inputKey] === undefined) continue;
      const value = body[inputKey];
      if (value !== null && typeof value !== 'string') {
        return res.status(400).json({ error: `Invalid ${inputKey}.` });
      }
      const normalized = typeof value === 'string' ? value.trim() : '';
      if (normalized.length > maxLength) {
        return res.status(400).json({ error: `${inputKey} must be ${maxLength} characters or fewer.` });
      }
      customerProfileUpdate[profileKey] = normalized || null;
    }

    if (body?.preferredLanguage !== undefined) {
      if (!['en', 'fr', 'rw'].includes(body.preferredLanguage)) {
        return res.status(400).json({ error: 'Preferred language must be English, French, or Kinyarwanda.' });
      }
      customerProfileUpdate.preferredLanguage = body.preferredLanguage;
    }

    try {
      const [account] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!account) {
        return res.status(404).json({ error: 'User profile not found.' });
      }
      if (account.role !== 'customer' && Object.keys(customerProfileUpdate).length > 0) {
        return res.status(400).json({ error: 'Customer details are only available for customer accounts.' });
      }

      const result = await db.transaction(async (tx) => {
        const [updatedAccount] = await tx.update(users)
          .set({ fullName, phone: phone || null, updatedAt: new Date() })
          .where(eq(users.id, userId))
          .returning();

        if (Object.keys(customerProfileUpdate).length > 0) {
          const [existingProfile] = await tx.select().from(customerProfiles)
            .where(eq(customerProfiles.userId, userId))
            .limit(1);

          if (existingProfile) {
            await tx.update(customerProfiles)
              .set(customerProfileUpdate)
              .where(eq(customerProfiles.id, existingProfile.id));
          } else {
            await tx.insert(customerProfiles).values({
              userId,
              ...customerProfileUpdate,
            });
          }
        }

        const [updatedCustomerProfile] = updatedAccount.role === 'customer'
          ? await tx.select().from(customerProfiles).where(eq(customerProfiles.userId, userId)).limit(1)
          : [];

        return { account: updatedAccount, customerProfile: updatedCustomerProfile };
      });

      return res.json({
        user: sanitizeUser(result.account),
        customerProfile: result.customerProfile
          ? {
              address: result.customerProfile.address,
              city: result.customerProfile.city,
              emergencyContactName: result.customerProfile.emergencyContactName,
              emergencyContactPhone: result.customerProfile.emergencyContactPhone,
              preferredLanguage: result.customerProfile.preferredLanguage,
            }
          : null,
      });
    } catch (error) {
      console.error('User profile update error', error);
      return res.status(500).json({ error: 'Unable to save user profile.' });
    }
  });

  app.get('/users', async (_req, res) => {
    const rows = await db.select(userResponseColumns).from(users);
    res.json(rows);
  });

  app.post('/users', async (req, res) => {
    const row = await db.insert(users).values(req.body).returning();
    res.json(row[0] ? omitPasswordHash(row[0]) : null);
  });

  app.get('/users/:id', async (req, res) => {
    const row = await db.select(userResponseColumns).from(users).where(eq(users.id, Number(req.params.id)));
    res.json(row[0] ?? null);
  });

  app.put('/users/:id', async (req, res) => {
    const row = await db.update(users).set(req.body).where(eq(users.id, Number(req.params.id))).returning();
    res.json(row[0] ? omitPasswordHash(row[0]) : null);
  });

  app.delete('/users/:id', async (req, res) => {
    await db.delete(users).where(eq(users.id, Number(req.params.id)));
    res.json({ deleted: true });
  });
}
