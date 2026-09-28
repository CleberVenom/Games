const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

// inlineRem: 16 → no celular 1rem = 16px, igual à web (o padrão do NativeWind é 14).
module.exports = withNativeWind(getDefaultConfig(__dirname), {
  input: './src/global.css',
  inlineRem: 16,
});
