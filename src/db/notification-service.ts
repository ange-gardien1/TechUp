import { db } from './client';
import { notificationEmailDeliveries, notifications } from './schema';
import { processNotificationEmailOutbox } from '../server/notification-email-worker';

type NewNotification = typeof notifications.$inferInsert;

export async function createNotifications(values: NewNotification[]) {
  if (values.length === 0) return [];

  const created = await db.transaction(async (transaction) => {
    const created = await transaction
      .insert(notifications)
      .values(values)
      .onConflictDoNothing({ target: notifications.dedupeKey })
      .returning({ id: notifications.id });

    if (created.length > 0) {
      await transaction.insert(notificationEmailDeliveries).values(
        created.map(({ id }) => ({ notificationId: id })),
      );
    }

    return created;
  });

  if (created.length > 0) {
    try {
      await processNotificationEmailOutbox(created.map(({ id }) => id));
    } catch (error) {
      console.error('Unable to send notification emails immediately; they remain queued for retry.', error);
    }
  }

  return created;
}
