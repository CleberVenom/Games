import { REPLAYS_PER_TURN } from '../game/match';
import type { ModifierId } from '../game/modifiers';
import type { Phase, TurnScore } from '../game/types';

/**
 * A vez de cada celular numa rodada online (todos ao mesmo tempo). Usa as mesmas fases e eventos da partida
 * local, para reaproveitar o áudio (`useAudioTurn`) e a interface:
 * handoff (pronto para ouvir) → listening → ready (repetir 1x ou imitar) → recording → analyzing → result (enviado).
 */
export interface SoloTurn {
  phase: Extract<Phase, 'handoff' | 'listening' | 'ready' | 'recording' | 'analyzing' | 'result'>;
  replaysLeft: number;
  score: TurnScore | null;
}

export type SoloEvent =
  | { type: 'start' }
  | { type: 'referenceEnded' }
  | { type: 'replay' }
  | { type: 'record' }
  | { type: 'recordingEnded' }
  | { type: 'scored'; score: TurnScore };

export function soloTurn(modifier: ModifierId | null): SoloTurn {
  return { phase: 'handoff', replaysLeft: modifier === 'noReplay' ? 0 : REPLAYS_PER_TURN, score: null };
}

export function reduceSolo(turn: SoloTurn, event: SoloEvent): SoloTurn {
  switch (event.type) {
    case 'start':
      return turn.phase === 'handoff' ? { ...turn, phase: 'listening' } : turn;
    case 'referenceEnded':
      return turn.phase === 'listening' ? { ...turn, phase: 'ready' } : turn;
    case 'replay':
      return turn.phase === 'ready' && turn.replaysLeft > 0
        ? { ...turn, phase: 'listening', replaysLeft: turn.replaysLeft - 1 }
        : turn;
    case 'record':
      return turn.phase === 'ready' ? { ...turn, phase: 'recording' } : turn;
    case 'recordingEnded':
      return turn.phase === 'recording' ? { ...turn, phase: 'analyzing' } : turn;
    case 'scored':
      return turn.phase === 'analyzing' ? { ...turn, phase: 'result', score: event.score } : turn;
  }
}
