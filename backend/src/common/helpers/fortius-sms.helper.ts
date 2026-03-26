import {
  BadGatewayException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';

/**
 * DLT-approved SMS body; use `{#var#}` or `{otp}` for the code placeholder.
 */
export function buildFortiusOtpMessage(otp: string): string {
  const tpl = process.env.FORTIUS_OTP_MESSAGE?.trim();
  const fallback = `${otp} is your Xelnova verification code. Valid for 10 minutes. Do not share this code with anyone.`;
  if (!tpl) return fallback;
  if (!tpl.includes('{#var#}') && !tpl.includes('{otp}')) {
    console.warn('[SMS] FORTIUS_OTP_MESSAGE should include {#var#} (DLT) or {otp}; using default OTP text');
    return fallback;
  }
  let out = tpl;
  if (out.includes('{#var#}')) out = out.split('{#var#}').join(otp);
  if (out.includes('{otp}')) out = out.split('{otp}').join(otp);
  return out;
}

export function normalizeIndianMobile(phone: string): string {
  let number = phone.replace(/\D/g, '');
  if (number.startsWith('91') && number.length === 12) number = number.slice(2);
  if (number.length !== 10 || !/^[6-9]/.test(number)) {
    throw new BadRequestException('Enter a valid 10-digit Indian mobile number');
  }
  return number;
}

/**
 * Send OTP via Fortius HTTP API (same config as seller onboarding).
 * In development, if FORTIUS_API_KEY is missing, logs and returns without throwing.
 */
export async function sendFortiusOtpSms(phone: string, otp: string): Promise<void> {
  const apiKey = process.env.FORTIUS_API_KEY?.trim();
  const senderId = (process.env.FORTIUS_SENDER_ID || 'XELN').trim();
  const templateId = process.env.FORTIUS_OTP_TEMPLATE_ID?.trim();
  const baseUrl = process.env.FORTIUS_SMS_URL || 'https://smsfortius.work/V2/apikey.php';

  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new ServiceUnavailableException(
        'SMS is not configured. Set FORTIUS_API_KEY (and usually FORTIUS_OTP_TEMPLATE_ID for DLT) on the backend.',
      );
    }
    console.warn(`[DEV] SMS OTP for ${phone}: ${otp} — set FORTIUS_API_KEY to send real SMS`);
    return;
  }

  const number = normalizeIndianMobile(phone);
  const message = buildFortiusOtpMessage(otp);

  const e = encodeURIComponent;
  let url = `${baseUrl}?apikey=${e(apiKey)}&senderid=${e(senderId)}`;
  if (templateId) url += `&templateid=${e(templateId)}`;
  url += `&number=${e(number)}&message=${e(message)}`;

  console.log(`[SMS] Calling Fortius | number=${number} | templateid=${templateId || '(none)'} | senderId=${senderId}`);
  console.log(`[SMS] Message body: "${message}"`);

  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json, text/plain' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new BadGatewayException(`SMS gateway unreachable: ${msg}`);
  }

  const raw = await res.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new BadGatewayException(
      `SMS gateway returned non-JSON (HTTP ${res.status}). Check FORTIUS_SMS_URL. Body: ${raw.slice(0, 200)}`,
    );
  }

  const code = data.code ?? data.status;
  const codeOk = code === '011' || code === 11 || String(code) === '011';

  if (!codeOk) {
    const desc =
      (typeof data.description === 'string' && data.description) ||
      (typeof data.message === 'string' && data.message) ||
      (typeof data.msg === 'string' && data.msg) ||
      raw.slice(0, 250);
    throw new BadGatewayException(
      `SMS failed: ${desc}. In India, DLT requires an approved template — set FORTIUS_OTP_TEMPLATE_ID to match your registered OTP template and keep the message text identical.`,
    );
  }

  const msgid = (data.data as { messageid?: string } | undefined)?.messageid;
  console.log(
    `[SMS] Fortius accepted | number=${number} | messageid=${msgid ?? 'n/a'} — credits may deduct before operator delivery. If Delivered stays 0, open Fortius Delivery Report, verify DLT template text matches FORTIUS_OTP_MESSAGE (or default body), sender ${senderId}, and route.`,
  );
}
