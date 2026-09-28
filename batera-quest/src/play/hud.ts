import { create } from 'zustand';

import { Judgement } from '../game/types';

export interface HudState {
  score: number;
  combo: number;
  multiplier: number;
  rock: number;
  energy: number;
  energyActive: boolean;
  canActivate: boolean;
  progress: number;
  /** Contagem regressiva (4, 3, 2, 1) antes do primeiro tempo. */
  countIn: number | null;
  judgement: { kind: Judgement; id: number } | null;
}

export const INITIAL_HUD: HudState = {
  score: 0,
  combo: 0,
  multiplier: 1,
  rock: 0.6,
  energy: 0,
  energyActive: false,
  canActivate: false,
  progress: 0,
  countIn: null,
  judgement: null,
};

/** Estado do placar da partida atual (só o HUD re-renderiza quando muda). */
export const useHud = create<HudState>(() => INITIAL_HUD);
