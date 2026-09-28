import { ModifierId, MODIFIERS, pointsFor } from './modifiers';
import { SOUNDS } from './sounds';
import { Phase, Player, PlayerSetup, TurnScore } from './types';

/** Repetições da referência permitidas por turno, além da execução automática. */
export const REPLAYS_PER_TURN = 1;

export interface Match {
  players: Player[];
  /** Começa em 1 e avança quando todos os jogadores jogaram. */
  round: number;
  /** Índice do jogador da vez em `players`. */
  current: number;
  phase: Phase;
  soundId: string;
  /** Próximos sons, já embaralhados. Reabastece quando acaba. */
  deck: string[];
  replaysLeft: number;
  lastScore: TurnScore | null;
  /** Pontos que a última nota rendeu, já com o modificador. */
  lastPoints: number | null;
  /** Efeito da roleta valendo neste turno (sorteado no fim do turno anterior). */
  modifier: ModifierId | null;
  /** Efeito sorteado na roleta deste turno; passa a valer no turno do próximo jogador. */
  nextModifier: ModifierId | null;
}

export type MatchEvent =
  | { type: 'start' }
  | { type: 'referenceEnded' }
  | { type: 'replay' }
  | { type: 'record' }
  | { type: 'recordingEnded' }
  | { type: 'scored'; score: TurnScore }
  | { type: 'spin' }
  | { type: 'next' };

type Rng = () => number;

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Janela de gravação: a duração da referência + folga, entre 2,5 s e 6 s.
 * Com "Tempo curto" da roleta, a folga cai para 0,3 s (mínimo de 1,5 s).
 */
export function recordingWindowMs(referenceMs: number, modifier: ModifierId | null = null): number {
  if (modifier === 'shortTime') return Math.min(6000, Math.max(1500, referenceMs + 300));
  return Math.min(6000, Math.max(2500, referenceMs + 1500));
}

export function createMatch(setup: readonly PlayerSetup[], rng: Rng = Math.random): Match {
  const [soundId, ...deck] = shuffle(
    SOUNDS.map((s) => s.id),
    rng,
  );
  return {
    players: setup.map((p, i) => ({
      id: `p${i + 1}`,
      name: p.name.trim() || `Jogador ${i + 1}`,
      color: p.color,
      score: 0,
    })),
    round: 1,
    current: 0,
    phase: 'handoff',
    soundId,
    deck,
    replaysLeft: REPLAYS_PER_TURN,
    lastScore: null,
    lastPoints: null,
    modifier: null,
    nextModifier: null,
  };
}

/** Novo baralho quando o atual acaba, sem repetir o último som logo em seguida. */
function refill(lastId: string, rng: Rng): string[] {
  const deck = shuffle(
    SOUNDS.map((s) => s.id),
    rng,
  );
  if (deck[0] === lastId) [deck[0], deck[deck.length - 1]] = [deck[deck.length - 1], deck[0]];
  return deck;
}

/** Máquina de estados do turno. Eventos fora da fase esperada são ignorados. */
export function reduce(match: Match, event: MatchEvent, rng: Rng = Math.random): Match {
  switch (event.type) {
    case 'start':
      return match.phase === 'handoff' ? { ...match, phase: 'listening' } : match;
    case 'referenceEnded':
      return match.phase === 'listening' ? { ...match, phase: 'ready' } : match;
    case 'replay':
      return match.phase === 'ready' && match.replaysLeft > 0
        ? { ...match, phase: 'listening', replaysLeft: match.replaysLeft - 1 }
        : match;
    case 'record':
      return match.phase === 'ready' ? { ...match, phase: 'recording' } : match;
    case 'recordingEnded':
      return match.phase === 'recording' ? { ...match, phase: 'analyzing' } : match;
    case 'scored': {
      if (match.phase !== 'analyzing') return match;
      const points = pointsFor(event.score.total, match.modifier);
      return {
        ...match,
        phase: 'result',
        lastScore: event.score,
        lastPoints: points,
        players: match.players.map((p, i) => (i === match.current ? { ...p, score: p.score + points } : p)),
      };
    }
    case 'spin':
      if (match.phase !== 'result') return match;
      return { ...match, phase: 'wheel', nextModifier: MODIFIERS[Math.floor(rng() * MODIFIERS.length)].id };
    case 'next': {
      if (match.phase !== 'wheel') return match;
      const current = (match.current + 1) % match.players.length;
      const [soundId, ...deck] = match.deck.length > 0 ? match.deck : refill(match.soundId, rng);
      return {
        ...match,
        current,
        round: current === 0 ? match.round + 1 : match.round,
        phase: 'handoff',
        soundId,
        deck,
        replaysLeft: match.nextModifier === 'noReplay' ? 0 : REPLAYS_PER_TURN,
        lastScore: null,
        lastPoints: null,
        modifier: match.nextModifier,
        nextModifier: null,
      };
    }
  }
}
