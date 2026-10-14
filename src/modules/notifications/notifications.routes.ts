import type { Express } from 'express';
import { and, db, desc, eq, inArray, notifications } from '../../routes/context';

export function registerNotificationRoutes(app: Express) {
  app.get('/notifications/:userId', async (req, res) => {
    const rows = await db.select().from(notifications)
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
