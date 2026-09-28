export const PLAYER_COLORS = ['violet', 'cyan', 'pink', 'mint', 'amber', 'coral'] as const;
export type PlayerColor = (typeof PLAYER_COLORS)[number];

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = PLAYER_COLORS.length;

export interface PlayerSetup {
  name: string;
  color: PlayerColor;
}

export interface Player extends PlayerSetup {
  id: string;
  score: number;
}

/** Nota de uma imitação: cada parte vai de 0 a 100. */
export interface TurnScore {
  total: number;
  pitch: number;
  rhythm: number;
}

/**
 * Fases de um turno:
 * handoff (passar o celular) → listening (referência tocando) → ready (pode repetir 1x ou gravar)
 * → recording (uma única chance) → analyzing → result → wheel (roleta do próximo turno).
 */
export type Phase = 'handoff' | 'listening' | 'ready' | 'recording' | 'analyzing' | 'result' | 'wheel';
