import { create } from 'zustand';

import { createMatch, Match, MatchEvent, reduce } from '../game/match';
import { PlayerSetup } from '../game/types';

interface MatchStore {
  match: Match | null;
  /** Nova partida com os jogadores e os sons dos packs escolhidos. */
  start: (setup: readonly PlayerSetup[], pool: readonly string[], rounds: number) => void;
  /** Revanche: mesmos jogadores e mesmos packs, placar zerado. */
  rematch: () => void;
  dispatch: (event: MatchEvent) => void;
}

export const useMatch = create<MatchStore>((set) => ({
  match: null,
  start: (setup, pool, rounds) => set({ match: createMatch(setup, pool, Math.random, rounds) }),
  rematch: () =>
    set((s) =>
      s.match
        ? {
            match: createMatch(
              s.match.players.map(({ name, avatar }) => ({ name, avatar })),
              s.match.pool,
              Math.random,
              s.match.totalRounds,
            ),
          }
        : s,
    ),
  dispatch: (event) => set((s) => (s.match ? { match: reduce(s.match, event) } : s)),
}));
