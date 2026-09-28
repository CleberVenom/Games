const MIN_HZ = 80;
const MAX_HZ = 8000;

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
