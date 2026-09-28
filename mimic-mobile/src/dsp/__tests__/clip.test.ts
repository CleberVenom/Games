import { CLIP_RATE, decodeWav, encodeWav, MAX_CLIP_SECONDS, prepareClip } from '../clip';

const SR = 48000;
const tone = (seconds: number, amp: number) =>
  Float32Array.from({ length: Math.round(seconds * SR) }, (_, i) => amp * Math.sin((2 * Math.PI * 330 * i) / SR));
const silence = (seconds: number) => new Float32Array(Math.round(seconds * SR));
const concat = (...parts: Float32Array[]) => {
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};
const rmsDb = (x: Float32Array) => 20 * Math.log10(Math.sqrt(x.reduce((s, v) => s + v * v, 0) / x.length));

describe('prepareClip', () => {
  it('corta o silêncio antes e depois, converte para 22,05 kHz e normaliza o volume', () => {
    const clip = prepareClip(concat(silence(1), tone(1.2, 0.02), silence(1.5)), SR)!;
    expect(clip.length / CLIP_RATE).toBeGreaterThan(1.2);
    expect(clip.length / CLIP_RATE).toBeLessThan(1.35);
    expect(rmsDb(clip.subarray(CLIP_RATE * 0.2, CLIP_RATE * 1))).toBeCloseTo(-18, 0);
    expect(Math.max(...clip.map(Math.abs))).toBeLessThanOrEqual(10 ** (-1 / 20) + 1e-6);
  });

  it(`limita a ${MAX_CLIP_SECONDS} s ficando com o trecho mais forte`, () => {
    const clip = prepareClip(concat(tone(4, 0.05), tone(3, 0.4), tone(4, 0.05)), SR)!;
    expect(clip.length / CLIP_RATE).toBeLessThanOrEqual(MAX_CLIP_SECONDS + 0.12);
  });

  it('sem som, devolve null', () => {
    expect(prepareClip(silence(2), SR)).toBeNull();
    expect(prepareClip(new Float32Array(0), SR)).toBeNull();
  });
});

describe('WAV', () => {
  it('codifica e decodifica PCM 16 bits mono', () => {
    const x = Float32Array.from([0, 0.5, -0.5, 0.25, -1, 1]);
    const bytes = encodeWav(x, CLIP_RATE);
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe('RIFF');
    const back = decodeWav(bytes);
    expect(back.sampleRate).toBe(CLIP_RATE);
    back.samples.forEach((v, i) => expect(v).toBeCloseTo(x[i], 3));
  });
});
