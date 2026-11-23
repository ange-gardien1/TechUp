const APP_URL = 'https://techup.rw';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderNotificationEmail(input: {
  fullName: string;
  title: string;
  body: string;
}) {
  const name = input.fullName.trim() || 'there';
  const title = input.title.replace(/[\r\n]+/g, ' ').trim().slice(0, 160);
  const body = input.body.trim();
  const htmlBody = escapeHtml(body).replace(/\r?\n/g, '<br>');

  return {
    subject: `TECHUP | ${title}`,
    text: `Hello ${name},\n\n${body}\n\nView your account at ${APP_URL}\n\nTECHUP Support`,
    html: `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f3f6fb;color:#14213d;font-family:Arial,Helvetica,sans-serif">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 12px;background:#f3f6fb">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border:1px solid #e3eaf5;border-radius:20px;overflow:hidden">
          <tr><td style="padding:24px 32px;background:#0b1b4b;color:#fff;font-size:22px;font-weight:700;letter-spacing:1px">TECHUP</td></tr>
          <tr><td style="padding:32px">
            <p style="margin:0 0 16px;color:#475569;font-size:16px">Hello ${escapeHtml(name)},</p>
            <h1 style="margin:0 0 16px;color:#14213d;font-size:24px;line-height:1.3">${escapeHtml(title)}</h1>
            <p style="margin:0;color:#475569;font-size:16px;line-height:1.7">${htmlBody}</p>
            <p style="margin:28px 0">
              <a href="${APP_URL}" style="display:inline-block;padding:13px 20px;border-radius:10px;background:#2563eb;color:#fff;text-decoration:none;font-weight:700">Open TECHUP</a>
            </p>
            <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6">This is an update about your TECHUP account. If you need help, reply to this email.</p>
          </td></tr>
          <tr><td style="padding:18px 32px;border-top:1px solid #e3eaf5;color:#64748b;font-size:12px">TECHUP · Reliable technology repair and maintenance</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`,
  };
}
