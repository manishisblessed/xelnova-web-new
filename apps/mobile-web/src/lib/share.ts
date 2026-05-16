/**
 * Thin wrappers around `react-native`'s `Share.share` to keep call sites
 * concise and consistent. We deliberately avoid `expo-sharing` here — that
 * package is meant for sharing *files*; for plain text + URLs the built-in
 * `Share` API is enough and adds zero install footprint.
 */
import { Share, Platform } from 'react-native';

const STORE_BASE_URL =
  process.env.EXPO_PUBLIC_WEB_BASE_URL?.replace(/\/$/, '') ?? 'https://xelnova.in';

export function buildProductUrl(slug: string): string {
  return `${STORE_BASE_URL}/products/${slug}`;
}

export async function shareProduct(params: {
  name: string;
  slug: string;
  price?: number | null;
  brand?: string | null;
}): Promise<void> {
  const url = buildProductUrl(params.slug);
  const priceText =
    typeof params.price === 'number' && Number.isFinite(params.price)
      ? ` for \u20B9${Math.round(params.price)}`
      : '';
  const brandPrefix = params.brand ? `${params.brand} \u00b7 ` : '';
  const message = `Check out ${brandPrefix}${params.name}${priceText} on Xelnova\n${url}`;

  try {
    await Share.share(
      {
        message,
        // iOS uses `url` as the canonical link; Android merges url into message.
        url: Platform.OS === 'ios' ? url : undefined,
        title: params.name,
      },
      { dialogTitle: 'Share product' },
    );
  } catch {
    /* user cancelled or platform error — silent */
  }
}

export async function shareReferralCode(code: string): Promise<void> {
  const message = [
    'Join me on Xelnova!',
    `Use my referral code ${code} when you sign up to get bonus loyalty points.`,
    `${STORE_BASE_URL}?ref=${encodeURIComponent(code)}`,
  ].join('\n');

  try {
    await Share.share({ message, title: 'Xelnova referral' }, { dialogTitle: 'Share referral' });
  } catch {
    /* ignore */
  }
}
