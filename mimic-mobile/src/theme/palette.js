/**
 * Paleta única do app ("Carnaval", out/2026). É lida pelo Tailwind (tailwind.config.js) e pelos componentes
 * que precisam do valor hex (gradientes, brilhos, cores dos jogadores). Nenhuma cor pura: o fundo é uva escura
 * e viva, o texto é creme quente e os destaques são rosa-choque e laranja.
 *
 * Contraste (WCAG): texto creme ≥ 6:1 em todos os fundos; texto branco sobre `fuchsia-500`/`tangerine-500`
 * (botões) ≈ 3,5:1, o mesmo patamar do app anterior (texto grande e em negrito).
 */
const palette = {
  // Fundo e superfícies (uva): 950 = tela, 850 = cartão, 800/700 = campos e bordas
  night: { 950: '#2E093C', 900: '#340E42', 850: '#3C154B', 800: '#471F58', 700: '#592E6B', 600: '#714385', 500: '#915DA8' },
  // Texto (creme quente): 50 = título, 200 = corpo, 400/500 = apoio
  mist: { 50: '#FAF4EC', 200: '#DBCFBF', 400: '#BFAC94', 500: '#AB9981' },
  // Marca: rosa-choque → laranja (gradiente principal e botões)
  fuchsia: { 300: '#FEBAD7', 400: '#FF80BC', 500: '#E43A97', 600: '#BA0775' },
  tangerine: { 300: '#FFC29D', 400: '#FE9045', 500: '#CB6409' },
  // Cor fria de contraste: turquesa (informação, "ouvir") e o azul onde o gradiente "ouvir" termina
  cyan: { 300: '#8CEBEA', 400: '#4DDCDC', 500: '#039B9B' },
  sky: { 600: '#3482DE' },
  // Estados
  mint: { 400: '#10FCBD' }, // sucesso, online, quem está falando
  amber: { 400: '#FFE65D' }, // anfitrião, destaque
  coral: { 400: '#FE8D7F' }, // erro
};

/** Cores dos 10 jogadores (ids antigos mantidos: ficam salvos nas salas online). */
const players = {
  coral: '#FE8D7F',
  orange: '#FFBB77',
  amber: '#FFE65D',
  lime: '#BCD20A',
  mint: '#10FCBD',
  cyan: '#52DFEA',
  sky: '#8FB8FE',
  violet: '#918AFE',
  orchid: '#CB6ADE',
  pink: '#FB69AC',
};

module.exports = { palette, players };
