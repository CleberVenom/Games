/// <reference types="node" />
import { decodeClip, encodeClip, fromBase64, toBase64 } from '../clipCodec';
import {
  addRoundPoints,
  canJoin,
  countReactions,
  isLastRound,
  nextPresenter,
  nextRound,
  normalizeCode,
  pendingPlayers,
  readyToPresent,
  roomCode,
  RoomMeta,
  RoomPlayer,
  RoomScore,
  spinWheel,
  startGame,
  submitDeadlineMs,
  toPresenting,
  withAvatars,
} from '../room';
import { reduceSolo, soloTurn } from '../turn';

const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

const player = (name: string, joinedAt: number, extra: Partial<RoomPlayer> = {}): RoomPlayer => ({
  name,
  avatar: 'polvo',
  color: 'coral',
  joinedAt,
  online: true,
  score: 0,
  ...extra,
});

const lobby: RoomMeta = { host: 'a', status: 'lobby', createdAt: 0, totalRounds: 0, pool: [], deck: [] };
const PLAYERS = { b: player('Bia', 2), a: player('Ana', 1), c: player('Caio', 3) };
const score = (total: number, points = total): RoomScore => ({
  total,
  pitch: total,
  rhythm: total,
  points,
  clipMs: 2000,
});

describe('sala online', () => {
  it('código de 4 letras sem I/O, e a digitação é normalizada', () => {
    const code = roomCode(seq(0, 0.5, 0.99, 0.2));
    expect(code).toMatch(/^[A-HJ-NP-Z]{4}$/);
    expect(normalizeCode(' ab-c d9e ')).toBe('ABCD');
  });

  it('só entra no lobby, até 10 jogadores; quem já está pode voltar', () => {
    expect(canJoin(null, {}, 'x')).toBe('missing');
    expect(canJoin(lobby, PLAYERS, 'x')).toBe('ok');
    expect(canJoin({ ...lobby, status: 'playing' }, PLAYERS, 'x')).toBe('started');
    expect(canJoin({ ...lobby, status: 'playing' }, PLAYERS, 'a')).toBe('ok');
    const room = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`p${i}`, player(`P${i}`, i)]));
    expect(canJoin(lobby, room(9), 'x')).toBe('ok');
    expect(canJoin(lobby, room(10), 'x')).toBe('full');
  });

  it('salas de versões antigas (só com cor) mostram o mascote da cor', () => {
    const raw = {
      a: { name: 'Ana', color: 'violet' as const, joinedAt: 1, online: true, score: 0 },
      b: { name: 'Bia', color: 'cyan' as const, avatar: 'coruja', joinedAt: 2, online: true, score: 0 },
    };
    const players = withAvatars(raw);
    expect(players.a.avatar).toBe('fantasma');
    expect(players.b.avatar).toBe('coruja');
  });

  it('começar usa as rodadas escolhidas pelo anfitrião (padrão 5), com a sala cheia ou não', () => {
    const full = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`p${i}`, player(`J${i}`, i)]));
    expect(startGame(lobby, full, ['s1'], 0, seq(0)).meta.totalRounds).toBe(5);
    expect(startGame(lobby, full, ['s1'], 0, seq(0), {}, 2).meta.totalRounds).toBe(2);
    expect(startGame(lobby, PLAYERS, ['s1'], 0, seq(0), {}, 1).meta.totalRounds).toBe(1);
  });

  it('começar: 5 rodadas, placar zerado, primeiro som do baralho', () => {
    const { meta, round, players } = startGame(
      lobby,
      { ...PLAYERS, a: player('Ana', 1, { score: 50 }) },
      ['s1', 's2', 's3'],
      1000,
      seq(0),
    );
    expect(meta.status).toBe('playing');
    expect(meta.totalRounds).toBe(5);
    expect([round.soundId, ...meta.deck].sort()).toEqual(['s1', 's2', 's3']);
    expect(round).toMatchObject({ number: 1, phase: 'imitating', startedAt: 1000, modifier: null });
    expect(Object.values(players).every((p) => p.score === 0)).toBe(true);
    expect(() => startGame(lobby, PLAYERS, [], 0)).toThrow();
  });

  it('a apresentação começa quando todos os conectados enviam — ou no fim do prazo', () => {
    const { round } = startGame(lobby, PLAYERS, ['s1'], 0);
    const offline = { ...PLAYERS, c: player('Caio', 3, { online: false }) };
    expect(pendingPlayers(offline, { a: score(50) })).toEqual(['b']);
    expect(readyToPresent(round, offline, { a: score(50) }, 2000, 1000)).toBe(false);
    expect(readyToPresent(round, offline, { a: score(50), b: score(10) }, 2000, 1000)).toBe(true);
    expect(readyToPresent(round, PLAYERS, {}, 2000, submitDeadlineMs(2000))).toBe(true);
  });

  it('apresenta na ordem de entrada, só quem enviou; depois vem o resultado', () => {
    const { round } = startGame(lobby, PLAYERS, ['s1'], 0);
    let r = toPresenting(round, PLAYERS, { c: score(10), a: score(80) });
    expect(r).toMatchObject({ phase: 'presenting', order: ['a', 'c'], presenting: 0 });
    r = nextPresenter(r);
    expect(r.presenting).toBe(1);
    r = nextPresenter(r);
    expect(r.phase).toBe('results');
    expect(toPresenting(round, PLAYERS, {}).phase).toBe('results');
  });

  it('o resultado soma os pontos (já com a roleta) e a roleta vale para a rodada seguinte', () => {
    const players = addRoundPoints(PLAYERS, { a: score(40, 80), b: score(30) }, 'dog-bark');
    expect([players.a.score, players.b.score, players.c.score]).toEqual([80, 30, 0]);
    expect([players.a.best, players.c.best]).toEqual([{ total: 40, soundId: 'dog-bark' }, null]);
    const later = addRoundPoints(players, { a: score(20), b: score(90) }, 'siren');
    expect([later.a.best?.soundId, later.b.best?.soundId]).toEqual(['dog-bark', 'siren']);

    const started = startGame(lobby, PLAYERS, ['s1', 's2'], 0, seq(0));
    const wheel = spinWheel({ ...started.round, phase: 'results' }, seq(0));
    expect(wheel).toMatchObject({ phase: 'wheel', nextModifier: 'double' });
    const next = nextRound(started.meta, wheel, 5000, seq(0));
    expect(next.round).toMatchObject({
      number: 2,
      modifier: 'double',
      nextModifier: null,
      phase: 'imitating',
      startedAt: 5000,
    });
    expect(next.round.soundId).not.toBe(started.round.soundId);
    expect(isLastRound(started.meta, { ...next.round, number: 5 })).toBe(true);
  });

  it('baralho reembaralha sem repetir o último som', () => {
    const meta: RoomMeta = { ...lobby, status: 'playing', totalRounds: 5, pool: ['s1', 's2'], deck: [] };
    const { round } = startGame(lobby, PLAYERS, ['s1'], 0);
    for (let i = 0; i < 20; i++) {
      const next = nextRound(meta, { ...round, soundId: 's1', phase: 'wheel' }, 0, seq(Math.random()));
      expect(next.round.soundId).toBe('s2');
    }
  });

  it('conta as reações por tipo', () => {
    expect(countReactions([{ emoji: 'laugh' }, { emoji: 'laugh' }, { emoji: 'tomato' }])).toEqual({
      laugh: 2,
      tomato: 1,
      happy: 0,
      scared: 0,
    });
  });
});

describe('vez de cada celular (online)', () => {
  it('ouvir → repetir 1x → imitar → analisar → enviado; "Sem repetição" zera a repetição', () => {
    let t = soloTurn(null);
    for (const type of ['start', 'referenceEnded', 'replay', 'referenceEnded', 'replay'] as const)
      t = reduceSolo(t, { type });
    expect(t).toMatchObject({ phase: 'ready', replaysLeft: 0 });
    t = reduceSolo(reduceSolo(t, { type: 'record' }), { type: 'recordingEnded' });
    t = reduceSolo(t, { type: 'scored', score: { total: 70, pitch: 60, rhythm: 80 } });
    expect(t).toMatchObject({ phase: 'result', score: { total: 70 } });
    expect(soloTurn('noReplay').replaysLeft).toBe(0);
  });
});

describe('imitação pela rede', () => {
  it('base64 igual ao do Node', () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 251, 252, 253]);
    for (let n = 0; n <= bytes.length; n++) {
      const part = bytes.slice(0, n);
      expect(toBase64(part)).toBe(Buffer.from(part).toString('base64'));
      expect(Array.from(fromBase64(toBase64(part)))).toEqual(Array.from(part));
    }
  });

  it('μ-law a 16 kHz: pequeno, audível e parecido com o original', () => {
    const rate = 22050;
    const tone = new Float32Array(rate * 2).map((_, i) => 0.3 * Math.sin((2 * Math.PI * 440 * i) / rate));
    const data = encodeClip(tone, rate);
    expect(data.length).toBeLessThan(45_000); // 2 s → ~43 KB em base64
    const back = decodeClip(data);
    expect(back.length).toBe(32000);
    const peak = back.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    expect(peak).toBeGreaterThan(0.85); // normalizado para 0,9 (os degraus do μ-law perto do pico são de ~3%)
    expect(peak).toBeLessThanOrEqual(0.95);
  });
});
