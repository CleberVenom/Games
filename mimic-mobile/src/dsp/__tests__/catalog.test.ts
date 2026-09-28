/// <reference types="node" />
import fs from 'fs';
import path from 'path';

import { SOUNDS } from '../../game/sounds';
import { extractFeatures, Features } from '../features';
import { scoreImitation } from '../score';

/** Lê os WAVs gerados por scripts/build-sounds.py (PCM 16 bits mono). */
function readWav(id: string) {
  const bytes = fs.readFileSync(path.join(__dirname, '../../../assets/sounds', `${id}.wav`));
  const rate = bytes.readUInt32LE(24);
  const data = bytes.indexOf('data') + 8;
  const samples = new Float32Array((bytes.length - data) / 2);
  for (let i = 0; i < samples.length; i++) samples[i] = bytes.readInt16LE(data + 2 * i) / 32768;
  return { samples, rate };
}

describe('nota com os sons reais do catálogo', () => {
  const features = new Map<string, Features>();
  beforeAll(() => {
    for (const s of SOUNDS) {
      const { samples, rate } = readWav(s.id);
      features.set(s.id, extractFeatures(samples, rate));
    }
  });

  it('cada som imitado por ele mesmo tira nota máxima', () => {
    for (const s of SOUNDS) expect([s.id, scoreImitation(features.get(s.id)!, features.get(s.id)!).total]).toEqual([s.id, 100]);
  });

  it('um som diferente nunca empata com o original e, na média, fica bem abaixo', () => {
    let sum = 0;
    let n = 0;
    for (const ref of SOUNDS) {
      for (const other of SOUNDS) {
        if (other.id === ref.id) continue;
        const total = scoreImitation(features.get(ref.id)!, features.get(other.id)!).total;
        expect(total).toBeLessThan(90);
        sum += total;
        n++;
      }
    }
    expect(sum / n).toBeLessThan(40);
  });
});
