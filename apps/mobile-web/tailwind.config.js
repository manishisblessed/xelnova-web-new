/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    '../../packages/ui-native/src/**/*.{ts,tsx}',
  ],
  presets: [
    require('nativewind/preset'),
    require('@xelnova/ui-native/preset'),
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
