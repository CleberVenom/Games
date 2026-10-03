import { useEffect } from 'react';
import { SharedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';

import { engine } from './engine';
import { pushHistory, rmsLevel, TICK_MS } from './loudness';

export type VisualizerMode = 'idle' | 'reference' | 'recording' | 'analyzing';

const MODE_CODE: Record<VisualizerMode, number> = { idle: 0, reference: 1, recording: 2, analyzing: 3 };

export interface Visualizer {
  /** Altura de cada barra (0–1), da mais antiga (esquerda) à mais nova (direita); uma a mais que as visíveis. */
  levels: SharedValue<number[]>;
  /** Silhueta do som original no mesmo instante de cada barra (0 = nenhuma). */
  ghost: SharedValue<number[]>;
  /** Vai de 1 a 0 durante cada barra: desliza a fileira para a esquerda sem trancos. */
  shift: SharedValue<number>;
}

/**
 * Barras do gráfico de som.
 * - `reference` e `recording`: volume ao vivo do analisador do motor; uma barra nova entra pela direita a cada
 *   `TICK_MS` e a mais antiga sai pela esquerda. Com `envelope`, a silhueta do som original rola junto, no
 *   mesmo instante da voz;
 * - `idle` e `analyzing`: animação decorativa parada (respiração lenta / varredura), sem áudio.
 */
export function useVisualizer(mode: VisualizerMode, count: number, envelope: readonly number[] | null = null): Visualizer {
  const slots = count + 1;
  const levels = useSharedValue<number[]>(new Array(slots).fill(0.1));
  const live = useSharedValue<number[]>(new Array(slots).fill(0));
  const ghost = useSharedValue<number[]>(new Array(slots).fill(0));
  const shift = useSharedValue(0);
  const modeCode = useSharedValue(MODE_CODE[mode]);

  useEffect(() => {
    modeCode.value = MODE_CODE[mode];
    if (mode !== 'reference' && mode !== 'recording') return;
    const analyser = engine.analyser;
    const wave = new Float32Array(analyser.fftSize);
    let history = new Array<number>(slots).fill(0);
    let shadow = new Array<number>(slots).fill(0);
    let pushed = 0;
    let peak = 0;
    const start = Date.now();
    live.value = history;
    ghost.value = shadow;
    let raf = requestAnimationFrame(function tick() {
      analyser.getFloatTimeDomainData(wave);
      peak = Math.max(peak, rmsLevel(wave));
      const elapsed = Date.now() - start;
      const due = Math.floor(elapsed / TICK_MS);
      if (due > pushed) {
        for (; pushed < due; pushed++) {
          history = pushHistory(history, peak);
          shadow = pushHistory(shadow, envelope?.[pushed] ?? 0);
        }
        peak = 0;
        live.value = history;
        ghost.value = shadow;
      }
      shift.value = 1 - (elapsed % TICK_MS) / TICK_MS;
      raf = requestAnimationFrame(tick);
    });
    return () => {
      cancelAnimationFrame(raf);
      live.value = new Array(slots).fill(0);
      ghost.value = new Array(slots).fill(0);
      shift.value = 0;
    };
  }, [mode, slots, envelope, modeCode, live, ghost, shift]);

  useFrameCallback((frame) => {
    'worklet';
    const m = modeCode.value;
    if (m === 1 || m === 2) {
      levels.value = live.value;
      return;
    }
    const t = frame.timeSinceFirstFrame / 1000;
    const prev = levels.value;
    const next = new Array<number>(slots);
    for (let i = 0; i < slots; i++) {
      let target: number;
      if (m === 3) {
        // Análise: um pulso que varre as barras da esquerda para a direita.
        const pos = ((t * 0.9) % 1) * (slots + 8) - 4;
        target = 0.1 + 0.6 * Math.exp(-((i - pos) * (i - pos)) / 6);
      } else {
        // Repouso: respiração lenta e baixa.
        target = 0.1 + 0.05 * Math.sin(t * 1.8 + i * 0.5);
      }
      next[i] = prev[i] + (target - prev[i]) * 0.3;
    }
    levels.value = next;
  });

  return { levels, ghost, shift };
}
