/**
 * Shared Tailwind preset for Xelnova mobile apps. Mirrors the design tokens in
 * `src/tokens.ts` and `apps/web/src/app/globals.css` so utility classes resolve
 * to identical values across web and native.
 *
 * Consumed by `apps/mobile-web/tailwind.config.js` via the `presets` array and
 * by `nativewind/preset` for RN style transformation.
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [],
  theme: {
    extend: {
      colors: {
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
        'promo-teal': {
          50: '#e6f7f6',
          400: '#4cc6c0',
          500: '#2bb6af',
          600: '#1f8f89',
        },
        'promo-sunshine': {
          50: '#fff7d6',
          400: '#ffd640',
          500: '#f7c52b',
        },
        'promo-peach': {
          50: '#fdecec',
          400: '#f5b6b0',
          500: '#ec9088',
        },
        'promo-mint': {
          50: '#f0fdf4',
          400: '#6ce9a6',
          500: '#34d399',
        },
        'promo-lavender': {
          50: '#f5f3ff',
          400: '#c8a8ff',
          500: '#a78bfa',
        },
        surface: {
          DEFAULT: '#ffffff',
          raised: '#f8fafb',
          muted: '#f1f5f9',
          dark: '#0f172a',
          warm: '#fef7ee',
          brand: '#E6F4F0',
          'brand-strong': '#CBE9DF',
          'brand-deep': '#0c831f',
        },
        ink: {
          DEFAULT: '#1a1a2e',
          secondary: '#5a6478',
          muted: '#8d95a5',
          inverse: '#ffffff',
        },
        line: {
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
      },
      fontFamily: {
        sans: ['Inter', 'System'],
        display: ['Poppins', 'Inter', 'System'],
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '18px',
        '2xl': '22px',
        '3xl': '28px',
      },
    },
  },
};
