import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Compose Tailwind/NativeWind class strings with conflict resolution.
 *
 * Re-exported here (instead of imported from `@xelnova/utils`) because the web
 * `utils` package ships as compiled `dist/index.js` and pulling it through
 * Metro adds zero value for a 4-line helper.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
