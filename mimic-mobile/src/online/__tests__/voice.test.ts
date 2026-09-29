import type { RoomMeta, RoomRound } from '../room';
import { callsFirst, micOpen, mutedByOther, voiceAllowed, voiceSessionId } from '../voice';

const meta = (status: RoomMeta['status']): RoomMeta => ({
  host: 'h',
  status,
  createdAt: 0,
  totalRounds: 5,
  pool: [],
  deck: [],
});
const round = (phase: RoomRound['phase']): RoomRound => ({
  number: 1,
  soundId: 's',
  modifier: null,
  phase,
  startedAt: 0,
  order: [],
  presenting: 0,
  nextModifier: null,
});

describe('chat de voz', () => {
  it('só fica liberado fora dos sons: sala, placar, roleta e pódio', () => {
    expect(voiceAllowed(null, null)).toBe(false);
    expect(voiceAllowed(meta('lobby'), null)).toBe(true);
    expect(voiceAllowed(meta('finished'), round('results'))).toBe(true);
    expect(voiceAllowed(meta('playing'), round('imitating'))).toBe(false);
    expect(voiceAllowed(meta('playing'), round('presenting'))).toBe(false);
    expect(voiceAllowed(meta('playing'), round('results'))).toBe(true);
    expect(voiceAllowed(meta('playing'), round('wheel'))).toBe(true);
  });

  it('o microfone entra aberto; o anfitrião muta, mas não consegue ligar o de outra pessoa', () => {
    expect(micOpen('a', undefined)).toBe(true);
    expect(micOpen('a', { on: false, by: 'a' })).toBe(false);
    expect(micOpen('a', { on: true, by: 'a' })).toBe(true);
    expect(micOpen('a', { on: false, by: 'h' })).toBe(false);
    expect(micOpen('a', { on: true, by: 'h' })).toBe(false);
    expect(mutedByOther('a', { on: false, by: 'h' })).toBe(true);
    expect(mutedByOther('a', { on: false, by: 'a' })).toBe(false);
    expect(mutedByOther('a', undefined)).toBe(false);
  });

  it('em cada par, só um começa a ligação', () => {
    expect(callsFirst('abc', 'xyz')).toBe(true);
    expect(callsFirst('xyz', 'abc')).toBe(false);
  });

  it('cada entrada na voz ganha um id novo', () => {
    expect(voiceSessionId(() => 0)).toBe('00000000');
    expect(voiceSessionId(() => 0.5)).toMatch(/^[0-9a-z]{8}$/);
    expect(voiceSessionId(() => 0.5)).not.toBe(voiceSessionId(() => 0.25));
  });
});
