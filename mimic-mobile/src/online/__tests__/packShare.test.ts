import { importedPackId, missingSharedPacks, needsReshare, normalizePackCode, packCode } from '../packShare';
import { startGame, type RoomMeta, type RoomPlayer } from '../room';

const sound = (id: string) => ({ id, title: id, durationMs: 2000 });
const pack = (ids: string[], share?: { code: string; soundIds: string[] }) => ({
  id: 'pack-1',
  title: 'Memes do grupo',
  icon: 'flame',
  sounds: ids.map(sound),
  share,
});

describe('compartilhar packs', () => {
  it('código de 5 letras, sem I nem O, e a digitação é normalizada', () => {
    expect(packCode(() => 0)).toBe('AAAAA');
    expect(packCode()).toMatch(/^[A-HJ-NP-Z]{5}$/);
    expect(normalizePackCode(' kx-mp q9z ')).toBe('KXMPQ');
  });

  it('só precisa enviar de novo quando os sons mudaram desde o último compartilhamento', () => {
    expect(needsReshare(pack(['a', 'b']))).toBe(true);
    expect(needsReshare(pack(['a', 'b'], { code: 'KXMPQ', soundIds: ['a', 'b'] }))).toBe(false);
    expect(needsReshare(pack(['a', 'b', 'c'], { code: 'KXMPQ', soundIds: ['a', 'b'] }))).toBe(true);
    expect(needsReshare(pack(['b', 'a'], { code: 'KXMPQ', soundIds: ['a', 'b'] }))).toBe(false);
  });

  it('baixar não sobrescreve um pack criado no celular e baixar de novo atualiza o mesmo pack', () => {
    const fresh = () => 'pack-novo';
    expect(importedPackId('AAAAA', 'pack-1', [], fresh)).toBe('pack-1');
    expect(importedPackId('AAAAA', 'pack-1', [{ id: 'pack-1' }], fresh)).toBe('pack-novo');
    expect(importedPackId('AAAAA', 'pack-1', [{ id: 'pack-1', from: 'BBBBB' }], fresh)).toBe('pack-1');
    expect(importedPackId('AAAAA', 'pack-1', [{ id: 'pack-1' }, { id: 'pack-x', from: 'AAAAA' }], fresh)).toBe('pack-x');
  });

  it('na sala, baixa só os packs de que faltam sons no celular', () => {
    const shared = { 'pack-1': 'AAAAA', 'pack-2': 'BBBBB' };
    const lists = { AAAAA: ['a', 'b'], BBBBB: ['c'] };
    expect(missingSharedPacks(shared, lists, new Set(['a', 'b']))).toEqual(['BBBBB']);
    expect(missingSharedPacks(shared, lists, new Set(['a', 'b', 'c']))).toEqual([]);
    expect(missingSharedPacks(undefined, lists, new Set())).toEqual([]);
  });

  it('a partida guarda os códigos dos packs do anfitrião para os outros baixarem', () => {
    const meta: RoomMeta = { host: 'h', status: 'lobby', createdAt: 0, totalRounds: 0, pool: [], deck: [] };
    const players: Record<string, RoomPlayer> = {
      h: { name: 'Ana', avatar: 'fantasma', color: 'violet', joinedAt: 1, online: true, score: 0 },
      g: { name: 'Bia', avatar: 'tubarao', color: 'cyan', joinedAt: 2, online: true, score: 0 },
    };
    const started = startGame(meta, players, ['a', 'dog-bark'], 0, () => 0, { 'pack-1': 'AAAAA' });
    expect(started.meta.shared).toEqual({ 'pack-1': 'AAAAA' });
    expect(startGame(meta, players, ['dog-bark'], 0, () => 0).meta.shared).toBeUndefined();
  });
});
