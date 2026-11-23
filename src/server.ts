import './config/env';
import app from './app';
import { hasGmailSmtpConfiguration } from './server/email';
import { processNotificationEmailOutbox } from './server/notification-email-worker';

const port = process.env.PORT ?? 4000;
app.listen(port, () => {
  console.log(`TeckUP API running on port ${port}`);

  if (process.env.VERCEL || process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test') {
    return;
  }
  if (!hasGmailSmtpConfiguration()) {
    console.info('Local email dispatcher is disabled; configure Gmail SMTP to enable it.');
    return;
  }

  const dispatchPendingEmails = async () => {
    try {
      const result = await processNotificationEmailOutbox();
      if (result.claimed > 0) {
        console.info('Local notification email dispatcher processed the outbox', result);
      }
    } catch (error) {
      console.error('Local notification email dispatcher failed', error);
    }
  };

  void dispatchPendingEmails();
  const dispatcher = setInterval(() => void dispatchPendingEmails(), 30_000);
  dispatcher.unref();
  console.info('Local email dispatcher is active and checks every 30 seconds.');
});
