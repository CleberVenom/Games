import type { TurnScore } from '../game/types';

/** Imitação gravada: PCM mono em ponto flutuante (−1 a 1). Entrada do DSP do Passo 3. */
export interface Recording {
  samples: Float32Array;
  sampleRate: number;
}

export function concatChunks(chunks: readonly Float32Array[]): Float32Array {
  const out = new Float32Array(chunks.reduce((n, c) => n + c.length, 0));
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/** Segundos da gravação com som acima de −45 dBFS (em janelas de 20 ms). */
export function voicedSeconds({ samples, sampleRate }: Recording): number {
  const win = Math.max(1, Math.round(sampleRate * 0.02));
  const threshold = 10 ** (-45 / 20);
  let voiced = 0;
  for (let start = 0; start + win <= samples.length; start += win) {
    let sum = 0;
    for (let i = start; i < start + win; i++) sum += samples[i] * samples[i];
    if (Math.sqrt(sum / win) > threshold) voiced++;
  }
  return (voiced * win) / sampleRate;
}

/**
 * PROVISÓRIO — o Passo 3 troca por comparação de tom e ritmo (FFT) com a referência.
 * Já usa a gravação real para o caso óbvio: se o jogador não emitiu som (menos de 0,15 s de voz),
 * a nota é zero. Com voz, a nota ainda é sorteada.
 */
export function provisionalScore(recording: Recording | null, rng: () => number = Math.random): TurnScore {
  if (!recording || voicedSeconds(recording) < 0.15) return { total: 0, pitch: 0, rhythm: 0 };
  const pitch = 30 + Math.round(rng() * 68);
  const rhythm = 30 + Math.round(rng() * 68);
  return { pitch, rhythm, total: Math.round((pitch + rhythm) / 2) };
}
