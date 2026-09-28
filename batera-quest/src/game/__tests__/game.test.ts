import { KITS, getKit } from '../../content/kits';
import { ALL_LESSONS, UNITS } from '../../content/lessons';
import { SONGS } from '../../content/songs';
import { generateSongChart, STYLES, StyleId, thinForDifficulty } from '../chartGen';
import { chartForKit, kitForLesson, lessonChart, songChart } from '../charts';
import { chartFromBars, patternBeats } from '../pattern';
import { applyPlacement, MAX_QUIZ_POINTS, scoreQuiz, tierForScore } from '../placement';
import {
  applyOutcome,
  lessonState,
  levelFromXp,
  newProfile,
  nextLessonId,
  nextStreak,
  xpForLevel,
} from '../progression';
import { mapPiece, reduceChartToKit } from '../reduce';
import { GameSession, HIT, MISSED, starsForAccuracy, WINDOWS } from '../session';
import { DIFFICULTIES, Note } from '../types';

const notes = (times: number[], piece: Note['piece'] = 'snare'): Note[] => times.map((time) => ({ time, piece }));

describe('pattern', () => {
  it('converte a grade em batidas', () => {
    const beats = patternBeats({ lines: { kick: 'x.......x.......', snare: '....x.......x...', hihat: 'x.x.x.x.x.x.x.o.' } });
    expect(beats.filter((b) => b.piece === 'kick').map((b) => b.beat)).toEqual([0, 2]);
    expect(beats.filter((b) => b.piece === 'snare').map((b) => b.beat)).toEqual([1, 3]);
    const hh = beats.filter((b) => b.piece === 'hihat');
    expect(hh).toHaveLength(8);
    expect(hh[7]).toEqual({ beat: 3.5, piece: 'hihat', open: true });
  });

  it('suporta tercinas (12 passos)', () => {
    const beats = patternBeats({ lines: { hihat: 'x.xx.xx.xx.x' } });
    expect(beats.map((b) => +b.beat.toFixed(3))).toEqual([0, 0.667, 1, 1.667, 2, 2.667, 3, 3.667]);
  });

  it('monta o chart com tempos em segundos', () => {
    const chart = chartFromBars([{ lines: { kick: 'x...' } }, { lines: { kick: 'x...' } }], 120);
    expect(chart.notes.map((n) => n.time)).toEqual([0, 2]);
    expect(chart.duration).toBe(4);
  });
});

describe('GameSession', () => {
  it('julga por janela de tempo', () => {
    const s = new GameSession(notes([1, 2, 3, 4]), false);
    expect(s.hit('snare', 1.01)?.judgement).toBe('perfect');
    expect(s.hit('snare', 2 + WINDOWS.great - 0.001)?.judgement).toBe('great');
    expect(s.hit('snare', 3 - WINDOWS.good + 0.001)?.judgement).toBe('good');
    expect(s.hit('snare', 4 + WINDOWS.good + 0.01)).toBeNull();
    expect(s.hit('kick', 4)).toBeNull();
  });

  it('não acerta a mesma nota duas vezes', () => {
    const s = new GameSession(notes([1]), false);
    expect(s.hit('snare', 1)).not.toBeNull();
    expect(s.hit('snare', 1)).toBeNull();
  });

  it('escolhe a nota mais próxima do toque', () => {
    const s = new GameSession(notes([1, 1.1]), false);
    const r = s.hit('snare', 1.09);
    expect(r?.noteIndex).toBe(1);
  });

  it('marca erros, zera combo e calcula multiplicador', () => {
    const times = Array.from({ length: 25 }, (_, i) => i * 0.5);
    const s = new GameSession(notes(times), false);
    for (let i = 0; i < 20; i++) s.hit('snare', times[i]);
    expect(s.combo).toBe(20);
    expect(s.multiplier).toBe(3);
    const missed = s.update(times[21] + 1);
    expect(missed.length).toBeGreaterThan(0);
    expect(s.combo).toBe(0);
    expect(s.status[20]).toBe(MISSED);
    expect(s.status[0]).toBe(HIT);
  });

  it('pontua com multiplicador máximo 4x e energia dobra', () => {
    const times = Array.from({ length: 60 }, (_, i) => i * 0.25);
    const s = new GameSession(notes(times), false);
    for (let i = 0; i < 40; i++) s.hit('snare', times[i]);
    expect(s.multiplier).toBe(4);
    expect(s.energy).toBeGreaterThanOrEqual(0.5);
    const before = s.score;
    expect(s.activateEnergy(times[40])).toBe(true);
    const r = s.hit('snare', times[40]);
    expect(r?.points).toBe(100 * 4 * 2);
    expect(s.score).toBe(before + 800);
  });

  it('falha quando o medidor de rock zera (se permitido)', () => {
    const times = Array.from({ length: 40 }, (_, i) => i * 0.5);
    const failing = new GameSession(notes(times), true);
    failing.update(100);
    expect(failing.failed).toBe(true);
    expect(failing.results().stars).toBe(0);
    const noFail = new GameSession(notes(times), false);
    noFail.update(100);
    expect(noFail.failed).toBe(false);
    expect(noFail.results().counts.miss).toBe(40);
  });

  it('calcula precisão, estrelas e full combo', () => {
    const s = new GameSession(notes([1, 2]), false);
    s.hit('snare', 1);
    s.hit('snare', 2);
    const r = s.results();
    expect(r.accuracy).toBe(1);
    expect(r.stars).toBe(5);
    expect(r.fullCombo).toBe(true);
    expect(starsForAccuracy(0.2)).toBe(0);
    expect(starsForAccuracy(0.7)).toBe(3);
  });
});

describe('redução para o kit', () => {
  it('mapeia peças ausentes', () => {
    const iniciante = getKit('iniciante').pieces;
    expect(mapPiece('ride', iniciante)).toBe('hihat');
    expect(mapPiece('tom2', iniciante)).toBe('snare');
    expect(mapPiece('tom2', getKit('rock').pieces)).toBe('tom1');
    expect(mapPiece('floor', getKit('rock').pieces)).toBe('floor');
  });

  it('remove duplicatas após o mapeamento', () => {
    const chart = { bpm: 120, beatsPerBar: 4, duration: 1, notes: [{ time: 0, piece: 'tom1' as const }, { time: 0, piece: 'snare' as const }] };
    expect(reduceChartToKit(chart, getKit('iniciante').pieces).notes).toHaveLength(1);
  });

  it('todo kit toca qualquer chart só com as próprias peças', () => {
    for (const kit of KITS) {
      for (const style of Object.keys(STYLES) as StyleId[]) {
        const chart = chartForKit(generateSongChart({ style, bpm: 120, difficulty: 'expert' }), kit);
        expect(chart.notes.every((n) => kit.pieces.includes(n.piece))).toBe(true);
      }
    }
  });
});

describe('gerador de charts', () => {
  it('gera charts ordenados e com duração razoável para todo o catálogo', () => {
    for (const song of SONGS) {
      for (const d of DIFFICULTIES) {
        const chart = songChart(song, d);
        expect(chart.notes.length).toBeGreaterThan(20);
        expect(chart.duration).toBeGreaterThan(50);
        expect(chart.duration).toBeLessThan(200);
        expect(chart.notes.every((n, i) => i === 0 || n.time >= chart.notes[i - 1].time)).toBe(true);
      }
    }
  });

  it('dificuldades maiores têm mais notas', () => {
    const counts = DIFFICULTIES.map((difficulty) => generateSongChart({ style: 'funk', bpm: 100, difficulty }).notes.length);
    for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeGreaterThan(counts[i - 1]);
  });

  it('fácil só tem notas nos tempos e no máximo 2 simultâneas', () => {
    const thin = thinForDifficulty(
      [
        { beat: 0, piece: 'kick' },
        { beat: 0, piece: 'crash' },
        { beat: 0, piece: 'hihat' },
        { beat: 0.5, piece: 'hihat' },
        { beat: 1.25, piece: 'snare' },
      ],
      'facil',
    );
    expect(thin.map((n) => n.piece).sort()).toEqual(['crash', 'kick']);
  });
});

describe('conteúdo das aulas', () => {
  it('ids únicos e exercícios tocáveis com o kit da unidade', () => {
    const ids = ALL_LESSONS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const unit of UNITS) {
      const kit = getKit(unit.kit);
      for (const lesson of unit.lessons) {
        const chart = lessonChart(lesson);
        expect(chart.notes.length).toBeGreaterThan(0);
        expect(chart.notes.every((n) => kit.pieces.includes(n.piece))).toBe(true);
      }
    }
  });

  it('usa o kit da unidade quando o kit escolhido não tem as peças', () => {
    const p = { ...newProfile(), xp: xpForLevel(6), selectedKit: 'iniciante' as const };
    const lesson = ALL_LESSONS.find((l) => l.id === 'u3-tons')!;
    expect(kitForLesson(p, lesson.id, lessonChart(lesson)).id).toBe('rock');
  });
});

describe('progressão', () => {
  it('níveis por XP', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(xpForLevel(10))).toBe(10);
  });

  it('aulas liberam em sequência', () => {
    const p = newProfile();
    expect(nextLessonId(p)).toBe('u1-pecas');
    expect(lessonState(p, 'u1-postura')).toBe('locked');
    expect(lessonState(p, 'u3-tons')).toBe('locked-kit');
  });

  it('aprovar uma aula dá XP, conquista e libera a próxima', () => {
    const results = { score: 1000, accuracy: 0.9, stars: 4, maxCombo: 30, counts: { perfect: 30, great: 0, good: 0, miss: 2 }, total: 32, fullCombo: false, failed: false };
    const { profile, reward } = applyOutcome(newProfile(), { mode: 'lesson', id: 'u1-pecas', results }, new Date(2026, 0, 10));
    expect(reward.passed).toBe(true);
    expect(reward.xp).toBe(Math.round((60 * 4) / 5) + 20);
    expect(reward.newAchievements).toContain('primeira-aula');
    expect(lessonState(profile, 'u1-postura')).toBe('available');
    // Repetir com a mesma nota não dá XP de novo.
    const again = applyOutcome(profile, { mode: 'lesson', id: 'u1-pecas', results }, new Date(2026, 0, 10));
    expect(again.reward.xp).toBe(0);
  });

  it('subir de nível libera kits e músicas', () => {
    const p = { ...newProfile(), xp: xpForLevel(3) - 10 };
    const results = { score: 5000, accuracy: 1, stars: 5, maxCombo: 100, counts: { perfect: 100, great: 0, good: 0, miss: 0 }, total: 100, fullCombo: true, failed: false };
    const { reward } = applyOutcome(p, { mode: 'song', id: 'in-the-end', difficulty: 'medio', results }, new Date(2026, 0, 10));
    expect(reward.levelAfter).toBe(3);
    expect(reward.unlockedKits).toEqual(['rock']);
    expect(reward.unlockedSongs).toContain('numb');
    expect(reward.newAchievements).toEqual(expect.arrayContaining(['primeira-musica', 'full-combo', 'cinco-estrelas', 'combo-50']));
  });

  it('sequência de dias', () => {
    const d1 = nextStreak({ count: 0, lastDay: null }, new Date(2026, 0, 10));
    const d2 = nextStreak(d1, new Date(2026, 0, 11));
    const same = nextStreak(d2, new Date(2026, 0, 11));
    const broken = nextStreak(d2, new Date(2026, 0, 14));
    expect([d1.count, d2.count, same.count, broken.count]).toEqual([1, 2, 2, 1]);
  });
});

describe('nivelamento', () => {
  it('pontuação e faixas', () => {
    expect(MAX_QUIZ_POINTS).toBe(20);
    expect(tierForScore(scoreQuiz([0, 0, 3, 0, 0, 0, 0, 0]))).toBe('iniciante');
    expect(tierForScore(scoreQuiz([3, 2, 1, 3, 1, 3, 2, 2]))).toBe('avancado');
  });

  it('aplicar nivelamento pula unidades e libera o kit', () => {
    const p = applyPlacement(newProfile(), 'intermediario');
    expect(levelFromXp(p.xp)).toBe(6);
    expect(p.selectedKit).toBe('studio');
    expect(nextLessonId(p)).toBe('u5-conducao');
    // Nunca reduz progresso.
    const rich = { ...newProfile(), xp: 99999 };
    expect(applyPlacement(rich, 'iniciante').xp).toBe(99999);
  });
});
