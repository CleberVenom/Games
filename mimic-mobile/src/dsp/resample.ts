const TAPS = 31;

/** Passa-baixas FIR (sinc janelado, Hamming) com corte em `cutoff` ciclos por amostra. */
function lowpass(x: Float32Array, cutoff: number): Float32Array {
  const half = (TAPS - 1) / 2;
  const h = new Float64Array(TAPS);
  let sum = 0;
  for (let i = 0; i < TAPS; i++) {
    const m = i - half;
    const sinc = m === 0 ? 2 * cutoff : Math.sin(2 * Math.PI * cutoff * m) / (Math.PI * m);
    h[i] = sinc * (0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (TAPS - 1)));
    sum += h[i];
  }
  const out = new Float32Array(x.length);
  for (let n = 0; n < x.length; n++) {
    let acc = 0;
    for (let i = 0; i < TAPS; i++) {
      const j = n + i - half;
      if (j >= 0 && j < x.length) acc += x[j] * h[i];
    }
    out[n] = acc / sum;
  }
  return out;
}

/** Converte a taxa de amostragem (com filtro anti-aliasing ao reduzir). */
export function resample(x: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return x;
  const src = to < from ? lowpass(x, (0.45 * to) / from) : x;
  const out = new Float32Array(Math.floor((src.length * to) / from));
  const step = from / to;
  for (let i = 0; i < out.length; i++) {
    const p = i * step;
    const j = Math.floor(p);
    const f = p - j;
    out[i] = src[j] * (1 - f) + (j + 1 < src.length ? src[j + 1] : src[j]) * f;
  }
  return out;
}
