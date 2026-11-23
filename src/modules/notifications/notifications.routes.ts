import type { Express } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { and, db, desc, eq, inArray, notifications } from '../../routes/context';
import { processNotificationEmailOutbox } from '../../server/notification-email-worker';

function isAuthorizedDispatcher(authorization: string | undefined, secret: string) {
  const supplied = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!supplied) return false;

  const expectedBuffer = Buffer.from(secret);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export function registerNotificationRoutes(app: Express) {
  app.get('/notifications/email-dispatch', async (req, res) => {
    const secret = process.env.CRON_SECRET?.trim();
    if (!secret || Buffer.byteLength(secret) < 32) {
      console.error('Email dispatch requires a CRON_SECRET of at least 32 bytes.');
      return res.status(503).json({ error: 'Email dispatch is not configured.' });
    }
    if (!isAuthorizedDispatcher(req.get('authorization'), secret)) {
      return res.status(401).json({ error: 'A valid dispatch credential is required.' });
    }

    try {
      return res.json(await processNotificationEmailOutbox());
    } catch (error) {
      console.error('Unable to process notification email outbox', error);
      return res.status(503).json({ error: 'Email dispatch could not run.' });
    }
  });

  app.get('/notifications/:userId', async (req, res) => {
    const rows = await db.select({
      id: notifications.id,
      userId: notifications.userId,
      title: notifications.title,
      body: notifications.body,
      type: notifications.type,
      referenceId: notifications.referenceId,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
    }).from(notifications)
      .where(eq(notifications.userId, Number(req.params.userId)))
      .orderBy(desc(notifications.createdAt));
    res.json(rows);
  });

  app.post('/notifications/:userId/read', async (req, res) => {
    const userId = Number(req.params.userId);
    const notificationIds: number[] = Array.isArray(req.body?.notificationIds)
      ? [...new Set<number>(req.body.notificationIds.map(Number).filter((id: number) => Number.isInteger(id)))]
      : [];

    if (!userId || notificationIds.length === 0) {
      return res.json({ updated: 0 });
    }

    const updatedRows = await db.update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false),
        inArray(notifications.id, notificationIds),
      ))
      .returning({ id: notifications.id });

    res.json({ updated: updatedRows.length });
  });
}
