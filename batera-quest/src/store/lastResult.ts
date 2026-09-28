import { create } from 'zustand';

import { Reward } from '../game/progression';
import { SessionResults } from '../game/session';
import { Difficulty } from '../game/types';

export interface LastResult {
  mode: 'lesson' | 'song';
  id: string;
  difficulty?: Difficulty;
  title: string;
  results: SessionResults;
  reward: Reward;
  /** Atraso médio dos acertos em ms (positivo = atrasado). Ajuda a calibrar a latência. */
  meanOffsetMs: number;
}

/** Resultado da última partida, lido pela tela de resultados (em memória). */
export const useLastResult = create<{ last: LastResult | null; set: (r: LastResult) => void }>((set) => ({
  last: null,
  set: (last) => set({ last }),
}));
