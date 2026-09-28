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
