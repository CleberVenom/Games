import { KITS, KitId } from '../content/kits';
import { ALL_LESSONS, UNITS, findLesson } from '../content/lessons';
import { SONGS, getSong } from '../content/songs';
import { SessionResults } from './session';
import { Difficulty } from './types';

export const MAX_LEVEL = 30;

/** XP acumulado necessário para chegar ao nível L (L1 = 0, L2 = 100, L3 = 300, L4 = 600...). */
export function xpForLevel(level: number): number {
  return 50 * level * (level - 1);
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) level++;
  return level;
}

/** Progresso (0..1) dentro do nível atual. */
export function levelProgress(xp: number): { level: number; current: number; needed: number; ratio: number } {
  const level = levelFromXp(xp);
  if (level >= MAX_LEVEL) return { level, current: 0, needed: 0, ratio: 1 };
  const base = xpForLevel(level);
  const needed = xpForLevel(level + 1) - base;
  const current = xp - base;
  return { level, current, needed, ratio: current / needed };
}

export interface LessonRecord {
  stars: number;
  bestAccuracy: number;
  /** Concluída pelo teste de nivelamento, sem ter sido jogada. */
  skipped?: boolean;
}

export interface SongRecord {
  stars: number;
  bestScore: number;
  bestAccuracy: number;
  fullCombo: boolean;
}

export interface Settings {
  /** Compensação de latência (ms). Positivo = toques são considerados mais cedo. */
  offsetMs: number;
  /** Toca a bateria do chart baixinho como referência. */
  guide: boolean;
  metronome: boolean;
  haptics: boolean;
  /** Velocidade das notas na pista (1 = normal). */
  noteSpeed: number;
}

export interface Profile {
  onboarded: boolean;
  placement: string | null;
  xp: number;
  lessons: Record<string, LessonRecord>;
  songs: Record<string, Partial<Record<Difficulty, SongRecord>>>;
  selectedKit: KitId;
  streak: { count: number; lastDay: string | null };
  achievements: string[];
  stats: { notesHit: number; songsPlayed: number; lessonsPlayed: number; bestCombo: number };
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = { offsetMs: 0, guide: false, metronome: true, haptics: true, noteSpeed: 1 };

export function newProfile(): Profile {
  return {
    onboarded: false,
    placement: null,
    xp: 0,
    lessons: {},
    songs: {},
    selectedKit: 'iniciante',
    streak: { count: 0, lastDay: null },
    achievements: [],
    stats: { notesHit: 0, songsPlayed: 0, lessonsPlayed: 0, bestCombo: 0 },
    settings: { ...DEFAULT_SETTINGS },
  };
}

/** Aula aprovada = 3 estrelas ou mais (ou pulada pelo nivelamento). */
export const LESSON_PASS_STARS = 3;

export function isLessonPassed(profile: Profile, lessonId: string): boolean {
  const r = profile.lessons[lessonId];
  return !!r && (r.skipped || r.stars >= LESSON_PASS_STARS);
}

export function isKitUnlocked(profile: Profile, kitId: KitId): boolean {
  return (KITS.find((k) => k.id === kitId)?.unlockLevel ?? Infinity) <= levelFromXp(profile.xp);
}

export type LessonState = 'locked-kit' | 'locked' | 'available' | 'passed';

export function lessonState(profile: Profile, lessonId: string): LessonState {
  const found = findLesson(lessonId);
  if (!found) return 'locked';
  if (isLessonPassed(profile, lessonId)) return 'passed';
  if (!isKitUnlocked(profile, found.unit.kit)) return 'locked-kit';
  const idx = ALL_LESSONS.findIndex((l) => l.id === lessonId);
  if (idx === 0 || isLessonPassed(profile, ALL_LESSONS[idx - 1].id)) return 'available';
  return 'locked';
}

/** Próxima aula a fazer (a primeira não aprovada e disponível). */
export function nextLessonId(profile: Profile): string | null {
  return ALL_LESSONS.find((l) => lessonState(profile, l.id) === 'available')?.id ?? null;
}

export function isSongUnlocked(profile: Profile, songId: string): boolean {
  return (getSong(songId)?.unlockLevel ?? Infinity) <= levelFromXp(profile.xp);
}

const DIFFICULTY_XP: Record<Difficulty, number> = { facil: 1, medio: 1.4, dificil: 1.8, expert: 2.4 };
const LESSON_FIRST_PASS_BONUS = 20;

export function songXp(unlockLevel: number, difficulty: Difficulty, results: SessionResults): number {
  const base = 40 + 10 * unlockLevel;
  return Math.round(base * DIFFICULTY_XP[difficulty] * results.accuracy * (results.failed ? 0.5 : 1));
}

export function lessonXp(baseXp: number, prevStars: number, newStars: number, firstPass: boolean): number {
  return Math.round((baseXp * Math.max(0, newStars - prevStars)) / 5) + (firstPass ? LESSON_FIRST_PASS_BONUS : 0);
}

export function dayKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

export function nextStreak(streak: Profile['streak'], today: Date): Profile['streak'] {
  const key = dayKey(today);
  if (streak.lastDay === key) return streak;
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const count = streak.lastDay === dayKey(yesterday) ? streak.count + 1 : 1;
  return { count, lastDay: key };
}

// ---------------------------------------------------------------- Conquistas

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'primeira-aula', title: 'Primeira Batida', description: 'Seja aprovado na sua primeira aula.', icon: '🥁' },
  { id: 'primeira-musica', title: 'No Palco', description: 'Termine sua primeira música.', icon: '🎤' },
  { id: 'combo-50', title: 'Embalado', description: 'Faça um combo de 50 notas.', icon: '🔥' },
  { id: 'combo-150', title: 'Máquina de Groove', description: 'Faça um combo de 150 notas.', icon: '⚡' },
  { id: 'full-combo', title: 'Sem Erros', description: 'Termine uma música sem errar nenhuma nota.', icon: '💎' },
  { id: 'cinco-estrelas', title: 'Perfeccionista', description: 'Tire 5 estrelas em uma música.', icon: '⭐' },
  { id: 'metalhead', title: 'Metalhead', description: 'Termine uma música do Metallica.', icon: '🤘' },
  { id: 'expert', title: 'Expert', description: 'Termine uma música no Expert com 3 estrelas ou mais.', icon: '👑' },
  { id: 'unidade-2', title: 'Levada Firme', description: 'Conclua a unidade "Levadas de Rock".', icon: '🎶' },
  { id: 'todas-aulas', title: 'Formado', description: 'Conclua todas as aulas.', icon: '🎓' },
  { id: 'colecionador', title: 'Colecionador', description: 'Libere todos os modelos de bateria.', icon: '🏆' },
  { id: 'sequencia-7', title: 'Disciplina', description: 'Pratique 7 dias seguidos.', icon: '📅' },
];

function earnedAchievements(p: Profile, ctx: { mode: 'lesson' | 'song'; songId?: string; difficulty?: Difficulty; results: SessionResults }): string[] {
  const out: string[] = [];
  const { results } = ctx;
  const finishedSong = ctx.mode === 'song' && !results.failed;
  if (Object.values(p.lessons).some((r) => !r.skipped && r.stars >= LESSON_PASS_STARS)) out.push('primeira-aula');
  if (finishedSong) out.push('primeira-musica');
  if (p.stats.bestCombo >= 50) out.push('combo-50');
  if (p.stats.bestCombo >= 150) out.push('combo-150');
  if (finishedSong && results.fullCombo) out.push('full-combo');
  if (finishedSong && results.stars >= 5) out.push('cinco-estrelas');
  if (finishedSong && getSong(ctx.songId ?? '')?.artist === 'Metallica') out.push('metalhead');
  if (finishedSong && ctx.difficulty === 'expert' && results.stars >= 3) out.push('expert');
  const unit2 = UNITS.find((u) => u.id === 'u2');
  if (unit2 && unit2.lessons.every((l) => isLessonPassed(p, l.id))) out.push('unidade-2');
  if (ALL_LESSONS.every((l) => isLessonPassed(p, l.id))) out.push('todas-aulas');
  if (KITS.every((k) => isKitUnlocked(p, k.id))) out.push('colecionador');
  if (p.streak.count >= 7) out.push('sequencia-7');
  return out;
}

// ---------------------------------------------------------------- Aplicar resultado

export interface PlayOutcome {
  mode: 'lesson' | 'song';
  id: string;
  difficulty?: Difficulty;
  results: SessionResults;
}

export interface Reward {
  xp: number;
  levelBefore: number;
  levelAfter: number;
  unlockedKits: KitId[];
  unlockedSongs: string[];
  newAchievements: string[];
  newBest: boolean;
  passed: boolean;
}

export function applyOutcome(profile: Profile, outcome: PlayOutcome, today: Date): { profile: Profile; reward: Reward } {
  const { results } = outcome;
  const p: Profile = {
    ...profile,
    lessons: { ...profile.lessons },
    songs: { ...profile.songs },
    stats: { ...profile.stats },
    streak: nextStreak(profile.streak, today),
  };
  const levelBefore = levelFromXp(profile.xp);
  let xp = 0;
  let newBest = false;
  let passed = false;

  p.stats.notesHit += results.counts.perfect + results.counts.great + results.counts.good;
  p.stats.bestCombo = Math.max(p.stats.bestCombo, results.maxCombo);

  if (outcome.mode === 'lesson') {
    p.stats.lessonsPlayed++;
    const lesson = findLesson(outcome.id)?.lesson;
    const prev = profile.lessons[outcome.id];
    const prevStars = prev && !prev.skipped ? prev.stars : 0;
    passed = results.stars >= LESSON_PASS_STARS;
    const firstPass = passed && !(prev && !prev.skipped && prev.stars >= LESSON_PASS_STARS);
    xp = lesson ? lessonXp(lesson.xp, prevStars, results.stars, firstPass) : 0;
    newBest = results.stars > prevStars || results.accuracy > (prev?.bestAccuracy ?? 0);
    p.lessons[outcome.id] = {
      stars: Math.max(prevStars, results.stars),
      bestAccuracy: Math.max(prev?.bestAccuracy ?? 0, results.accuracy),
      // Uma aula pulada pelo nivelamento continua liberando a próxima mesmo se a revisão não passar.
      ...(prev?.skipped && !passed ? { skipped: true } : {}),
    };
  } else {
    p.stats.songsPlayed++;
    const song = getSong(outcome.id);
    const difficulty = outcome.difficulty ?? 'facil';
    xp = song ? songXp(song.unlockLevel, difficulty, results) : 0;
    const prev = profile.songs[outcome.id]?.[difficulty];
    passed = !results.failed;
    newBest = results.score > (prev?.bestScore ?? 0);
    p.songs[outcome.id] = {
      ...profile.songs[outcome.id],
      [difficulty]: {
        stars: Math.max(prev?.stars ?? 0, results.stars),
        bestScore: Math.max(prev?.bestScore ?? 0, results.score),
        bestAccuracy: Math.max(prev?.bestAccuracy ?? 0, results.accuracy),
        fullCombo: (prev?.fullCombo ?? false) || results.fullCombo,
      },
    };
  }

  p.xp = profile.xp + xp;
  const levelAfter = levelFromXp(p.xp);
  const unlockedKits = KITS.filter((k) => k.unlockLevel > levelBefore && k.unlockLevel <= levelAfter).map((k) => k.id);
  const unlockedSongs = SONGS.filter((s) => s.unlockLevel > levelBefore && s.unlockLevel <= levelAfter).map((s) => s.id);

  const earned = earnedAchievements(p, { mode: outcome.mode, songId: outcome.id, difficulty: outcome.difficulty, results });
  const newAchievements = earned.filter((a) => !profile.achievements.includes(a));
  p.achievements = [...profile.achievements, ...newAchievements];

  return { profile: p, reward: { xp, levelBefore, levelAfter, unlockedKits, unlockedSongs, newAchievements, newBest, passed } };
}
