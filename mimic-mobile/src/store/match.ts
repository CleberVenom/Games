import { create } from 'zustand';

import { createMatch, Match, MatchEvent, reduce } from '../game/match';
import { PlayerSetup } from '../game/types';

interface MatchStore {
  match: Match | null;
  start: (setup: readonly PlayerSetup[]) => void;
  dispatch: (event: MatchEvent) => void;
}

export const useMatch = create<MatchStore>((set) => ({
  match: null,
  start: (setup) => set({ match: createMatch(setup) }),
  dispatch: (event) => set((s) => (s.match ? { match: reduce(s.match, event) } : s)),
}));
