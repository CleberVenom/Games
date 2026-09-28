import type { PlayerColor } from '../game/types';
import { palette } from './palette';

export { palette };

export const PLAYER_HEX: Record<PlayerColor, string> = {
  violet: palette.violet[400],
  cyan: palette.cyan[400],
  pink: palette.pink[400],
  mint: palette.mint[400],
  amber: palette.amber[400],
  coral: palette.coral[400],
};

type Stops = readonly [string, string, ...string[]];

export const gradients = {
  /** Botões principais. */
  primary: [palette.violet[500], palette.pink[500]],
  /** Som de referência. */
  listen: [palette.cyan[500], palette.violet[500]],
  /** Gravação. */
  record: [palette.pink[400], palette.violet[600]],
} as const satisfies Record<string, Stops>;

function toRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = toRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Sombra suave e colorida (brilho neon) no formato `boxShadow`. */
export function glow(hex: string, blur = 28, alpha = 0.45, offsetY = 10): string {
  return `0px ${offsetY}px ${blur}px ${withAlpha(hex, alpha)}`;
}

/** Cor em `t` (0–1) ao longo de um gradiente de várias paradas. */
export function sampleGradient(stops: readonly string[], t: number): string {
  const pos = Math.min(Math.max(t, 0), 1) * (stops.length - 1);
  const i = Math.min(Math.floor(pos), stops.length - 2);
  const a = toRgb(stops[i]);
  const b = toRgb(stops[i + 1]);
  const f = pos - i;
  const mixed = a.map((c, k) => Math.round(c + (b[k] - c) * f));
  return `#${mixed.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}
