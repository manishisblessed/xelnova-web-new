const SMS_API_BASE = 'https://smsfortius.work/V2/apikey.php';

interface SmsResponse {
  status: string;
  code: string;
  description?: string;
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

export async function sendSms({ phone, message, templateId }: SendSmsOptions): Promise<SmsResponse> {
  const apiKey = process.env.FORTIUS_API_KEY;
  const senderId = process.env.FORTIUS_SENDER_ID || 'XELN';

  if (!apiKey) {
    console.warn('[SMS] FORTIUS_API_KEY not configured, skipping SMS send');
    throw new Error('SMS service not configured');
  }

  const number = phone.replace(/^\+91/, '').replace(/\D/g, '');

  const params = new URLSearchParams({
    apikey: apiKey,
    senderid: senderId,
    number,
    message,
  });

  if (templateId) {
    params.set('templateid', templateId);
  }

  const url = `${SMS_API_BASE}?${params.toString()}`;

  const response = await fetch(url, { method: 'GET' });
  const data: SmsResponse = await response.json();

  if (data.code !== '011') {
    console.error('[SMS] Fortius API error:', data);
    throw new Error(data.description || `SMS failed with code ${data.code}`);
  }

  console.log(`[SMS] Sent to ${number} | msgid: ${data.data?.messageid} | credits: ${data.data?.totalcredit}`);
  return data;
}

export function buildOtpMessage(otp: string): string {
  return `${otp} is your Xelnova verification code. Valid for 10 minutes. Do not share this code with anyone.`;
}

export async function sendOtpSms(phone: string, otp: string): Promise<boolean> {
  const templateId = process.env.FORTIUS_OTP_TEMPLATE_ID;

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
