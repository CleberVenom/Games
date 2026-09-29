import { resample } from '../dsp/resample';

/** Imitação gravada: PCM mono em ponto flutuante (−1 a 1). Entrada do DSP (src/dsp). */
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

/**
 * Converte PCM para a taxa do contexto de áudio antes de tocar. No celular o react-native-audio-api lê o
 * buffer uma amostra por quadro de saída, ignorando a taxa do próprio buffer: uma imitação de 16 kHz num
 * celular a 48 kHz tocava 3× mais rápida.
 */
export function atContextRate(samples: Float32Array, sampleRate: number, contextRate: number): Float32Array<ArrayBuffer> {
  return Float32Array.from(resample(samples, sampleRate, contextRate));
}
