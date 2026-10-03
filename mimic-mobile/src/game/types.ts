/**
 * Ids de cor da primeira versão. O jogador é identificado pelo mascote (`AvatarId`); a cor só continua sendo
 * gravada nas salas online (`color`) para que celulares ainda sem os mascotes mostrem alguma coisa.
 */
export const PLAYER_COLORS = ['violet', 'cyan', 'pink', 'mint', 'amber', 'coral', 'sky', 'lime', 'orange', 'orchid'] as const;
export type PlayerColor = (typeof PLAYER_COLORS)[number];

/** Os mascotes, na ordem do carrossel. Os desenhos ficam em src/avatars/art.ts (scripts/make-avatars.py). */
export const AVATAR_IDS = [
  'polvo',
  'gato',
  'pintinho',
  'sapo',
  'estegossauro',
  'tubarao',
  'robo',
  'fantasma',
  'monstro',
  'disfarce',
  'abacaxi',
  'alien',
  'caveira',
  'coruja',
  'unicornio',
] as const;
export type AvatarId = (typeof AVATAR_IDS)[number];

export const MIN_PLAYERS = 2;
/** Máximo no modo local (um celular passando a vez). */
export const MAX_PLAYERS = 6;
/** Máximo numa sala online. Há mais mascotes que jogadores, para o último a escolher ainda ter opção. */
export const MAX_ROOM_PLAYERS = 10;

export interface PlayerSetup {
  name: string;
  avatar: AvatarId;
}

export interface Player extends PlayerSetup {
  id: string;
  score: number;
  /** Melhor imitação da partida (nota sem bônus) e de qual som. */
  best: { total: number; soundId: string } | null;
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
 * Na última vez da última rodada, result → finished (pódio).
 */
export type Phase =
  | 'handoff'
  | 'listening'
  | 'ready'
  | 'recording'
  | 'analyzing'
  | 'result'
  | 'wheel'
  | 'finished';
