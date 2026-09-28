import { OFFICIAL_PACKS, Pack, poolFrom } from '../packs';
import { SOUNDS } from '../sounds';

describe('packs oficiais', () => {
  it('são Animais, Vozes, Memes & zoeira e Máquinas & efeitos, com todos os 37 sons, sem repetir', () => {
    expect(OFFICIAL_PACKS.map((p) => p.title)).toEqual(['Animais', 'Vozes', 'Memes & zoeira', 'Máquinas & efeitos']);
    const ids = OFFICIAL_PACKS.flatMap((p) => p.sounds.map((s) => s.id));
    expect(ids.sort()).toEqual(SOUNDS.map((s) => s.id).sort());
    expect(OFFICIAL_PACKS.every((p) => p.sounds.length > 0 && p.source === 'official')).toBe(true);
  });
});

describe('poolFrom', () => {
  const custom: Pack = {
    id: 'pack-x',
    title: 'Meu pack',
    description: '',
    icon: 'mic',
    source: 'custom',
    sounds: [
      { id: 'sound-a', title: 'A', pack: 'pack-x', durationMs: 1000 },
      { id: 'dog-bark', title: 'Repetido', pack: 'pack-x', durationMs: 1000 },
    ],
  };

  it('junta só os sons dos packs marcados, sem duplicar', () => {
    const packs = [...OFFICIAL_PACKS, custom];
    const pool = poolFrom(packs, new Set(['animais', 'pack-x']));
    expect(pool).toContain('sound-a');
    expect(pool.filter((id) => id === 'dog-bark')).toHaveLength(1);
    expect(pool).not.toContain('siren');
    expect(pool).toHaveLength(OFFICIAL_PACKS[0].sounds.length + 1);
  });

  it('nenhum pack marcado → nenhum som', () => {
    expect(poolFrom(OFFICIAL_PACKS, new Set())).toEqual([]);
  });
});
