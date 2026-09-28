import { useEffect } from 'react';

import type { MatchEvent } from '../game/match';
import type { Phase, TurnScore } from '../game/types';

const ANALYSIS_MS = 1600;

function randomScore(): TurnScore {
  const pitch = 30 + Math.round(Math.random() * 68);
  const rhythm = 30 + Math.round(Math.random() * 68);
  return { pitch, rhythm, total: Math.round((pitch + rhythm) / 2) };
}

/**
 * PASSO 1 — simula o áudio para a UI poder ser jogada de ponta a ponta:
 * a referência "toca" pela duração do som, a gravação termina sozinha no fim da janela e a
 * análise devolve uma nota aleatória. O Passo 2 troca a reprodução/gravação por áudio real e o
 * Passo 3 troca `randomScore` pela comparação por FFT (tom e ritmo).
 */
export function useSimulatedTurn(
  phase: Phase,
  referenceMs: number,
  recordingMs: number,
  dispatch: (event: MatchEvent) => void,
) {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (phase === 'listening') {
      timer = setTimeout(() => dispatch({ type: 'referenceEnded' }), referenceMs);
    } else if (phase === 'recording') {
      timer = setTimeout(() => dispatch({ type: 'recordingEnded' }), recordingMs);
    } else if (phase === 'analyzing') {
      timer = setTimeout(() => dispatch({ type: 'scored', score: randomScore() }), ANALYSIS_MS);
    }
    return () => clearTimeout(timer);
  }, [phase, referenceMs, recordingMs, dispatch]);
}
