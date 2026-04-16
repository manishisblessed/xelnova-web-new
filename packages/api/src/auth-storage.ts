/** Optional prefix so multiple apps (retail vs business) do not clobber tokens in localStorage. */
let keyPrefix = '';

export function configureApiAuthStorage(options: { keyPrefix?: string }) {
  keyPrefix = options.keyPrefix?.trim() ? `${options.keyPrefix!.trim()}:` : '';
}

function k(base: string): string {
  return `${keyPrefix}${base}`;
}

export const AUTH_STORAGE_KEYS = {
  refreshToken: () => k('xelnova-refresh-token'),
  user: () => k('xelnova-user'),
};
