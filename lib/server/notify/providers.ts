import { SITE } from '../../site';

export type SendResult =
  | { ok: true }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped?: false; error: string };

const skip = (reason: string): SendResult => ({ ok: false, skipped: true, reason });
const fail = (error: string): SendResult => ({ ok: false, error });

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function post(url: string, init: RequestInit): Promise<SendResult> {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) });
    if (res.ok) return { ok: true };
    const text = (await res.text().catch(() => '')).slice(0, 200);
    // 4xx other than rate limits will not get better by retrying.
    return fail(`HTTP ${res.status} ${text}`);
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Network error');
  }
}

/** Email through Resend. Needs RESEND_API_KEY and RECEIPT_FROM_EMAIL (shared with receipts). */
export async function sendEmail(to: string, subject: string, body: string): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RECEIPT_FROM_EMAIL;
  if (!apiKey || !from) return skip('Email is not configured');

  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#151515">
    <div style="background:#151515;padding:16px 22px"><span style="color:#fff;font-size:18px;font-weight:bold">Localdropshipping<span style="color:#f04438">gh</span></span></div>
    <div style="padding:22px">
      <h2 style="margin:0 0 10px;font-size:18px">${escapeHtml(subject)}</h2>
      <p style="margin:0 0 18px;color:#444;line-height:1.5">${escapeHtml(body)}</p>
      <a href="${SITE.url}/orders" style="background:#f04438;color:#fff;padding:9px 16px;border-radius:4px;text-decoration:none;font-weight:bold;font-size:14px">Open my account</a>
      <p style="margin:22px 0 0;font-size:12px;color:#999">You can change which alerts you get at ${SITE.url}/settings/notifications</p>
    </div></div>`;

  return post(process.env.RESEND_API_URL || 'https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
}

/**
 * SMS. SMS_PROVIDER=arkesel (default, popular in Ghana) needs ARKESEL_API_KEY and SMS_SENDER_ID.
 * SMS_PROVIDER=twilio needs TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_SMS_FROM.
 */
export async function sendSms(to: string, body: string): Promise<SendResult> {
  const provider = (process.env.SMS_PROVIDER || 'arkesel').toLowerCase();
  const text = body.length > 300 ? `${body.slice(0, 297)}...` : body;

  if (provider === 'twilio') {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_SMS_FROM;
    if (!sid || !token || !from) return skip('Twilio SMS is not configured');
    return post(`${process.env.TWILIO_API_URL || 'https://api.twilio.com'}/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: from, Body: text }),
    });
  }

  const key = process.env.ARKESEL_API_KEY;
  const sender = process.env.SMS_SENDER_ID;
  if (!key || !sender) return skip('SMS is not configured');
  return post(process.env.ARKESEL_API_URL || 'https://sms.arkesel.com/api/v2/sms/send', {
    method: 'POST',
    headers: { 'api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender: sender.slice(0, 11), message: text, recipients: [to.replace('+', '')] }),
  });
}

/**
 * WhatsApp through Twilio (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM like
 * "+14155238886"). Business-initiated WhatsApp messages need an approved template; set
 * TWILIO_WHATSAPP_CONTENT_SID to use one (the message goes in variable 1).
 */
export async function sendWhatsApp(to: string, body: string): Promise<SendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!sid || !token || !from) return skip('WhatsApp is not configured');

  const params = new URLSearchParams({ To: `whatsapp:${to}`, From: `whatsapp:${from}` });
  const template = process.env.TWILIO_WHATSAPP_CONTENT_SID;
  if (template) {
    params.set('ContentSid', template);
    params.set('ContentVariables', JSON.stringify({ '1': body }));
  } else {
    params.set('Body', body);
  }
  return post(`${process.env.TWILIO_API_URL || 'https://api.twilio.com'}/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
}
