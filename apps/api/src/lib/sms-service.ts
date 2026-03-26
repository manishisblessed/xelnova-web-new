const DEFAULT_SMS_URL = 'https://smsfortius.work/V2/apikey.php';

interface SmsResponse {
  status?: string;
  code?: string;
  description?: string;
  message?: string;
  msg?: string;
  data?: {
    messageid: string;
    totnumber: string;
    totalcredit: string;
  };
}

interface SendSmsOptions {
  phone: string;
  message: string;
  templateId?: string;
}

/**
 * Build the Fortius GET URL manually so we control encoding and parameter
 * order (the Fortius docs show: apikey → senderid → templateid → number → message).
 * We use encodeURIComponent which encodes spaces as %20 (matching PHP's urlencode).
 */
function buildFortiusUrl(
  baseUrl: string,
  apiKey: string,
  senderId: string,
  templateId: string | undefined,
  number: string,
  message: string,
): string {
  const e = encodeURIComponent;
  let url = `${baseUrl}?apikey=${e(apiKey)}&senderid=${e(senderId)}`;
  if (templateId) url += `&templateid=${e(templateId)}`;
  url += `&number=${e(number)}&message=${e(message)}`;
  return url;
}

export async function sendSms({ phone, message, templateId }: SendSmsOptions): Promise<SmsResponse> {
  const apiKey = process.env.FORTIUS_API_KEY?.trim();
  const senderId = (process.env.FORTIUS_SENDER_ID || 'XELN').trim();
  const baseUrl = process.env.FORTIUS_SMS_URL || DEFAULT_SMS_URL;

  if (!apiKey) {
    console.warn('[SMS] FORTIUS_API_KEY not configured, skipping SMS send');
    throw new Error('SMS service not configured');
  }

  let number = phone.replace(/\D/g, '');
  if (number.startsWith('91') && number.length === 12) number = number.slice(2);
  if (number.length !== 10) {
    throw new Error('Invalid phone number for SMS');
  }

  const url = buildFortiusUrl(baseUrl, apiKey, senderId, templateId, number, message);

  console.log(`[SMS] Calling Fortius | number=${number} | templateid=${templateId || '(none)'} | senderId=${senderId} | msgLen=${message.length}`);
  console.log(`[SMS] Message body: "${message}"`);

  let response: Response;
  try {
    response = await fetch(url, { method: 'GET', headers: { Accept: 'application/json, text/plain' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`SMS gateway unreachable: ${msg}`);
  }

  const raw = await response.text();
  console.log(`[SMS] Fortius raw response (HTTP ${response.status}): ${raw.slice(0, 500)}`);

  let data: SmsResponse;
  try {
    data = JSON.parse(raw) as SmsResponse;
  } catch {
    throw new Error(`SMS gateway returned non-JSON (HTTP ${response.status}): ${raw.slice(0, 200)}`);
  }

  const codeRaw = data.code ?? data.status;
  const codeStr = codeRaw != null ? String(codeRaw) : '';
  const codeOk = codeStr === '011' || codeStr === '11';

  if (!codeOk) {
    const desc = data.description || data.message || data.msg || raw.slice(0, 200);
    throw new Error(
      `${desc}. For India DLT, set FORTIUS_OTP_TEMPLATE_ID to your approved template ID.`,
    );
  }

  console.log(`[SMS] Sent to ${number} | msgid: ${data.data?.messageid} | credits: ${data.data?.totalcredit}`);

  if (data.data?.messageid) {
    setTimeout(() => checkDlr(apiKey, data.data!.messageid).catch(() => {}), 15000);
  }

  return data;
}

export function buildOtpMessage(otp: string): string {
  const tpl = process.env.FORTIUS_OTP_MESSAGE?.trim();
  const fallback = `${otp} is your Xelnova verification code. Valid for 10 minutes. Do not share this code with anyone.`;
  if (!tpl) {
    console.warn('[SMS] FORTIUS_OTP_MESSAGE is not set — using fallback text (may not match DLT template)');
    return fallback;
  }
  if (!tpl.includes('{#var#}') && !tpl.includes('{otp}')) {
    console.warn(`[SMS] FORTIUS_OTP_MESSAGE does not contain {#var#} or {otp}. Loaded value: "${tpl}"`);
    console.warn('[SMS] This usually means the .env value is not quoted and # was treated as a comment. Wrap the value in double quotes in your .env file.');
    return fallback;
  }
  let out = tpl;
  if (out.includes('{#var#}')) out = out.split('{#var#}').join(otp);
  if (out.includes('{otp}')) out = out.split('{otp}').join(otp);
  return out;
}

export async function sendOtpSms(phone: string, otp: string): Promise<boolean> {
  const templateId = process.env.FORTIUS_OTP_TEMPLATE_ID?.trim();

  console.log('[SMS] --- OTP Send Checklist ---');
  console.log(`[SMS] ✓ FORTIUS_API_KEY: ${process.env.FORTIUS_API_KEY ? 'set (' + process.env.FORTIUS_API_KEY.slice(0, 4) + '...)' : 'MISSING'}`);
  console.log(`[SMS] ${process.env.FORTIUS_SENDER_ID ? '✓' : '✗'} FORTIUS_SENDER_ID: "${process.env.FORTIUS_SENDER_ID || '(not set)'}"`);
  console.log(`[SMS] ${templateId ? '✓' : '✗'} FORTIUS_OTP_TEMPLATE_ID: "${templateId || '(not set)'}"`);

  const rawMsg = process.env.FORTIUS_OTP_MESSAGE;
  const hasPlaceholder = rawMsg?.includes('{#var#}') || rawMsg?.includes('{otp}');
  console.log(`[SMS] ${hasPlaceholder ? '✓' : '✗'} FORTIUS_OTP_MESSAGE: "${(rawMsg || '').slice(0, 60)}${(rawMsg || '').length > 60 ? '...' : ''}"`);
  console.log(`[SMS] ${hasPlaceholder ? '✓' : '✗'} Placeholder {#var#} present: ${rawMsg?.includes('{#var#}') ?? false}`);
  console.log('[SMS] --------------------------');

  if (!templateId) {
    console.warn('[SMS] FORTIUS_OTP_TEMPLATE_ID is not set — Indian DLT will reject the SMS even if the gateway accepts it');
  }

  try {
    await sendSms({
      phone,
      message: buildOtpMessage(otp),
      templateId,
    });
    return true;
  } catch (error) {
    console.error('[SMS] Failed to send OTP:', error);
    return false;
  }
}

/**
 * Auto-check DLR (Delivery Report) 15 seconds after sending to log
 * whether the SMS was actually delivered or rejected by the operator.
 */
async function checkDlr(apiKey: string, msgId: string): Promise<void> {
  const url = `https://smsfortius.work/V2/http-dlr.php?apikey=${encodeURIComponent(apiKey)}&msgid=${encodeURIComponent(msgId)}&format=json`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const raw = await res.text();
    console.log(`[SMS-DLR] msgid=${msgId} | response: ${raw.slice(0, 500)}`);
  } catch (e) {
    console.warn(`[SMS-DLR] Failed to check delivery for msgid=${msgId}:`, e);
  }
}
