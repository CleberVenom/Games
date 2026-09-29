import type { RoomMeta, RoomRound } from './room';

/**
 * Regras do chat de voz da sala online (lógica pura, sem WebRTC).
 *
 * A voz só fica ligada fora dos sons: na sala antes de começar, no placar da rodada, na roleta e no pódio.
 * Na imitação e na apresentação ela é desligada em todos os celulares. Cada um liga e desliga o próprio
 * microfone; o anfitrião pode mutar qualquer um, mas nunca ligar o microfone de outra pessoa.
 */

/** Último pedido para o microfone de um jogador: ligado ou não, e quem pediu. */
export interface MicState {
  on: boolean;
  by: string;
}

export function voiceAllowed(meta: RoomMeta | null, round: RoomRound | null): boolean {
  if (!meta) return false;
  if (meta.status !== 'playing') return true;
  return round?.phase === 'results' || round?.phase === 'wheel';
}

/** Microfone aberto? Sem registro, ele entra aberto. Um "ligar" vindo de outra pessoa não vale. */
export function micOpen(uid: string, state: MicState | undefined): boolean {
  if (!state) return true;
  return state.on && state.by === uid;
}

/** Mutado por outra pessoa (o anfitrião), e não por ele mesmo. */
export function mutedByOther(uid: string, state: MicState | undefined): boolean {
  return Boolean(state && !state.on && state.by !== uid);
}

/** Em cada par, quem começa a ligação: sempre o de menor id, para os dois não ligarem ao mesmo tempo. */
export function callsFirst(me: string, other: string): boolean {
  return me < other;
}

/** Volume (0 a 1, das estatísticas do WebRTC) a partir do qual alguém aparece falando. */
export const SPEAKING_LEVEL = 0.02;

/** Identificador de uma conexão de voz; muda a cada vez que o celular entra na voz. */
export function voiceSessionId(random: () => number = Math.random): string {
  return Math.floor(random() * 36 ** 8)
    .toString(36)
    .padStart(8, '0');
}
