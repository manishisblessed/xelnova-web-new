import { randomUUID } from 'crypto';

export interface OtpRecord {
  identifier: string;
  type: 'EMAIL' | 'PHONE';
  otp: string;
  expiresAt: number;
  verified: boolean;
  attempts: number;
  verificationToken?: string;
}

const globalForOtp = globalThis as unknown as {
  __otpStore?: Map<string, OtpRecord>;
};

if (!globalForOtp.__otpStore) {
  globalForOtp.__otpStore = new Map();
}

const store = globalForOtp.__otpStore;

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function storeOtp(type: string, identifier: string, otp: string) {
  const key = `${type}:${identifier}`;
  store.set(key, {
    identifier,
    type: type as 'EMAIL' | 'PHONE',
    otp,
    expiresAt: Date.now() + 10 * 60 * 1000,
    verified: false,
    attempts: 0,
  });
}

export function getOtp(type: string, identifier: string): OtpRecord | undefined {
  return store.get(`${type}:${identifier}`);
}

export function markOtpVerified(type: string, identifier: string): string {
  const key = `${type}:${identifier}`;
  const record = store.get(key);
  if (record) {
    record.verified = true;
    record.verificationToken = `otp-verified-${randomUUID()}`;
    return record.verificationToken;
  }
  return '';
}
