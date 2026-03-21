interface CaptchaEntry {
  answer: string;
  expiresAt: number;
  solved: boolean;
}

const globalForCaptcha = globalThis as unknown as {
  __captchaStore?: Map<string, CaptchaEntry>;
};

if (!globalForCaptcha.__captchaStore) {
  globalForCaptcha.__captchaStore = new Map();
}

const store = globalForCaptcha.__captchaStore;

export function setCaptcha(sessionId: string, data: CaptchaEntry) {
  store.set(sessionId, data);
}

export function getCaptcha(sessionId: string): CaptchaEntry | undefined {
  return store.get(sessionId);
}

export function deleteCaptcha(sessionId: string) {
  store.delete(sessionId);
}

export function cleanupExpiredCaptchas() {
  const now = Date.now();
  for (const [key, val] of store) {
    if (val.expiresAt < now) store.delete(key);
  }
}
