import { and, asc, eq, inArray, lt, lte, or, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { notificationEmailDeliveries, notifications, users } from '../db/schema';
import { createGmailTransporter } from './email';
import { renderNotificationEmail } from './email-template';

const BATCH_SIZE = 10;
const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MINUTES = [1, 5, 15, 60];
const PROCESSING_LEASE_MINUTES = 10;

async function claimPendingEmails(notificationIds?: number[]) {
  if (notificationIds && notificationIds.length === 0) return [];

  const now = new Date();
  const staleLockBefore = new Date(now.getTime() - PROCESSING_LEASE_MINUTES * 60_000);

  return db.transaction(async (transaction) => {
    const candidates = await transaction
      .select({ id: notificationEmailDeliveries.id })
      .from(notificationEmailDeliveries)
      .where(and(
        or(
          and(
            eq(notificationEmailDeliveries.status, 'pending'),
            lte(notificationEmailDeliveries.nextAttemptAt, now),
          ),
          and(
            eq(notificationEmailDeliveries.status, 'processing'),
            lt(notificationEmailDeliveries.lockedAt, staleLockBefore),
          ),
        ),
        ...(notificationIds
          ? [inArray(notificationEmailDeliveries.notificationId, notificationIds)]
          : []),
      ))
      .orderBy(asc(notificationEmailDeliveries.createdAt))
      .limit(notificationIds?.length ?? BATCH_SIZE)
      .for('update', { skipLocked: true });

    if (candidates.length === 0) return [];

    return transaction
      .update(notificationEmailDeliveries)
      .set({
        status: 'processing',
        attempts: sql`${notificationEmailDeliveries.attempts} + 1`,
        lockedAt: now,
        updatedAt: now,
      })
      .where(inArray(notificationEmailDeliveries.id, candidates.map(({ id }) => id)))
      .returning({
        id: notificationEmailDeliveries.id,
        notificationId: notificationEmailDeliveries.notificationId,
        attempts: notificationEmailDeliveries.attempts,
      });
  });
}

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown email delivery error.';
  return message.slice(0, 1000);
}

export async function processNotificationEmailOutbox(notificationIds?: number[]) {
  const transporter = createGmailTransporter();
  let sent = 0;
  let retrying = 0;
  let failed = 0;

  try {
    const claimed = await claimPendingEmails(notificationIds);

    for (const delivery of claimed) {
      let providerMessageId: string;
      try {
        const [message] = await db
          .select({
            fullName: users.fullName,
            email: users.email,
            title: notifications.title,
            body: notifications.body,
          })
          .from(notificationEmailDeliveries)
          .innerJoin(notifications, eq(notificationEmailDeliveries.notificationId, notifications.id))
          .innerJoin(users, eq(notifications.userId, users.id))
          .where(eq(notificationEmailDeliveries.id, delivery.id))
          .limit(1);

        if (!message) throw new Error('The notification recipient could not be found.');

        const email = renderNotificationEmail(message);
        const result = await transporter.sendMail({
          from: { name: 'TECHUP', address: 'techuprwanda@gmail.com' },
          to: message.email,
          subject: email.subject,
          text: email.text,
          html: email.html,
          messageId: `<notification-${delivery.notificationId}@techup.rw>`,
        });
        providerMessageId = result.messageId;
      } catch (error) {
        const now = new Date();
        const willRetry = delivery.attempts < MAX_ATTEMPTS;
        const retryDelayMinutes = RETRY_DELAY_MINUTES[
          Math.min(delivery.attempts - 1, RETRY_DELAY_MINUTES.length - 1)
        ];

        await db.update(notificationEmailDeliveries)
          .set({
            status: willRetry ? 'pending' : 'failed',
            nextAttemptAt: new Date(now.getTime() + retryDelayMinutes * 60_000),
            lockedAt: null,
            lastError: errorMessage(error),
            updatedAt: now,
          })
          .where(and(
            eq(notificationEmailDeliveries.id, delivery.id),
            eq(notificationEmailDeliveries.status, 'processing'),
          ));

        console.error('Notification email delivery failed', {
          deliveryId: delivery.id,
          attempt: delivery.attempts,
          willRetry,
          error: errorMessage(error),
        });
        if (willRetry) retrying += 1;
        else failed += 1;
        continue;
      }

      const sentAt = new Date();
      await db.update(notificationEmailDeliveries)
        .set({
          status: 'sent',
          providerMessageId,
          sentAt,
          lockedAt: null,
          lastError: null,
          updatedAt: sentAt,
        })
        .where(and(
          eq(notificationEmailDeliveries.id, delivery.id),
          eq(notificationEmailDeliveries.status, 'processing'),
        ));
      sent += 1;
    }

    return { claimed: sent + retrying + failed, sent, retrying, failed };
  } finally {
    transporter.close();
  }
}
