import { fft } from './fft';
import { resample } from './resample';

export const ANALYSIS_RATE = 16000;
const FRAME = 1024; // 64 ms
const HOP = 256; // 16 ms
const FFT_SIZE = 2048; // o dobro do quadro: a autocorrelação sai linear, sem dar a volta
const MIN_F0 = 65;
const MAX_F0 = 1000;
/** Clareza mínima da periodicidade (0–1) para considerar que o quadro tem tom definido. */
const VOICING = 0.6;

export interface Features {
  /** Segundos entre quadros consecutivos. */
  hop: number;
  /** Energia de cada quadro, em dBFS (curva de amplitude). */
  db: Float32Array;
  /** Frequência fundamental em Hz; 0 quando o quadro não tem tom definido (ruído, silêncio). */
  f0: Float32Array;
  /** Centro de massa do espectro em Hz: o "brilho" do som, que serve de tom para ruídos. */
  centroid: Float32Array;
}

/**
 * Pitch pelo método de McLeod: função de diferença quadrada normalizada (NSDF) a partir da
 * autocorrelação `r` (calculada via FFT). Devolve 0 se o quadro não for periódico o bastante.
 */
function pitch(r: Float64Array, prefix: Float64Array): number {
  const tauMin = Math.floor(ANALYSIS_RATE / MAX_F0);
  const tauMax = Math.ceil(ANALYSIS_RATE / MIN_F0);
  const nsdf = new Float64Array(tauMax + 2);
  for (let tau = 0; tau < nsdf.length; tau++) {
    const m = prefix[FRAME - tau] + (prefix[FRAME] - prefix[tau]);
    nsdf[tau] = m > 0 ? (2 * r[tau]) / m : 0;
  }
  // Pula o lóbulo do atraso zero e guarda o pico de cada lóbulo positivo seguinte.
  let tau = 1;
  while (tau <= tauMax && nsdf[tau] > 0) tau++;
  const peaks: number[] = [];
  for (; tau <= tauMax; tau++) {
    if (tau >= tauMin && nsdf[tau] > 0 && nsdf[tau] >= nsdf[tau - 1] && nsdf[tau] > nsdf[tau + 1]) peaks.push(tau);
  }
  if (peaks.length === 0) return 0;
  const best = Math.max(...peaks.map((p) => nsdf[p]));
  if (best < VOICING) return 0;
  // Primeiro pico perto do máximo (evita erros de oitava para baixo), com interpolação parabólica.
  const p = peaks.find((t) => nsdf[t] >= 0.9 * best)!;
  const [a, b, c] = [nsdf[p - 1], nsdf[p], nsdf[p + 1]];
  const denom = a - 2 * b + c;
  const shift = denom !== 0 ? (0.5 * (a - c)) / denom : 0;
  return ANALYSIS_RATE / (p + shift);
}

/** Extrai energia, pitch e brilho de um áudio mono, em quadros de 64 ms a cada 16 ms. */
export function extractFeatures(samples: Float32Array, sampleRate: number): Features {
  const x = resample(samples, sampleRate, ANALYSIS_RATE);
  const count = Math.max(0, Math.floor((x.length - FRAME) / HOP) + 1);
  const db = new Float32Array(count);
  const f0 = new Float32Array(count);
  const centroid = new Float32Array(count);
  const re = new Float64Array(FFT_SIZE);
  const im = new Float64Array(FFT_SIZE);
  const prefix = new Float64Array(FRAME + 1);

  for (let f = 0; f < count; f++) {
    const start = f * HOP;
    let mean = 0;
    for (let i = 0; i < FRAME; i++) mean += x[start + i];
    mean /= FRAME;
    re.fill(0);
    im.fill(0);
    for (let i = 0; i < FRAME; i++) {
      const v = x[start + i] - mean;
      re[i] = v;
      prefix[i + 1] = prefix[i] + v * v;
    }
    db[f] = 10 * Math.log10(prefix[FRAME] / FRAME + 1e-12);

    fft(re, im);
    let weighted = 0;
    let total = 0;
    for (let k = 0; k < FFT_SIZE; k++) {
      const power = re[k] * re[k] + im[k] * im[k];
      if (k > 0 && k <= FFT_SIZE / 2) {
        weighted += ((k * ANALYSIS_RATE) / FFT_SIZE) * power;
        total += power;
      }
      re[k] = power;
      im[k] = 0;
    }
    centroid[f] = total > 0 ? weighted / total : 0;

    fft(re, im, true); // espectro de potência → autocorrelação
    f0[f] = pitch(re, prefix);
  }
  return { hop: HOP / ANALYSIS_RATE, db, f0, centroid };
}
