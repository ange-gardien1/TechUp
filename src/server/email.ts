import nodemailer from 'nodemailer';

export const TECHUP_SENDER_EMAIL = 'techuprwanda@gmail.com';

function gmailSmtpCredentials() {
  const user = process.env.GMAIL_SMTP_USER?.trim().toLowerCase();
  const password = process.env.GMAIL_SMTP_APP_PASSWORD?.replace(/\s/g, '');

  return user === TECHUP_SENDER_EMAIL && password ? { user, password } : null;
}

export function hasGmailSmtpConfiguration() {
  return gmailSmtpCredentials() !== null;
}

export function createGmailTransporter() {
  const credentials = gmailSmtpCredentials();
  if (!credentials) throw new Error('Configure GMAIL_SMTP_USER and GMAIL_SMTP_APP_PASSWORD for TECHUP email delivery.');

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: credentials.user, pass: credentials.password },
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
}
