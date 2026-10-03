import manifest from '../../../assets/sounds/manifest.json';
import { SOUNDS } from '../../game/sounds';
import { atContextRate, concatChunks } from '../recording';
import { SOUND_FILES } from '../soundFiles';

describe('catálogo de sons', () => {
  it('cada som tem arquivo gerado, duração e nenhum arquivo sobra', () => {
    const ids = SOUNDS.map((s) => s.id).sort();
    expect(Object.keys(SOUND_FILES).sort()).toEqual(ids);
    expect(Object.keys(manifest).sort()).toEqual(ids);
  });

  it('usa ids únicos e sons de 2 a 15 s (a gravação dura o mesmo que o som)', () => {
    expect(new Set(SOUNDS.map((s) => s.id)).size).toBe(SOUNDS.length);
    for (const s of SOUNDS) {
      expect([s.id, s.durationMs >= 2000 && s.durationMs <= 15000]).toEqual([s.id, true]);
    }
  });
});

describe('gravação', () => {
  it('concatena os blocos na ordem', () => {
    const out = concatChunks([Float32Array.of(1, 2), Float32Array.of(3)]);
    expect(Array.from(out)).toEqual([1, 2, 3]);
  });
});

describe('tocar PCM no celular', () => {
  /**
   * No celular, o react-native-audio-api lê o buffer uma amostra por quadro de saída, na taxa do contexto,
   * ignorando a taxa do próprio buffer. Simula isso: quanto tempo o som dura e qual frequência se ouve.
   */
  function nativePlayback(samples: Float32Array, contextRate: number) {
    let crossings = 0;
    for (let i = 1; i < samples.length; i++) if (samples[i - 1] < 0 !== samples[i] < 0) crossings++;
    const seconds = samples.length / contextRate;
    return { seconds, hz: crossings / 2 / seconds };
  }
  const tone = (hz: number, rate: number, seconds: number) =>
    Float32Array.from({ length: rate * seconds }, (_, i) => Math.sin((2 * Math.PI * hz * i) / rate + 0.1));

  it('a imitação de 16 kHz num celular a 48 kHz toca na velocidade certa (antes: 3× mais rápida)', () => {
    const clip = tone(440, 16000, 1);
    expect(nativePlayback(clip, 48000).seconds).toBeCloseTo(1 / 3, 2); // o erro: 1 s tocado em 0,33 s
    const played = nativePlayback(atContextRate(clip, 16000, 48000), 48000);
    expect(played.seconds).toBeCloseTo(1, 2);
    expect(played.hz).toBeGreaterThan(430);
    expect(played.hz).toBeLessThan(450);
  });

  it('funciona também a 44,1 kHz e não mexe quando a taxa já é a do contexto', () => {
    const clip = tone(300, 16000, 2);
    const played = nativePlayback(atContextRate(clip, 16000, 44100), 44100);
    expect(played.seconds).toBeCloseTo(2, 2);
    expect(Math.abs(played.hz - 300)).toBeLessThan(8);
    const same = tone(300, 48000, 1);
    expect(Array.from(atContextRate(same, 48000, 48000))).toEqual(Array.from(same));
  });
});
