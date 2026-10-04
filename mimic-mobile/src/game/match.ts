import { ModifierId, MODIFIERS, pointsFor } from './modifiers';
import { Phase, Player, PlayerSetup, TurnScore } from './types';

/** Repetições da referência permitidas por turno, além da execução automática. */
export const REPLAYS_PER_TURN = 1;

/** Rodadas que os jogadores podem escolher; cada um joga uma vez por rodada, com qualquer número de jogadores. */
export const MIN_ROUNDS = 1;
export const MAX_ROUNDS = 5;

/** "1 rodada", "3 rodadas". */
export function roundsText(rounds: number): string {
  return `${rounds} ${rounds === 1 ? 'rodada' : 'rodadas'}`;
}

export interface Match {
  players: Player[];
  /** Começa em 1 e avança quando todos os jogadores jogaram. */
  round: number;
  /** Rodadas da partida, de `MIN_ROUNDS` a `MAX_ROUNDS` (a escolha dos jogadores). */
  totalRounds: number;
  /** Sons sorteáveis (dos packs escolhidos). */
  pool: string[];
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
  | { type: 'next' }
  | { type: 'finish' };

type Rng = () => number;

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Fração do tempo do som que sobra para gravar com "Tempo curto" da roleta. */
export const SHORT_TIME_FACTOR = 0.7;

/**
 * Janela de gravação: exatamente a duração da referência (sem botão de parar).
 * Com "Tempo curto" da roleta, 70% dessa duração.
 */
export function recordingWindowMs(referenceMs: number, modifier: ModifierId | null = null): number {
  return modifier === 'shortTime' ? Math.round(referenceMs * SHORT_TIME_FACTOR) : referenceMs;
}

/** Última vez da partida: última rodada, último jogador. */
export function isLastTurn(match: Match): boolean {
  return match.round === match.totalRounds && match.current === match.players.length - 1;
}

export function createMatch(
  setup: readonly PlayerSetup[],
  pool: readonly string[],
  rng: Rng = Math.random,
  rounds: number = MAX_ROUNDS,
): Match {
  if (pool.length === 0) throw new Error('Escolha pelo menos um pack com sons.');
  const [soundId, ...deck] = shuffle(pool, rng);
  return {
    players: setup.map((p, i) => ({
      id: `p${i + 1}`,
      name: p.name.trim() || `Jogador ${i + 1}`,
      avatar: p.avatar,
      score: 0,
      best: null,
    })),
    round: 1,
    totalRounds: rounds,
    pool: [...pool],
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
function refill(pool: readonly string[], lastId: string, rng: Rng): string[] {
  const deck = shuffle(pool, rng);
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
        players: match.players.map((p, i) =>
          i === match.current
            ? {
                ...p,
                score: p.score + points,
                best:
                  !p.best || event.score.total > p.best.total ? { total: event.score.total, soundId: match.soundId } : p.best,
              }
            : p,
        ),
      };
    }
    case 'spin':
      if (match.phase !== 'result' || isLastTurn(match)) return match;
      return { ...match, phase: 'wheel', nextModifier: MODIFIERS[Math.floor(rng() * MODIFIERS.length)].id };
    case 'next': {
      if (match.phase !== 'wheel') return match;
      const current = (match.current + 1) % match.players.length;
      const [soundId, ...deck] = match.deck.length > 0 ? match.deck : refill(match.pool, match.soundId, rng);
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
    case 'finish':
      return match.phase === 'result' && isLastTurn(match) ? { ...match, phase: 'finished' } : match;
  }
}

export interface Standing {
  player: Player;
  /** 1 = primeiro lugar; empates dividem a posição. */
  place: number;
}

/** Classificação final: mais pontos primeiro, empates na mesma posição. */
export function standings(players: readonly Player[]): Standing[] {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  return sorted.map((player) => ({ player, place: sorted.findIndex((p) => p.score === player.score) + 1 }));
}
