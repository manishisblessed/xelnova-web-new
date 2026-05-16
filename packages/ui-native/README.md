# @xelnova/ui-native

React Native primitives + design tokens for Xelnova mobile apps. Mirrors the
visual language defined in `apps/web/src/app/globals.css` (Blinkit-inspired
emerald primary + sunshine accent palette) so the customer-facing web app and
the mobile app share a single source of truth for colours, radii and spacing.

## Consumers

- `apps/mobile-web` (customer)

> The seller and business mobile apps (`apps/mobile-seller`,
> `apps/mobile-business`) are out of scope for the current iteration.

## Contents

| Export | Description |
|---|---|
| `tokens` (and the named sub-objects `colors`, `radii`, `spacing`, `fontSizes`, `lineHeights`, `fontWeights`, `shadows`) | Design tokens consumable from JS (e.g. native shadow props, gradients). |
| `cn(...inputs)` | `clsx` + `tailwind-merge` helper, identical semantics to `@xelnova/utils`. |
| `Button`, `Card`, `Pill`, `TagChip`, `Skeleton`, `Input` | NativeWind-powered primitives. |
| `tailwind-preset.js` (root export) | Tailwind preset that adds the Xelnova colour scale to NativeWind apps. |

## Wiring it up in a mobile app

```js
// tailwind.config.js
module.exports = {
  presets: [require('nativewind/preset'), require('@xelnova/ui-native/preset')],
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    '../../packages/ui-native/src/**/*.{ts,tsx}',
  ],
};
```

Make sure NativeWind v4.2+ is installed and the Metro config wraps the bundler
with `withNativeWind`. See `apps/mobile-web` for a working example.

## Adding a new component

1. Create the file under `src/`.
2. Use NativeWind `className` strings for styling. Only fall back to `style` for
   things NativeWind can't express yet (e.g. shadow props on iOS).
3. Re-export it from `src/index.ts`.
4. Pull tokens from `./tokens` if a value can't be expressed as a class.
