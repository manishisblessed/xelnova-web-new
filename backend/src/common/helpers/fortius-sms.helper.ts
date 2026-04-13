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

/** Diagnostic: check if Fortius SMS is configured and reachable. */
export function getFortiusSmsStatus(): {
  configured: boolean;
  apiKey: string;
  senderId: string;
  templateId: string;
  baseUrl: string;
} {
  const apiKey = process.env.FORTIUS_API_KEY?.trim() || '';
  const senderId = (process.env.FORTIUS_SENDER_ID || 'XELN').trim();
  const templateId = process.env.FORTIUS_OTP_TEMPLATE_ID?.trim() || '';
  const baseUrl = process.env.FORTIUS_SMS_URL || 'https://smsfortius.work/V2/apikey.php';
  return {
    configured: !!apiKey,
    apiKey: apiKey ? `${apiKey.slice(0, 4)}****` : '(not set)',
    senderId,
    templateId: templateId || '(not set)',
    baseUrl,
  };
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

/**
 * Send OTP via Fortius HTTP API (same config as seller onboarding).
 * Includes retry logic for transient network failures.
 * In development, if FORTIUS_API_KEY is missing, logs and returns without throwing.
 */
export async function sendFortiusOtpSms(phone: string, otp: string): Promise<void> {
  const apiKey = process.env.FORTIUS_API_KEY?.trim();
  const senderId = (process.env.FORTIUS_SENDER_ID || 'XELN').trim();
  const templateId = process.env.FORTIUS_OTP_TEMPLATE_ID?.trim();
  const baseUrl = process.env.FORTIUS_SMS_URL || 'https://smsfortius.work/V2/apikey.php';

  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[SMS] CRITICAL: FORTIUS_API_KEY is not set in production! OTP cannot be sent.');
      throw new ServiceUnavailableException(
        'SMS is not configured. Set FORTIUS_API_KEY (and usually FORTIUS_OTP_TEMPLATE_ID for DLT) on the backend.',
      );
    }
    console.warn(`[DEV] SMS OTP for ${phone}: ${otp} — set FORTIUS_API_KEY to send real SMS`);
    return;
  }

  if (!templateId) {
    console.warn('[SMS] WARNING: FORTIUS_OTP_TEMPLATE_ID is not set. DLT requires a template ID for delivery in India.');
  }

  const number = normalizeIndianMobile(phone);
  const message = buildFortiusOtpMessage(otp);

  const e = encodeURIComponent;
  let url = `${baseUrl}?apikey=${e(apiKey)}&senderid=${e(senderId)}`;
  if (templateId) url += `&templateid=${e(templateId)}`;
  url += `&number=${e(number)}&message=${e(message)}`;

  console.log(`[SMS] Sending OTP | number=${number} | senderId=${senderId} | templateId=${templateId || '(none)'}`);
  console.log(`[SMS] Message body: "${message}"`);
  console.log(`[SMS] API URL (redacted key): ${baseUrl}?apikey=****&senderid=${senderId}&templateid=${templateId || 'NONE'}&number=${number}`);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      console.log(`[SMS] Retry attempt ${attempt}/${MAX_RETRIES} after ${RETRY_DELAY_MS}ms...`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }

    let res: Response;
    const controller = new AbortController();
    const timeoutMs = 15000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json, text/plain' },
        signal: controller.signal,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[SMS] Network error (attempt ${attempt + 1}): ${msg}`);
      lastError = new BadGatewayException(`SMS gateway unreachable: ${msg}`);
      continue;
    } finally {
      clearTimeout(timer);
    }

    const raw = await res.text();
    console.log(`[SMS] Fortius response (HTTP ${res.status}): ${raw.slice(0, 500)}`);

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      console.error(`[SMS] Non-JSON response from Fortius (HTTP ${res.status}): ${raw.slice(0, 300)}`);
      lastError = new BadGatewayException(
        `SMS gateway returned non-JSON (HTTP ${res.status}). Check FORTIUS_SMS_URL. Body: ${raw.slice(0, 200)}`,
      );
      continue;
    }

    const code = data.code ?? data.status;
    const codeOk = code === '011' || code === 11 || String(code) === '011';

    if (!codeOk) {
      const desc =
        (typeof data.description === 'string' && data.description) ||
        (typeof data.message === 'string' && data.message) ||
        (typeof data.msg === 'string' && data.msg) ||
        raw.slice(0, 250);
      console.error(`[SMS] Fortius rejected | code=${code} | desc=${desc}`);
      throw new BadGatewayException(
        `SMS failed (code: ${code}): ${desc}. In India, DLT requires an approved template — verify FORTIUS_OTP_TEMPLATE_ID matches your registered DLT template and the message text is identical.`,
      );
    }

    const msgid = (data.data as { messageid?: string } | undefined)?.messageid;
    console.log(
      `[SMS] Fortius accepted | number=${number} | messageid=${msgid ?? 'n/a'} | attempt=${attempt + 1}` +
      ` — If SMS not received, check Fortius Delivery Report for DLT template mismatch or sender ID issues.`,
    );
    return;
  }

  throw lastError ?? new BadGatewayException('SMS gateway unreachable after retries');
}
