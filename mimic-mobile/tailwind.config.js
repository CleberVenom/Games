const { palette } = require('./src/theme/palette');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    // Substitui as cores padrão: só a paleta do app fica disponível (white é usado apenas com opacidade, ex.: bg-white/5).
    colors: {
      transparent: 'transparent',
      white: '#FFFFFF',
      ...palette,
    },
    extend: {
      fontFamily: {
        body: ['Inter_400Regular'],
        ui: ['Inter_500Medium'],
        label: ['Inter_600SemiBold'],
        heading: ['Inter_700Bold'],
        display: ['Inter_800ExtraBold'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};
