import type { TurnScore } from '../game/types';
import type { Features } from './features';

/** Parâmetros de calibração da nota (ajuste aqui depois de testar com jogadores de verdade). */
export const TUNING = {
  /** Abaixo disso (dBFS) o quadro da imitação é silêncio; com menos de `minVoiceSeconds` de som, nota 0. */
  silenceDb: -50,
  minVoiceSeconds: 0.15,
  /** Diferença média de contorno (semitons) que derruba a nota de tom para ~37%. */
  pitchTolerance: 2.5,
  brightnessTolerance: 4,
  /** Pontos do envelope normalizado e folga de alinhamento do DTW (fração da duração). */
  envelopePoints: 64,
  dtwBand: 0.12,
  /** Distância média de envelope (0–1) em que a forma do ritmo vale zero. */
  envelopeTolerance: 0.3,
  /** Pesos do total. */
  pitchWeight: 0.5,
};

const ZERO: TurnScore = { total: 0, pitch: 0, rhythm: 0 };
const CONTOUR_BINS = 24;

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);
const semitones = (hz: number) => 12 * Math.log2(hz / 55);

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

interface Region {
  start: number;
  end: number;
  threshold: number;
  peak: number;
}

/** Trecho com som (do primeiro ao último quadro acima do limiar), ignorando o silêncio antes e depois. */
function activeRegion(db: Float32Array): Region | null {
  if (db.length === 0) return null;
  const sorted = Array.from(db).sort((a, b) => a - b);
  const peak = sorted[sorted.length - 1];
  const floor = sorted[Math.floor(sorted.length * 0.1)];
  const threshold = Math.min(Math.max(peak - 30, floor + 8), peak - 6);
  let start = -1;
  let end = -1;
  for (let i = 0; i < db.length; i++) {
    if (db[i] > threshold) {
      if (start < 0) start = i;
      end = i + 1;
    }
  }
  return start < 0 ? null : { start, end, threshold, peak };
}

/** Envelope de amplitude do trecho ativo, de 0 (limiar) a 1 (pico). */
function envelope(db: Float32Array, r: Region): number[] {
  const out: number[] = [];
  for (let i = r.start; i < r.end; i++) out.push(clamp01((db[i] - r.threshold) / (r.peak - r.threshold)));
  return out;
}

function stretch(values: number[], length: number): number[] {
  if (values.length === 1) return new Array(length).fill(values[0]);
  return Array.from({ length }, (_, i) => {
    const p = (i * (values.length - 1)) / (length - 1);
    const j = Math.floor(p);
    const f = p - j;
    return values[j] * (1 - f) + (values[Math.min(j + 1, values.length - 1)] ?? 0) * f;
  });
}

/** Distância DTW média entre dois envelopes do mesmo tamanho, com alinhamento limitado a uma faixa. */
function dtw(a: number[], b: number[], band: number): number {
  const n = a.length;
  const w = Math.max(1, Math.round(n * band));
  const cost = new Float64Array((n + 1) * (n + 1)).fill(Infinity);
  const at = (i: number, j: number) => i * (n + 1) + j;
  cost[0] = 0;
  for (let i = 1; i <= n; i++) {
    for (let j = Math.max(1, i - w); j <= Math.min(n, i + w); j++) {
      const d = Math.abs(a[i - 1] - b[j - 1]);
      cost[at(i, j)] = d + Math.min(cost[at(i - 1, j)], cost[at(i, j - 1)], cost[at(i - 1, j - 1)]);
    }
  }
  return cost[at(n, n)] / n;
}

/** Quantos "golpes" (sílabas, latidos, bipes) o envelope tem, com histerese. */
function bursts(env: number[]): number {
  let count = 0;
  let on = false;
  for (const v of env) {
    if (!on && v > 0.55) {
      count++;
      on = true;
    } else if (on && v < 0.3) {
      on = false;
    }
  }
  return count;
}

function rhythmScore(ref: Features, refR: Region, imit: Features, imitR: Region): number {
  const refEnv = envelope(ref.db, refR);
  const imitEnv = envelope(imit.db, imitR);
  const L = TUNING.envelopePoints;
  const shape = clamp01(1 - dtw(stretch(refEnv, L), stretch(imitEnv, L), TUNING.dtwBand) / TUNING.envelopeTolerance);

  const [a, b] = [Math.min(bursts(refEnv), 8), Math.min(bursts(imitEnv), 8)];
  const count = a <= 1 && b <= 1 ? 1 : 1 - Math.abs(a - b) / Math.max(a, b);

  const refSeconds = (refR.end - refR.start) * ref.hop;
  const imitSeconds = (imitR.end - imitR.start) * imit.hop;
  const duration = clamp01(1 - Math.abs(Math.log2(imitSeconds / refSeconds)) / 1.3);

  return 0.5 * shape + 0.25 * count + 0.25 * duration;
}

/** Mediana de cada fatia de tempo (em semitons) — `null` onde não há valor válido. */
function contour(values: Float32Array, db: Float32Array, r: Region): (number | null)[] {
  const len = r.end - r.start;
  return Array.from({ length: CONTOUR_BINS }, (_, b) => {
    const from = r.start + Math.floor((b * len) / CONTOUR_BINS);
    const to = Math.max(from + 1, r.start + Math.floor(((b + 1) * len) / CONTOUR_BINS));
    const valid: number[] = [];
    for (let i = from; i < to; i++) if (values[i] > 0 && db[i] > r.threshold) valid.push(semitones(values[i]));
    return valid.length ? median(valid) : null;
  });
}

/**
 * Compara dois contornos sem exigir o mesmo tom: o deslocamento médio (tom da voz de cada um) é
 * descontado e mede-se só a forma. Com `fold`, erros de oitava (±12) não contam.
 */
function compareContours(ref: (number | null)[], imit: (number | null)[], fold: boolean) {
  const diffs: number[] = [];
  let refCount = 0;
  ref.forEach((r, i) => {
    if (r === null) return;
    refCount++;
    const m = imit[i];
    if (m !== null) diffs.push(r - m);
  });
  if (diffs.length < 3) return null;
  const offset = median(diffs);
  const residuals = diffs.map((d) => {
    const r = d - offset;
    return fold ? r - 12 * Math.round(r / 12) : r;
  });
  const residual = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / residuals.length);
  return { residual, offset, overlap: diffs.length / refCount };
}

function voicedRatio(f: Features, r: Region): number {
  let voiced = 0;
  let active = 0;
  for (let i = r.start; i < r.end; i++) {
    if (f.db[i] > r.threshold) {
      active++;
      if (f.f0[i] > 0) voiced++;
    }
  }
  return active ? voiced / active : 0;
}

function pitchScore(ref: Features, refR: Region, imit: Features, imitR: Region): number {
  const tonal = compareContours(contour(ref.f0, ref.db, refR), contour(imit.f0, imit.db, imitR), true);
  const tonalScore = tonal ? Math.exp(-((tonal.residual / TUNING.pitchTolerance) ** 2)) * (0.4 + 0.6 * tonal.overlap) : 0;

  const bright = compareContours(contour(ref.centroid, ref.db, refR), contour(imit.centroid, imit.db, imitR), false);
  const brightScore = bright
    ? (0.6 * Math.exp(-((bright.residual / TUNING.brightnessTolerance) ** 2)) +
        0.4 * Math.exp(-((Math.max(0, Math.abs(bright.offset) - 5) / 10) ** 2))) *
      (0.5 + 0.5 * bright.overlap)
    : 0;

  // Sons com tom (sirene, galo, trombone) contam pelo contorno melódico; ruídos (espirro, descarga)
  // pelo contorno de brilho. A mistura segue a fração de quadros com tom da referência.
  const refVoiced = voicedRatio(ref, refR);
  const tonalWeight = clamp01((refVoiced - 0.15) / 0.45);
  const agreement = 1 - Math.abs(refVoiced - voicedRatio(imit, imitR));
  return (tonalWeight * tonalScore + (1 - tonalWeight) * brightScore) * (0.7 + 0.3 * agreement);
}

/** Segundos da imitação com som acima do limiar de silêncio. */
export function soundingSeconds(f: Features): number {
  let frames = 0;
  for (const v of f.db) if (v > TUNING.silenceDb) frames++;
  return frames * f.hop;
}

/**
 * Nota da imitação: tom (contorno melódico ou de brilho, em qualquer tom de voz) e ritmo (forma do
 * envelope alinhada por DTW, número de golpes e duração), de 0 a 100.
 */
export function scoreImitation(reference: Features, imitation: Features): TurnScore {
  if (soundingSeconds(imitation) < TUNING.minVoiceSeconds) return ZERO;
  const refR = activeRegion(reference.db);
  const imitR = activeRegion(imitation.db);
  if (!refR || !imitR) return ZERO;
  const pitch = Math.round(100 * pitchScore(reference, refR, imitation, imitR));
  const rhythm = Math.round(100 * rhythmScore(reference, refR, imitation, imitR));
  return { pitch, rhythm, total: Math.round(TUNING.pitchWeight * pitch + (1 - TUNING.pitchWeight) * rhythm) };
}
