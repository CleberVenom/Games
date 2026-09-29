import { fft } from '../dsp/fft';

const MIN_HZ = 80;
const MAX_HZ = 8000;

/** Ajustes do AnalyserNode do motor (engine.ts); `referenceProfile` imita o mesmo cálculo. */
export const ANALYSER = { fftSize: 1024, minDecibels: -85, maxDecibels: -20, smoothing: 0.55 } as const;

/** Quadros mais baixos que isto (RMS, dBFS) são silêncio e ficam fora da silhueta. */
const PROFILE_SILENCE_DB = -50;

/**
 * Converte o espectro do AnalyserNode (bytes 0–255 por faixa de frequência) em `count` barras de 0 a 1.
 * As faixas são logarítmicas entre 80 Hz e 8 kHz (onde está a voz) e espelhadas: graves no centro,
 * agudos nas pontas — o mesmo desenho simétrico da animação de repouso.
 */
export function spectrumToBars(bins: Uint8Array, count: number, sampleRate: number): number[] {
  const half = Math.ceil(count / 2);
  const hzPerBin = sampleRate / 2 / bins.length;
  const bands: number[] = [];
  for (let b = 0; b < half; b++) {
    const lo = MIN_HZ * (MAX_HZ / MIN_HZ) ** (b / half);
    const hi = MIN_HZ * (MAX_HZ / MIN_HZ) ** ((b + 1) / half);
    const from = Math.min(Math.floor(lo / hzPerBin), bins.length - 1);
    const to = Math.min(Math.max(Math.ceil(hi / hzPerBin), from + 1), bins.length);
    let peak = 0;
    for (let i = from; i < to; i++) peak = Math.max(peak, bins[i]);
    bands.push(peak / 255);
  }
  return Array.from({ length: count }, (_, i) => {
    const fromCenter = Math.floor(Math.abs(i - (count - 1) / 2));
    return bands[Math.min(fromCenter, half - 1)];
  });
}

/**
 * Silhueta de um som: a média das barras (`spectrumToBars`) nos trechos com som, calculadas como o
 * AnalyserNode faz ao vivo (janela Blackman, |FFT|/N em dB, escala min/max → 0–255). Assim a
 * silhueta fixa do som original e as barras da voz ficam na mesma escala.
 */
export function referenceProfile(samples: Float32Array, sampleRate: number, count: number): number[] {
  const n = ANALYSER.fftSize;
  const window = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    window[i] = 0.42 - 0.5 * Math.cos((2 * Math.PI * i) / n) + 0.08 * Math.cos((4 * Math.PI * i) / n);
  }
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  const bins = new Uint8Array(n / 2);
  const range = ANALYSER.maxDecibels - ANALYSER.minDecibels;
  const sum = new Array<number>(count).fill(0);
  let frames = 0;

  for (let start = 0; start + n <= samples.length; start += n / 2) {
    let energy = 0;
    for (let i = 0; i < n; i++) energy += samples[start + i] ** 2;
    if (10 * Math.log10(energy / n + 1e-12) < PROFILE_SILENCE_DB) continue;

    for (let i = 0; i < n; i++) {
      re[i] = samples[start + i] * window[i];
      im[i] = 0;
    }
    fft(re, im);
    for (let k = 0; k < bins.length; k++) {
      const db = 20 * Math.log10(Math.hypot(re[k], im[k]) / n + 1e-12);
      bins[k] = Math.max(0, Math.min(255, Math.floor((255 * (db - ANALYSER.minDecibels)) / range)));
    }
    const bars = spectrumToBars(bins, count, sampleRate);
    for (let b = 0; b < count; b++) sum[b] += bars[b];
    frames++;
  }
  return sum.map((v) => (frames > 0 ? v / frames : 0));
}
