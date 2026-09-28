import { extractFeatures, Features } from '../features';
import { fft } from '../fft';
import { resample } from '../resample';
import { scoreImitation, soundingSeconds } from '../score';

const SR = 22050;

/** Semente fixa: os testes são determinísticos. */
function noiseGen(seed = 1) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed / 2147483647) * 2 - 1;
  };
}

/** Tom harmônico com frequência variável `f(t)` e envelope `env(t)`. */
function tone(seconds: number, f: (t: number) => number, env: (t: number) => number = () => 1, harmonics = 8) {
  const out = new Float32Array(Math.round(seconds * SR));
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    phase += (2 * Math.PI * f(t)) / SR;
    let v = 0;
    for (let k = 1; k <= harmonics; k++) v += Math.sin(k * phase) / k;
    out[i] = 0.3 * v * env(t);
  }
  return out;
}

function noise(seconds: number, env: (t: number) => number = () => 1, seed = 1, smoothing = 0) {
  const rnd = noiseGen(seed);
  const out = new Float32Array(Math.round(seconds * SR));
  let prev = 0;
  for (let i = 0; i < out.length; i++) {
    prev = smoothing * prev + (1 - smoothing) * rnd();
    out[i] = 0.3 * prev * env(i / SR);
  }
  return out;
}

function concat(...parts: Float32Array[]) {
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

const silence = (seconds: number) => new Float32Array(Math.round(seconds * SR));
const plus = (a: Float32Array, b: Float32Array) => a.map((v, i) => v + (b[i] ?? 0));
const features = (x: Float32Array): Features => extractFeatures(x, SR);
const fade = (seconds: number) => (t: number) => Math.min(1, t / 0.03, (seconds - t) / 0.05);

/** Sirene: sobe e desce entre `lo` e `hi` Hz. */
const siren = (seconds: number, lo: number, hi: number, harmonics = 8) =>
  tone(seconds, (t) => lo + (hi - lo) * (0.5 - 0.5 * Math.cos((2 * Math.PI * t) / seconds)), fade(seconds), harmonics);

/** `n` golpes de `len` segundos separados por `gap`. */
function pulses(n: number, len: number, gap: number, make: (s: number) => Float32Array) {
  const parts: Float32Array[] = [];
  for (let i = 0; i < n; i++) parts.push(make(len), silence(gap));
  return concat(...parts);
}

describe('fft', () => {
  it('acha a frequência de um seno e volta ao sinal original', () => {
    const n = 1024;
    const re = Float64Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * 64 * i) / n));
    const original = Float64Array.from(re);
    const im = new Float64Array(n);
    fft(re, im);
    const mags = Array.from(re, (r, k) => Math.hypot(r, im[k]));
    expect(mags.indexOf(Math.max(...mags.slice(0, n / 2)))).toBe(64);
    fft(re, im, true);
    re.forEach((v, i) => expect(v).toBeCloseTo(original[i], 9));
  });
});

describe('resample', () => {
  it('muda a taxa preservando a frequência', () => {
    const x = Float32Array.from({ length: 48000 }, (_, i) => Math.sin((2 * Math.PI * 440 * i) / 48000));
    const y = resample(x, 48000, 16000);
    expect(y.length).toBe(16000);
    let crossings = 0;
    for (let i = 1; i < y.length; i++) if (y[i - 1] < 0 !== y[i] < 0) crossings++;
    expect(crossings).toBeGreaterThan(875);
    expect(crossings).toBeLessThan(885);
  });
});

describe('extractFeatures', () => {
  const medianF0 = (f: Features) => {
    const v = Array.from(f.f0).filter((x) => x > 0).sort((a, b) => a - b);
    return v[v.length >> 1];
  };

  it.each([110, 220, 600])('acompanha o pitch de um tom harmônico de %i Hz (±2%%)', (hz) => {
    const f = features(tone(1, () => hz));
    expect(Math.abs(medianF0(f) / hz - 1)).toBeLessThan(0.02);
  });

  it('segue um pitch que sobe', () => {
    const f = features(tone(1, (t) => 200 + 200 * t));
    const voiced = Array.from(f.f0).filter((x) => x > 0);
    expect(voiced[0]).toBeLessThan(230);
    expect(voiced[voiced.length - 1]).toBeGreaterThan(360);
  });

  it('ruído não tem tom definido', () => {
    const f = features(noise(1));
    expect(Array.from(f.f0).filter((x) => x > 0).length / f.f0.length).toBeLessThan(0.1);
  });

  it('ruído abafado é menos brilhante que ruído branco', () => {
    const mean = (a: Float32Array) => a.reduce((s, v) => s + v, 0) / a.length;
    expect(mean(features(noise(1, undefined, 3, 0.9)).centroid)).toBeLessThan(mean(features(noise(1)).centroid) / 2);
  });
});

describe('scoreImitation', () => {
  const ref = features(siren(2, 400, 800));

  it('a própria referência tira nota máxima', () => {
    expect(scoreImitation(ref, ref).total).toBeGreaterThanOrEqual(97);
  });

  it('silêncio ou som baixo demais vale 0', () => {
    expect(scoreImitation(ref, features(silence(3)))).toEqual({ total: 0, pitch: 0, rhythm: 0 });
    const faint = features(siren(2, 400, 800).map((v) => v * 0.005));
    expect(soundingSeconds(faint)).toBeLessThan(0.15);
    expect(scoreImitation(ref, faint).total).toBe(0);
  });

  it('boa imitação: uma oitava abaixo, outro timbre, 15% mais lenta, atrasada e com ruído do microfone', () => {
    const voice = concat(silence(0.4), siren(2.3, 200, 400, 4), silence(0.6));
    const imitation = features(plus(voice, noise(3.3, () => 0.01, 9)));
    const score = scoreImitation(ref, imitation);
    expect(score.pitch).toBeGreaterThanOrEqual(75);
    expect(score.rhythm).toBeGreaterThanOrEqual(70);
    expect(score.total).toBeGreaterThanOrEqual(75);
  });

  it('imitar a sirene num tom só perde muitos pontos de tom', () => {
    const good = scoreImitation(ref, features(siren(2, 200, 400, 4)));
    const flat = scoreImitation(ref, features(tone(2, () => 300, fade(2), 4)));
    expect(flat.pitch).toBeLessThanOrEqual(45);
    expect(good.pitch - flat.pitch).toBeGreaterThanOrEqual(35);
  });

  it('ritmo: três latidos imitados com três "au" valem mais que um som contínuo', () => {
    const bark = features(pulses(3, 0.15, 0.15, (s) => noise(s, fade(s), 5, 0.5)));
    const au = features(pulses(3, 0.18, 0.14, (s) => tone(s, () => 250, fade(s), 6)));
    const long = features(tone(0.9, () => 250, fade(0.9), 6));
    const good = scoreImitation(bark, au);
    const bad = scoreImitation(bark, long);
    expect(good.rhythm).toBeGreaterThanOrEqual(70);
    expect(bad.rhythm).toBeLessThanOrEqual(50);
  });

  it('som sem tom (ruído que fica mais brilhante) compara pelo brilho', () => {
    const rising = (seed: number) =>
      concat(noise(0.6, fade(0.6), seed, 0.85), noise(0.6, fade(0.6), seed + 1, 0.3), noise(0.6, fade(0.6), seed + 2, 0));
    const falling = (seed: number) =>
      concat(noise(0.6, fade(0.6), seed, 0), noise(0.6, fade(0.6), seed + 1, 0.3), noise(0.6, fade(0.6), seed + 2, 0.85));
    const refNoise = features(rising(11));
    const same = scoreImitation(refNoise, features(rising(21)));
    const opposite = scoreImitation(refNoise, features(falling(31)));
    expect(same.pitch).toBeGreaterThanOrEqual(80);
    expect(same.pitch - opposite.pitch).toBeGreaterThanOrEqual(25);
  });
});
