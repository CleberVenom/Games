import { createMatch, Match, MatchEvent, recordingWindowMs, reduce, REPLAYS_PER_TURN } from '../match';
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

function run(match: Match, ...events: MatchEvent[]): Match {
  return events.reduce((m, e) => reduce(m, e, seeded()), match);
}

const score = (total: number) => ({ type: 'scored', score: { total, pitch: total, rhythm: total } }) as const;

/** Joga um turno completo sem usar a repetição. */
const fullTurn = (total: number): MatchEvent[] => [
  { type: 'start' },
  { type: 'referenceEnded' },
  { type: 'record' },
  { type: 'recordingEnded' },
  score(total),
  { type: 'next' },
];

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
    expect(reduce(m, { type: 'next' })).toBe(m);
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
});
