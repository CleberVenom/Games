import { createMatch, Match, MatchEvent, recordingWindowMs, reduce, REPLAYS_PER_TURN } from '../match';
import { MODIFIERS, ModifierId, pointsFor } from '../modifiers';
import { SOUNDS } from '../sounds';

const setup = [
  { name: 'Ana', color: 'violet' as const },
  { name: '  ', color: 'cyan' as const },
  { name: 'Caio', color: 'pink' as const },
];

function seeded(seed = 1) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

/** rng que faz a roleta cair na casa `id`. */
const landOn = (id: ModifierId) => () => (MODIFIERS.findIndex((m) => m.id === id) + 0.5) / MODIFIERS.length;

/** Aplica os eventos em ordem; nos turnos auxiliares a roleta cai em "Nada acontece". */
function run(match: Match, ...events: MatchEvent[]): Match {
  return events.reduce((m, e) => reduce(m, e, e.type === 'spin' ? landOn('nothing') : seeded()), match);
}

const score = (total: number) => ({ type: 'scored', score: { total, pitch: total, rhythm: total } }) as const;

/** Joga um turno completo sem usar a repetição (inclui girar a roleta). */
const fullTurn = (total: number): MatchEvent[] => [
  { type: 'start' },
  { type: 'referenceEnded' },
  { type: 'record' },
  { type: 'recordingEnded' },
  score(total),
  { type: 'spin' },
  { type: 'next' },
];


/** Joga um turno com nota `total` e gira a roleta até cair em `id` (vale para o próximo jogador). */
function turnLanding(match: Match, total: number, id: ModifierId): Match {
  let m = run(match, ...fullTurn(total).slice(0, 5));
  m = reduce(m, { type: 'spin' }, landOn(id));
  return reduce(m, { type: 'next' });
}

describe('createMatch', () => {
  it('cria os jogadores zerados e dá nome padrão para nomes vazios', () => {
    const m = createMatch(setup, seeded());
    expect(m.players.map((p) => p.name)).toEqual(['Ana', 'Jogador 2', 'Caio']);
    expect(m.players.every((p) => p.score === 0)).toBe(true);
    expect(m).toMatchObject({ round: 1, current: 0, phase: 'handoff', replaysLeft: REPLAYS_PER_TURN });
  });

  it('usa todos os sons, sem repetir, entre o som atual e o baralho', () => {
    const m = createMatch(setup, seeded());
    expect([m.soundId, ...m.deck].sort()).toEqual(SOUNDS.map((s) => s.id).sort());
  });
});

describe('turno', () => {
  it('segue handoff → listening → ready → recording → analyzing → result', () => {
    let m = createMatch(setup, seeded());
    const phases = [m.phase];
    for (const e of fullTurn(80).slice(0, 5)) {
      m = reduce(m, e);
      phases.push(m.phase);
    }
    expect(phases).toEqual(['handoff', 'listening', 'ready', 'recording', 'analyzing', 'result']);
    expect(m.lastScore?.total).toBe(80);
    expect(m.players[0].score).toBe(80);
  });

  it('permite ouvir a referência de novo só uma vez', () => {
    let m = run(createMatch(setup, seeded()), { type: 'start' }, { type: 'referenceEnded' });
    m = reduce(m, { type: 'replay' });
    expect(m).toMatchObject({ phase: 'listening', replaysLeft: 0 });
    m = run(m, { type: 'referenceEnded' }, { type: 'replay' });
    expect(m).toMatchObject({ phase: 'ready', replaysLeft: 0 });
  });

  it('não deixa repetir a referência depois de começar a gravar (uma chance só)', () => {
    const m = run(createMatch(setup, seeded()), { type: 'start' }, { type: 'referenceEnded' }, { type: 'record' });
    expect(reduce(m, { type: 'replay' })).toBe(m);
    expect(reduce(m, { type: 'record' })).toBe(m);
  });

  it('ignora eventos fora de hora', () => {
    const m = createMatch(setup, seeded());
    expect(reduce(m, { type: 'record' })).toBe(m);
    expect(reduce(m, score(50))).toBe(m);
    expect(reduce(m, { type: 'spin' })).toBe(m);
    expect(reduce(m, { type: 'next' })).toBe(m);
  });

  it('depois da nota é preciso girar a roleta para passar a vez', () => {
    const result = run(createMatch(setup, seeded()), ...fullTurn(60).slice(0, 5));
    expect(result.phase).toBe('result');
    expect(reduce(result, { type: 'next' })).toBe(result);
    const wheel = reduce(result, { type: 'spin' }, landOn('echo'));
    expect(wheel).toMatchObject({ phase: 'wheel', nextModifier: 'echo', modifier: null });
    expect(reduce(wheel, { type: 'spin' })).toBe(wheel);
  });
});

describe('rodadas', () => {
  it('passa a vez em ordem, soma os pontos e avança a rodada quando todos jogaram', () => {
    let m = createMatch(setup, seeded());
    m = run(m, ...fullTurn(70), ...fullTurn(40));
    expect(m).toMatchObject({ round: 1, current: 2, phase: 'handoff', replaysLeft: REPLAYS_PER_TURN, lastScore: null });
    m = run(m, ...fullTurn(90), ...fullTurn(10));
    expect(m).toMatchObject({ round: 2, current: 1 });
    expect(m.players.map((p) => p.score)).toEqual([80, 40, 90]);
  });

  it('só repete sons depois de usar o baralho inteiro, e nunca o mesmo som duas vezes seguidas', () => {
    let m = createMatch(setup, seeded(7));
    const played = [m.soundId];
    for (let i = 0; i < SOUNDS.length * 3; i++) {
      m = run(m, ...fullTurn(50));
      played.push(m.soundId);
    }
    expect(new Set(played.slice(0, SOUNDS.length)).size).toBe(SOUNDS.length);
    for (let i = 1; i < played.length; i++) expect(played[i]).not.toBe(played[i - 1]);
  });
});

describe('recordingWindowMs', () => {
  it('dá 1,5 s de folga sobre a referência, entre 2,5 s e 6 s', () => {
    expect(recordingWindowMs(900)).toBe(2500);
    expect(recordingWindowMs(2000)).toBe(3500);
    expect(recordingWindowMs(5000)).toBe(6000);
  });

  it('com "Tempo curto" a folga cai para 0,3 s (mínimo 1,5 s)', () => {
    expect(recordingWindowMs(900, 'shortTime')).toBe(1500);
    expect(recordingWindowMs(2000, 'shortTime')).toBe(2300);
  });
});

describe('roleta', () => {
  it('o efeito sorteado vale para o próximo jogador, só no turno dele', () => {
    let m = turnLanding(createMatch(setup, seeded()), 50, 'double');
    expect(m).toMatchObject({ current: 1, modifier: 'double', nextModifier: null });
    m = turnLanding(m, 40, 'nothing');
    expect(m.players.map((p) => p.score)).toEqual([50, 80, 0]);
    expect(m).toMatchObject({ current: 2, modifier: 'nothing' });
  });

  it('"+15 pontos" só vale se o jogador fez algum som', () => {
    expect(pointsFor(62, 'plus15')).toBe(77);
    expect(pointsFor(0, 'plus15')).toBe(0);
    let m = turnLanding(createMatch(setup, seeded()), 50, 'plus15');
    m = run(m, ...fullTurn(70).slice(0, 5));
    expect(m).toMatchObject({ lastPoints: 85, lastScore: { total: 70 } });
    expect(m.players[1].score).toBe(85);
  });

  it('"Sem repetição" tira a repetição da referência', () => {
    const m = turnLanding(createMatch(setup, seeded()), 50, 'noReplay');
    expect(m.replaysLeft).toBe(0);
    const ready = run(m, { type: 'start' }, { type: 'referenceEnded' });
    expect(reduce(ready, { type: 'replay' })).toBe(ready);
  });

  it('sabotagens de som não mexem na pontuação', () => {
    for (const id of ['echo', 'distortion', 'fast', 'telephone'] as const) expect(pointsFor(64, id)).toBe(64);
  });

  it('todas as casas podem sair', () => {
    const seen = new Set<ModifierId>();
    const rng = seeded(3);
    for (let i = 0; i < 200; i++) {
      const m = reduce(run(createMatch(setup, seeded()), ...fullTurn(10).slice(0, 5)), { type: 'spin' }, rng);
      seen.add(m.nextModifier!);
    }
    expect(seen.size).toBe(MODIFIERS.length);
  });
});
