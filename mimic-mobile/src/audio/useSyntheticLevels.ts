import { useEffect } from 'react';
import { SharedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';

export type VisualizerMode = 'idle' | 'reference' | 'recording' | 'analyzing';

const MODE_CODE: Record<VisualizerMode, number> = { idle: 0, reference: 1, recording: 2, analyzing: 3 };

/**
 * PASSO 1 — sinal sintético para a animação da onda (placeholder pedido para esta etapa).
 * Gera, na thread de UI, `count` níveis de 0 a 1 que imitam um espectro de voz/efeito em cada
 * modo. No Passo 2 este hook é trocado por um que lê o AnalyserNode (FFT) do áudio real,
 * devolvendo o mesmo formato — o visualizador não muda.
 */
export function useSyntheticLevels(mode: VisualizerMode, count: number): SharedValue<number[]> {
  const levels = useSharedValue<number[]>(new Array(count).fill(0.1));
  const modeCode = useSharedValue(MODE_CODE[mode]);

  useEffect(() => {
    modeCode.value = MODE_CODE[mode];
  }, [mode, modeCode]);

  useFrameCallback((frame) => {
    'worklet';
    const t = frame.timeSinceFirstFrame / 1000;
    const m = modeCode.value;
    const prev = levels.value;
    const next = new Array<number>(count);
    for (let i = 0; i < count; i++) {
      let target: number;
      if (m === 0) {
        // Repouso: respiração lenta e baixa.
        target = 0.1 + 0.05 * Math.sin(t * 1.8 + i * 0.5);
      } else if (m === 3) {
        // Análise: um pulso que varre as barras da esquerda para a direita.
        const pos = ((t * 0.9) % 1) * (count + 8) - 4;
        target = 0.1 + 0.6 * Math.exp(-((i - pos) * (i - pos)) / 6);
      } else {
        // Som: envelope em "sílabas" × textura espectral, mais forte no centro.
        const center = 1 - Math.abs(i / (count - 1) - 0.5) * 1.3;
        const syllable = 0.3 + 0.7 * Math.abs(Math.sin(t * (m === 1 ? 3.3 : 2.7)));
        const texture = 0.5 + 0.28 * Math.sin(t * 11.3 + i * 1.9) + 0.22 * Math.sin(t * 6.7 - i * 0.8);
        target = 0.08 + 0.92 * center * syllable * texture;
      }
      next[i] = prev[i] + (Math.min(Math.max(target, 0), 1) - prev[i]) * 0.25;
    }
    levels.value = next;
  });

  return levels;
}
