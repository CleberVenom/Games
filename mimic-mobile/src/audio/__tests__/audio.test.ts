import manifest from '../../../assets/sounds/manifest.json';
import { SOUNDS } from '../../game/sounds';
import { concatChunks, provisionalScore, Recording, voicedSeconds } from '../recording';
import { SOUND_FILES } from '../soundFiles';
import { spectrumToBars } from '../spectrum';

const SR = 22050;

function tone(seconds: number, amplitude: number, freq = 220): Float32Array {
  return Float32Array.from({ length: Math.round(seconds * SR) }, (_, i) => amplitude * Math.sin((2 * Math.PI * freq * i) / SR));
}

const rec = (samples: Float32Array): Recording => ({ samples, sampleRate: SR });

describe('catálogo de sons', () => {
  it('cada som tem arquivo gerado, duração e nenhum arquivo sobra', () => {
    const ids = SOUNDS.map((s) => s.id).sort();
    expect(Object.keys(SOUND_FILES).sort()).toEqual(ids);
    expect(Object.keys(manifest).sort()).toEqual(ids);
  });

  it('usa ids únicos e durações curtas o bastante para imitar', () => {
    expect(new Set(SOUNDS.map((s) => s.id)).size).toBe(SOUNDS.length);
    for (const s of SOUNDS) {
      expect(s.durationMs).toBeGreaterThan(200);
      expect(s.durationMs).toBeLessThanOrEqual(3200);
    }
  });
});

describe('spectrumToBars', () => {
  const bins = new Uint8Array(512);

  it('é simétrico, com os graves no centro e valores entre 0 e 1', () => {
    bins.fill(0);
    bins[5] = 255; // ~215 Hz a 44,1 kHz
    const bars = spectrumToBars(bins, 32, 44100);
    expect(bars).toHaveLength(32);
    expect(bars).toEqual([...bars].reverse());
    expect(Math.max(...bars)).toBe(1);
    expect(bars.every((v) => v >= 0 && v <= 1)).toBe(true);
    const loudest = bars.indexOf(1);
    expect(Math.abs(loudest - 15.5)).toBeLessThan(8);
    expect(bars[0]).toBe(0);
  });

  it('agudos acendem as pontas', () => {
    bins.fill(0);
    bins[170] = 200; // ~7,3 kHz
    const bars = spectrumToBars(bins, 32, 44100);
    expect(bars[0]).toBeCloseTo(200 / 255);
    expect(bars[15]).toBe(0);
  });
});

describe('gravação', () => {
  it('concatena os blocos na ordem', () => {
    const out = concatChunks([Float32Array.of(1, 2), Float32Array.of(3)]);
    expect(Array.from(out)).toEqual([1, 2, 3]);
  });

  it('mede só o trecho com som', () => {
    const samples = concatChunks([tone(0.5, 0), tone(1, 0.3), tone(0.5, 0.0001)]);
    expect(voicedSeconds(rec(samples))).toBeCloseTo(1, 1);
  });

  it('nota provisória: silêncio (ou nada gravado) vale 0; com voz fica entre 30 e 98', () => {
    expect(provisionalScore(null)).toEqual({ total: 0, pitch: 0, rhythm: 0 });
    expect(provisionalScore(rec(tone(2, 0.002)))).toEqual({ total: 0, pitch: 0, rhythm: 0 });
    const score = provisionalScore(rec(tone(1, 0.3)), () => 0.5);
    expect(score).toEqual({ pitch: 64, rhythm: 64, total: 64 });
  });
});
