import { loudnessEnvelope, pushHistory, rmsLevel, TICK_MS } from '../loudness';

const tone = (amp: number, rate: number, seconds: number) =>
  Float32Array.from({ length: Math.round(rate * seconds) }, (_, i) => amp * Math.sin((2 * Math.PI * 220 * i) / rate));

describe('gráfico rolando', () => {
  it('volume de 0 (silêncio) a 1 (bem alto), em dBFS', () => {
    expect(rmsLevel(new Float32Array(1024))).toBe(0);
    // seno de amplitude 0,25 → RMS −15 dBFS → (−15 + 55) / 43 ≈ 0,93
    expect(rmsLevel(tone(0.25, 48000, 0.05))).toBeCloseTo(0.93, 1);
    expect(rmsLevel(tone(1, 48000, 0.05))).toBe(1);
    expect(rmsLevel(tone(0.001, 48000, 0.05))).toBe(0);
  });

  it('a silhueta do original tem um valor por barra, no mesmo ritmo das barras ao vivo', () => {
    const rate = 48000;
    const sound = new Float32Array(rate * 2);
    sound.set(tone(0.25, rate, 1), rate); // 1 s de silêncio, depois 1 s de som
    const env = loudnessEnvelope(sound, rate);
    expect(env).toHaveLength(Math.floor(2000 / TICK_MS));
    const edge = Math.round(1000 / TICK_MS);
    expect(Math.max(...env.slice(0, edge - 1))).toBe(0);
    expect(Math.min(...env.slice(edge + 1))).toBeGreaterThan(0.85);
  });

  it('cada barra nova entra pela direita e a mais antiga sai pela esquerda', () => {
    expect(pushHistory([1, 2, 3], 4)).toEqual([2, 3, 4]);
    let h = [0, 0, 0, 0];
    for (const v of [0.1, 0.5, 0.9]) h = pushHistory(h, v);
    expect(h).toEqual([0, 0.1, 0.5, 0.9]);
  });
});
