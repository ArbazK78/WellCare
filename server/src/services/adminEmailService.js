const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const shell = ({ eyebrow, title, body, actionLabel, actionUrl, code, footer }) => `<!doctype html>
<html><body style="margin:0;background:#f3f5f3;font-family:Arial,sans-serif;color:#122a24">
  <div style="max-width:600px;margin:0 auto;padding:32px 18px">
    <div style="background:#102d25;border-radius:24px;padding:32px;color:#fff">
      <div style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#e2a36e;font-weight:700">${escapeHtml(eyebrow)}</div>
      <h1 style="font-size:30px;line-height:1.2;margin:14px 0">${escapeHtml(title)}</h1>
      <div style="font-size:16px;line-height:1.7;color:#d8e4df">${body}</div>
      ${code ? `<div style="margin:26px 0;padding:18px;border-radius:14px;background:#fff;color:#102d25;text-align:center;font-size:30px;font-weight:800;letter-spacing:.22em">${escapeHtml(code)}</div>` : ''}
      ${actionUrl ? `<a href="${escapeHtml(actionUrl)}" style="display:inline-block;margin-top:24px;padding:14px 22px;border-radius:999px;background:#e2a36e;color:#102d25;text-decoration:none;font-weight:800">${escapeHtml(actionLabel)}</a>` : ''}
      <div style="margin-top:28px;padding-top:20px;border-top:1px solid rgba(255,255,255,.12);font-size:12px;line-height:1.6;color:#9fb3ac">${escapeHtml(footer)}</div>
    </div>
    <p style="text-align:center;color:#6c7b76;font-size:12px;margin:18px 0">WellCare administrative security</p>
  </div>
</body></html>`;

const send = async ({ to, subject, html, developmentPreview }) => {
  const provider = process.env.EMAIL_PROVIDER || (process.env.NODE_ENV === 'production' ? 'resend' : 'console');

  if (provider === 'console') {
    if (process.env.NODE_ENV === 'production') throw new Error('Console email provider is disabled in production.');
    console.log(`[admin-email-preview] to=${to} subject=${subject} ${developmentPreview}`);
    return { provider, id: `console-${Date.now()}` };
  }

  if (provider !== 'resend') throw new Error(`Unsupported email provider: ${provider}`);
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured.');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'User-Agent': 'WellCare/1.0',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'WellCare Security <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || `Resend request failed with status ${response.status}.`);
  return { provider, id: payload.id };
};

const sendAdminInvitation = ({ to, invitationUrl, inviterEmail, expiresAt }) => send({
  to,
  subject: 'You are invited to administer WellCare',
  html: shell({
    eyebrow: 'Administrator invitation',
    title: 'Help operate WellCare safely.',
    body: `${escapeHtml(inviterEmail)} invited you to the WellCare Admin Console. Verify this email and choose your password using the secure invitation below.`,
    actionLabel: 'Accept invitation',
    actionUrl: invitationUrl,
    footer: `This single-use invitation expires ${expiresAt.toUTCString()}. If you were not expecting it, you can ignore this email.`,
  }),
  developmentPreview: `invitation=${invitationUrl}`,
});

const sendPasswordResetCode = ({ to, code, expiresAt }) => send({
  to,
  subject: 'Your WellCare admin recovery code',
  html: shell({
    eyebrow: 'Password recovery',
    title: 'Use this one-time security code.',
    body: 'A password reset was requested for your WellCare administrator account.',
    code,
    footer: `This code expires ${expiresAt.toUTCString()} and can be used only once. If you did not request it, keep your password unchanged.`,
  }),
  developmentPreview: `reset-code=${code}`,
});

const sendPasswordChangedNotice = ({ to }) => send({
  to,
  subject: 'Your WellCare admin password was changed',
  html: shell({
    eyebrow: 'Security notice',
    title: 'Your password has been updated.',
    body: 'All existing administrator sessions were signed out. You can now sign in with your new password.',
    footer: 'If you did not make this change, contact the WellCare owner immediately.',
  }),
  developmentPreview: 'password-changed',
});

const sendAccessChangedNotice = ({ to, status }) => send({
  to,
  subject: `Your WellCare admin access was ${status}`,
  html: shell({
    eyebrow: 'Access notice',
    title: `Administrator access ${status}.`,
    body: `Your WellCare administrator account is now ${escapeHtml(status)}.`,
    footer: 'Contact the WellCare owner if you believe this was unexpected.',
  }),
  developmentPreview: `access-status=${status}`,
});

module.exports = {
  sendAccessChangedNotice,
  sendAdminInvitation,
  sendPasswordChangedNotice,
  sendPasswordResetCode,
};
