/** Lightweight client-side validators. Server is the source of truth, so
 *  these only catch obviously malformed input before we hit the network. */

export const PHONE_REGEX = /^[6-9]\d{9}$/;
export const PINCODE_REGEX = /^[1-9][0-9]{5}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidIndianPhone(value: string): boolean {
  return PHONE_REGEX.test(value.replace(/\D/g, ''));
}

export function isValidPincode(value: string): boolean {
  return PINCODE_REGEX.test(value.trim());
}

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

/** Strip non-digits and clamp to a max length. */
export function digitsOnly(value: string, maxLength?: number): string {
  const stripped = value.replace(/\D/g, '');
  if (maxLength === undefined) return stripped;
  return stripped.slice(0, maxLength);
}
