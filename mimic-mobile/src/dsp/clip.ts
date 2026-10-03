import { resample } from './resample';

/** Taxa dos sons de referência (a mesma dos sons oficiais gerados por scripts/build-sounds.py). */
export const CLIP_RATE = 22050;
/** Duração máxima de um som criado ou importado no app. */
export const MAX_CLIP_SECONDS = 15;
/** Duração mínima de um som (depois de cortar o silêncio): a gravação da imitação dura o mesmo que ele. */
export const MIN_CLIP_SECONDS = 2;
const HOP = 220; // ~10 ms

function envelopeDb(x: Float32Array): Float64Array {
  const n = Math.floor(x.length / HOP);
  const env = new Float64Array(n);
  for (let f = 0; f < n; f++) {
    let sum = 0;
    for (let i = f * HOP; i < (f + 1) * HOP; i++) sum += x[i] * x[i];
    env[f] = 20 * Math.log10(Math.sqrt(sum / HOP) + 1e-9);
  }
  return env;
}

/**
 * Prepara um som gravado ou importado para virar referência (mesmo tratamento dos sons oficiais):
 * mono a 22,05 kHz, recorte do trecho com som (até 30 dB abaixo do pico; se passar de 15 s, fica a
 * janela de 15 s com mais energia), volume RMS em −18 dBFS com pico ≤ −1 dBFS e fades curtos.
 * Devolve `null` se não houver som.
 */
export function prepareClip(samples: Float32Array, sampleRate: number): Float32Array | null {
  const x = resample(samples, sampleRate, CLIP_RATE);
  const env = envelopeDb(x);
  if (env.length === 0) return null;
  let peak = -Infinity;
  for (const v of env) peak = Math.max(peak, v);
  if (peak < -60) return null;

  let start = env.findIndex((v) => v > peak - 30);
  let end = env.length - [...env].reverse().findIndex((v) => v > peak - 30);
  const win = Math.round((MAX_CLIP_SECONDS * CLIP_RATE) / HOP);
  if (end - start > win) {
    let best = start;
    let bestPower = -1;
    let power = 0;
    for (let i = start; i < end; i++) {
      power += 10 ** (env[i] / 10);
      if (i - start >= win) power -= 10 ** (env[i - win] / 10);
      if (i - start >= win - 1 && power > bestPower) {
        bestPower = power;
        best = i - win + 1;
      }
    }
    start = best;
    end = best + win;
  }
  start = Math.max(start - 3, 0);
  end = Math.min(end + 8, env.length);
  const clip = x.slice(start * HOP, end * HOP);

  // Volume uniforme: RMS dos quadros fortes em −18 dBFS, pico limitado a −1 dBFS.
  let sum = 0;
  let loud = 0;
  for (let f = start; f < end; f++) {
    if (env[f] > peak - 20) {
      sum += 10 ** (env[f] / 10);
      loud++;
    }
  }
  let gain = 10 ** (-18 / 20) / Math.sqrt(sum / loud);
  let max = 0;
  for (const v of clip) max = Math.max(max, Math.abs(v));
  gain = Math.min(gain, 10 ** (-1 / 20) / max);
  const fadeIn = Math.round(0.005 * CLIP_RATE);
  const fadeOut = Math.min(Math.round(0.08 * CLIP_RATE), clip.length);
  for (let i = 0; i < clip.length; i++) {
    let g = gain;
    if (i < fadeIn) g *= i / fadeIn;
    if (i >= clip.length - fadeOut) g *= (clip.length - 1 - i) / fadeOut;
    clip[i] *= g;
  }
  return clip;
}

/** WAV PCM 16 bits mono. */
export function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);
  const text = (offset: number, s: string) => [...s].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((v, i) => view.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, v)) * 32767), true));
  return bytes;
}

/** Lê um WAV PCM 16 bits mono (o formato de `encodeWav`). */
export function decodeWav(bytes: Uint8Array): { samples: Float32Array; sampleRate: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const sampleRate = view.getUint32(24, true);
  const length = view.getUint32(40, true) / 2;
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) samples[i] = view.getInt16(44 + i * 2, true) / 32768;
  return { samples, sampleRate };
}
