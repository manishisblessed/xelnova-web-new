/**
 * Babel config for the customer mobile app.
 *
 * - `babel-preset-expo` is provided by Expo SDK 54 and includes the
 *   `react-native-worklets/plugin` automatically when `reanimated` is detected,
 *   so we no longer add the worklets/reanimated plugin here.
 * - `jsxImportSource: 'nativewind'` is what NativeWind v4 needs to inject the
 *   `className` → style conversion at compile time.
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          jsxImportSource: 'nativewind',
        },
      ],
      'nativewind/babel',
    ],
  };
};
