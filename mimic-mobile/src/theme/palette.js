/**
 * Paleta única do app. É lida pelo Tailwind (tailwind.config.js) e pelos componentes que precisam
 * do valor hex (gradientes, brilhos, cores dinâmicas dos jogadores). Nenhuma cor pura: o fundo é
 * azul-noturno e os destaques são neon suavizados.
 */
const palette = {
  night: {
    950: '#0A0C1D',
    900: '#0F1228',
    850: '#141833',
    800: '#1A1F3F',
    700: '#252B52',
    600: '#343B68',
    500: '#4A5285',
  },
  mist: {
    50: '#F2F3FA',
    200: '#C7CAE3',
    400: '#9095BD',
    500: '#6D729A',
  },
  violet: { 300: '#C4B1FF', 400: '#A68CFF', 500: '#8B6BFF', 600: '#7050EE' },
  cyan: { 300: '#9AF1F7', 400: '#56E1EC', 500: '#2CC5D6' },
  pink: { 300: '#FF9FD6', 400: '#FF70C3', 500: '#F0479D' },
  mint: { 400: '#62E4AE' },
  amber: { 400: '#FFC96B' },
  coral: { 400: '#FF7D8C' },
  sky: { 400: '#6FA8FF' },
  lime: { 400: '#BFEA6A' },
  orange: { 400: '#FFA15C' },
  orchid: { 400: '#E58CFF' },
};

module.exports = { palette };
