/** Ajustes do AnalyserNode do motor (engine.ts); o gráfico rolando usa a janela de `fftSize` amostras. */
export const ANALYSER = { fftSize: 1024, minDecibels: -85, maxDecibels: -20, smoothing: 0.55 } as const;
