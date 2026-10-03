import { ANALYSER } from './spectrum';

/**
 * Gráfico rolando: cada barra é o volume do som num instante. Uma barra nova entra pela direita a cada
 * `TICK_MS` e a mais antiga sai pela esquerda (32 barras ≈ os últimos 2,2 s).
 */
export const TICK_MS = 70;

/** Faixa de volume das barras: −55 dBFS (silêncio) a −12 dBFS (bem alto). */
const FLOOR_DB = -55;
const CEIL_DB = -12;
/** Leituras do analisador por barra ao vivo (~60 quadros por segundo). */
const FRAME_MS = 1000 / 60;

/** Volume (0–1) de um trecho de áudio: o RMS em dBFS levado da faixa das barras para 0–1. */
export function rmsLevel(samples: ArrayLike<number>, from = 0, to = samples.length): number {
  const n = to - from;
  if (n <= 0) return 0;
  let sum = 0;
  for (let i = from; i < to; i++) sum += samples[i] * samples[i];
  const db = 10 * Math.log10(sum / n + 1e-12);
  return Math.min(1, Math.max(0, (db - FLOOR_DB) / (CEIL_DB - FLOOR_DB)));
}

/**
 * Silhueta do som original no tempo: um valor por barra, medido como o gráfico ao vivo faz (o maior volume
 * da janela do analisador lido a cada quadro durante aquela barra). Rola junto com a voz na hora de imitar.
 */
export function loudnessEnvelope(samples: Float32Array, sampleRate: number, tickMs = TICK_MS): number[] {
  const step = (sampleRate * tickMs) / 1000;
  const frame = (sampleRate * FRAME_MS) / 1000;
  const window = Math.min(ANALYSER.fftSize, samples.length);
  const count = Math.floor(samples.length / step);
  const out: number[] = [];
  for (let k = 0; k < count; k++) {
    let peak = 0;
    for (let end = k * step + frame; end <= (k + 1) * step + 1e-6; end += frame) {
      const to = Math.min(Math.round(end), samples.length);
      peak = Math.max(peak, rmsLevel(samples, Math.max(0, to - window), to));
    }
    out.push(peak);
  }
  return out;
}

/** A barra nova entra pela direita; a mais antiga sai pela esquerda. */
export function pushHistory(history: readonly number[], value: number): number[] {
  return [...history.slice(1), value];
}
