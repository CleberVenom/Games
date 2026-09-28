import { useEffect } from 'react';
import { SharedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';

import { engine } from './engine';
import { spectrumToBars } from './spectrum';

export type VisualizerMode = 'idle' | 'reference' | 'recording' | 'analyzing';

const MODE_CODE: Record<VisualizerMode, number> = { idle: 0, reference: 1, recording: 2, analyzing: 3 };

/**
 * Níveis (0–1) das barras do visualizador.
 * - `reference` e `recording`: espectro real do AnalyserNode (FFT), lido no JS a cada quadro;
 * - `idle` e `analyzing`: animação decorativa (respiração lenta / varredura), sem áudio.
 * A suavização roda na thread de UI, então a troca entre modos é contínua.
 */
export function useVisualizerLevels(mode: VisualizerMode, count: number): SharedValue<number[]> {
  const levels = useSharedValue<number[]>(new Array(count).fill(0.1));
  const live = useSharedValue<number[]>(new Array(count).fill(0));
  const modeCode = useSharedValue(MODE_CODE[mode]);

  useEffect(() => {
    modeCode.value = MODE_CODE[mode];
    if (mode !== 'reference' && mode !== 'recording') return;
    const analyser = engine.analyser;
    const bins = new Uint8Array(analyser.frequencyBinCount);
    const sampleRate = engine.context.sampleRate;
    let raf = requestAnimationFrame(function tick() {
      analyser.getByteFrequencyData(bins);
      live.value = spectrumToBars(bins, count, sampleRate);
      raf = requestAnimationFrame(tick);
    });
    return () => {
      cancelAnimationFrame(raf);
      live.value = new Array(count).fill(0);
    };
  }, [mode, count, modeCode, live]);

  useFrameCallback((frame) => {
    'worklet';
    const t = frame.timeSinceFirstFrame / 1000;
    const m = modeCode.value;
    const prev = levels.value;
    const audio = live.value;
    const next = new Array<number>(count);
    for (let i = 0; i < count; i++) {
      let target: number;
      if (m === 1 || m === 2) {
        target = 0.06 + 0.94 * audio[i];
      } else if (m === 3) {
        // Análise: um pulso que varre as barras da esquerda para a direita.
        const pos = ((t * 0.9) % 1) * (count + 8) - 4;
        target = 0.1 + 0.6 * Math.exp(-((i - pos) * (i - pos)) / 6);
      } else {
        // Repouso: respiração lenta e baixa.
        target = 0.1 + 0.05 * Math.sin(t * 1.8 + i * 0.5);
      }
      next[i] = prev[i] + (Math.min(Math.max(target, 0), 1) - prev[i]) * 0.3;
    }
    levels.value = next;
  });

  return levels;
}
