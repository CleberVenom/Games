import { roundsFor, shuffle } from '../game/match';
import { ModifierId, MODIFIERS } from '../game/modifiers';
import { avatarOf } from '../avatars/avatars';
import { AvatarId, MAX_ROOM_PLAYERS, PlayerColor, TurnScore } from '../game/types';

/**
 * Modo online (todos imitam ao mesmo tempo). O anfitrião é a autoridade: só ele avança as fases da sala;
 * cada celular grava, dá a própria nota e envia a imitação. Tudo aqui é puro e testável — quem escreve no
 * Firebase é `api.ts`.
 *
 *   lobby → [rodada: imitating → presenting (uma imitação por vez, com reações) → results → wheel] × N → finished
 */

export type RoomStatus = 'lobby' | 'playing' | 'finished';
export type RoundPhase = 'imitating' | 'presenting' | 'results' | 'wheel';

export const REACTIONS = ['laugh', 'tomato', 'happy', 'scared'] as const;
export type Reaction = (typeof REACTIONS)[number];
export const REACTION_EMOJI: Record<Reaction, string> = { laugh: '😂', tomato: '🍅', happy: '😄', scared: '😱' };

export interface RoomPlayer {
  name: string;
  /** Mascote. Em salas criadas por versões antigas só existe `color` (ver `withAvatars`). */
  avatar: AvatarId;
  /** Cor equivalente ao mascote, gravada só para celulares que ainda não têm os mascotes. */
  color: PlayerColor;
  joinedAt: number;
  online: boolean;
  score: number;
  /** Melhor imitação da partida (nota sem bônus) e de qual som — aparece no pódio. */
  best?: { total: number; soundId: string } | null;
}

export interface RoomMeta {
  host: string;
  status: RoomStatus;
  createdAt: number;
  totalRounds: number;
  /** Sons sorteáveis (packs escolhidos pelo anfitrião). */
  pool: string[];
  /** Próximos sons, já embaralhados. */
  deck: string[];
  /** Packs do anfitrião usados na partida (id do pack → código de compartilhamento), que os outros baixam. */
  shared?: Record<string, string>;
}

export interface RoomRound {
  number: number;
  soundId: string;
  /** Efeito da roleta valendo nesta rodada, para todos. */
  modifier: ModifierId | null;
  phase: RoundPhase;
  /** Início da rodada (relógio do anfitrião): conta o prazo para as imitações chegarem. */
  startedAt: number;
  /** Ordem da apresentação (quem enviou imitação, na ordem em que entrou na sala). */
  order: string[];
  /** Quem está sendo apresentado agora (índice em `order`). */
  presenting: number;
  /** Efeito sorteado na roleta do fim da rodada: vale na próxima. */
  nextModifier: ModifierId | null;
}

/** Nota enviada por um jogador (a imitação vai à parte, em `clips`). */
export interface RoomScore extends TurnScore {
  /** Pontos que entram no placar, já com o efeito da roleta. */
  points: number;
  /** Duração da imitação enviada (define o tempo de cada apresentação). */
  clipMs: number;
}

/** Apresentação de cada imitação: nome na tela, a imitação tocando e a nota revelada. */
export const PRESENT_INTRO_MS = 1500;
export const PRESENT_REVEAL_MS = 3500;

export function presentationMs(clipMs: number): number {
  return PRESENT_INTRO_MS + clipMs + PRESENT_REVEAL_MS;
}

const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sem I e O, que confundem com 1 e 0

export function roomCode(rng: () => number = Math.random): string {
  return Array.from({ length: 4 }, () => CODE_LETTERS[Math.floor(rng() * CODE_LETTERS.length)]).join('');
}

export function normalizeCode(text: string): string {
  return text
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 4);
}

/** Jogadores na ordem em que entraram na sala. */
export function playerOrder(players: Record<string, RoomPlayer>): string[] {
  return Object.keys(players).sort((a, b) => players[a].joinedAt - players[b].joinedAt || a.localeCompare(b));
}

/** Jogadores como vêm do banco: quem não tem mascote (sala de versão antiga) ganha o da própria cor. */
export function withAvatars(raw: Record<string, Omit<RoomPlayer, 'avatar'> & { avatar?: string }>): Record<string, RoomPlayer> {
  return Object.fromEntries(Object.entries(raw).map(([uid, p]) => [uid, { ...p, avatar: avatarOf(p) }]));
}

export type JoinCheck = 'ok' | 'full' | 'started' | 'missing';

export function canJoin(meta: RoomMeta | null, players: Record<string, RoomPlayer>, uid: string): JoinCheck {
  if (!meta) return 'missing';
  if (players[uid]) return 'ok';
  if (meta.status !== 'lobby') return 'started';
  if (Object.keys(players).length >= MAX_ROOM_PLAYERS) return 'full';
  return 'ok';
}

/** Prazo para as imitações chegarem: ouvir, repetir, gravar e enviar, com folga. */
export function submitDeadlineMs(soundMs: number): number {
  return 30_000 + soundMs * 4;
}

export function firstRound(soundId: string, now: number): RoomRound {
  return {
    number: 1,
    soundId,
    modifier: null,
    phase: 'imitating',
    startedAt: now,
    order: [],
    presenting: 0,
    nextModifier: null,
  };
}

/** Começa a partida: rodadas pelo número de jogadores (mínimo 5) e baralho com os sons dos packs. */
export function startGame(
  meta: RoomMeta,
  players: Record<string, RoomPlayer>,
  pool: readonly string[],
  now: number,
  rng: () => number = Math.random,
  shared: Record<string, string> = {},
): { meta: RoomMeta; round: RoomRound; players: Record<string, RoomPlayer> } {
  if (pool.length === 0) throw new Error('Escolha pelo menos um pack com sons.');
  const [soundId, ...deck] = shuffle(pool, rng);
  const reset = Object.fromEntries(Object.entries(players).map(([uid, p]) => [uid, { ...p, score: 0 }]));
  // O Realtime Database não aceita `undefined`: sem packs do anfitrião, o campo fica de fora.
  const { shared: _previous, ...base } = meta;
  const packs = Object.keys(shared).length > 0 ? { shared: { ...shared } } : {};
  return {
    meta: { ...base, ...packs, status: 'playing', totalRounds: roundsFor(Object.keys(players).length), pool: [...pool], deck },
    round: firstRound(soundId, now),
    players: reset,
  };
}

/** Quem ainda está conectado e precisa enviar a imitação desta rodada. */
export function pendingPlayers(players: Record<string, RoomPlayer>, scores: Record<string, RoomScore>): string[] {
  return playerOrder(players).filter((uid) => players[uid].online && !scores[uid]);
}

/** A rodada pode ir para a apresentação: todos os conectados enviaram ou o prazo acabou. */
export function readyToPresent(
  round: RoomRound,
  players: Record<string, RoomPlayer>,
  scores: Record<string, RoomScore>,
  soundMs: number,
  now: number,
): boolean {
  if (round.phase !== 'imitating') return false;
  if (Object.keys(scores).length > 0 && pendingPlayers(players, scores).length === 0) return true;
  return now - round.startedAt >= submitDeadlineMs(soundMs);
}

/** Vai para a apresentação, na ordem de entrada, só com quem enviou. Sem ninguém, pula para o resultado. */
export function toPresenting(
  round: RoomRound,
  players: Record<string, RoomPlayer>,
  scores: Record<string, RoomScore>,
): RoomRound {
  const order = playerOrder(players).filter((uid) => scores[uid]);
  return order.length > 0
    ? { ...round, phase: 'presenting', order, presenting: 0 }
    : { ...round, phase: 'results', order: [] };
}

/** Próxima imitação da apresentação; depois da última, o resultado da rodada. */
export function nextPresenter(round: RoomRound): RoomRound {
  if (round.phase !== 'presenting') return round;
  return round.presenting + 1 < round.order.length
    ? { ...round, presenting: round.presenting + 1 }
    : { ...round, phase: 'results' };
}

/** Soma os pontos da rodada ao placar e guarda a melhor imitação (chamado uma vez, ao entrar no resultado). */
export function addRoundPoints(
  players: Record<string, RoomPlayer>,
  scores: Record<string, RoomScore>,
  soundId: string,
): Record<string, RoomPlayer> {
  return Object.fromEntries(
    Object.entries(players).map(([uid, p]) => {
      const s = scores[uid];
      const better = s && (!p.best || s.total > p.best.total);
      return [
        uid,
        { ...p, score: p.score + (s?.points ?? 0), best: better ? { total: s.total, soundId } : (p.best ?? null) },
      ];
    }),
  );
}

export function isLastRound(meta: RoomMeta, round: RoomRound): boolean {
  return round.number >= meta.totalRounds;
}

/** Roleta do fim da rodada: o efeito vale para todos na próxima rodada. */
export function spinWheel(round: RoomRound, rng: () => number = Math.random): RoomRound {
  if (round.phase !== 'results') return round;
  return { ...round, phase: 'wheel', nextModifier: MODIFIERS[Math.floor(rng() * MODIFIERS.length)].id };
}

/** Próxima rodada, com o próximo som do baralho (reembaralha quando acaba, sem repetir o último). */
export function nextRound(
  meta: RoomMeta,
  round: RoomRound,
  now: number,
  rng: () => number = Math.random,
): { meta: RoomMeta; round: RoomRound } {
  let deck = meta.deck;
  if (deck.length === 0) {
    deck = shuffle(meta.pool, rng);
    if (deck[0] === round.soundId && deck.length > 1)
      [deck[0], deck[deck.length - 1]] = [deck[deck.length - 1], deck[0]];
  }
  const [soundId, ...rest] = deck;
  return {
    meta: { ...meta, deck: rest },
    round: {
      number: round.number + 1,
      soundId,
      modifier: round.nextModifier,
      phase: 'imitating',
      startedAt: now,
      order: [],
      presenting: 0,
      nextModifier: null,
    },
  };
}

/** Conta as reações recebidas por um jogador, por tipo. */
export function countReactions(list: readonly { emoji: Reaction }[]): Record<Reaction, number> {
  const counts = { laugh: 0, tomato: 0, happy: 0, scared: 0 };
  for (const r of list) if (r.emoji in counts) counts[r.emoji]++;
  return counts;
}
