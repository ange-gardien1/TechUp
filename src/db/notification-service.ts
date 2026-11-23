import { db } from './client';
import { notificationEmailDeliveries, notifications } from './schema';

type NewNotification = typeof notifications.$inferInsert;

export async function createNotifications(values: NewNotification[]) {
  if (values.length === 0) return [];

  return db.transaction(async (transaction) => {
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
}
