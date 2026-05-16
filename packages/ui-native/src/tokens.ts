/**
 * Xelnova mobile design tokens.
 *
 * Mirrors `apps/web/src/app/globals.css` — Blinkit-inspired emerald + sunshine
 * palette. Keep these in sync with the web side; both should change together.
 */

export const colors = {
  // Primary — Blinkit Trust Green
  primary: {
    50: '#ecfdf3',
    100: '#d1fadf',
    200: '#a6f4c5',
    300: '#6ce9a6',
    400: '#2fcf72',
    500: '#11ab3a',
    600: '#0c831f',
    700: '#086a18',
    800: '#065312',
    900: '#04400e',
  },
  // Accent — Blinkit Sunshine Yellow
  accent: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f5b800',
    600: '#d99a00',
    700: '#b07a00',
    800: '#8a5f00',
    900: '#5e4100',
  },
  // Promo pastels — match Blinkit category banner cards
  promo: {
    teal: { 50: '#e6f7f6', 400: '#4cc6c0', 500: '#2bb6af', 600: '#1f8f89' },
    sunshine: { 50: '#fff7d6', 400: '#ffd640', 500: '#f7c52b' },
    peach: { 50: '#fdecec', 400: '#f5b6b0', 500: '#ec9088' },
    mint: { 50: '#f0fdf4', 400: '#6ce9a6', 500: '#34d399' },
    lavender: { 50: '#f5f3ff', 400: '#c8a8ff', 500: '#a78bfa' },
  },
  surface: {
    DEFAULT: '#ffffff',
    raised: '#f8fafb',
    muted: '#f1f5f9',
    overlay: 'rgba(0, 0, 0, 0.45)',
    dark: '#0f172a',
    warm: '#fef7ee',
    /**
     * Blinkit-aesthetic header tint. Sits on top of `surface` and bleeds
     * into the page so the home + search shells share a soft cyan-mint
     * marketplace tone while the brand stays Xelnova green.
     */
    brand: '#E6F4F0',
    brandStrong: '#CBE9DF',
    /** = primary-600. Used as the Android status-bar/navigation tint. */
    brandDeep: '#0c831f',
  },
  text: {
    primary: '#1a1a2e',
    secondary: '#5a6478',
    muted: '#8d95a5',
    inverse: '#ffffff',
  },
  border: {
    DEFAULT: '#e8ecf1',
    light: '#f2f4f7',
  },
  danger: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
  },
  success: {
    50: '#ecfdf5',
    100: '#d1fae5',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
  },
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',
    600: '#2563eb',
  },
} as const;

export const radii = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 22,
  '3xl': 28,
  full: 9999,
} as const;

export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
} as const;

export const fontSizes = {
  xxs: 10,
  xs: 12,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 40,
} as const;

export const lineHeights = {
  tight: 1.15,
  snug: 1.3,
  normal: 1.45,
  relaxed: 1.6,
} as const;

export const fontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  raised: {
    shadowColor: '#0c831f',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 5,
  },
  primary: {
    shadowColor: '#0c831f',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  accent: {
    shadowColor: '#f7c52b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 6,
  },
} as const;

export const tokens = {
  colors,
  radii,
  spacing,
  fontSizes,
  lineHeights,
  fontWeights,
  shadows,
} as const;

export type Tokens = typeof tokens;
