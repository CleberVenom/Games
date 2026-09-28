import { KITS } from '../content/kits';
import { UNITS } from '../content/lessons';
import { QUIZ } from '../content/quiz';
import { Profile, levelFromXp, xpForLevel } from './progression';

export type PlacementTier = 'iniciante' | 'basico' | 'intermediario' | 'avancado';

export interface PlacementInfo {
  tier: PlacementTier;
  label: string;
  description: string;
  startLevel: number;
  /** Unidades consideradas concluídas (continuam disponíveis para revisão). */
  skippedUnits: string[];
}

export const PLACEMENTS: Record<PlacementTier, PlacementInfo> = {
  iniciante: {
    tier: 'iniciante',
    label: 'Iniciante',
    description: 'Vamos começar do zero: conhecer as peças, a postura e tocar sua primeira levada.',
    startLevel: 1,
    skippedUnits: [],
  },
  basico: {
    tier: 'basico',
    label: 'Básico',
    description: 'Você já conhece o instrumento. Começa nas levadas de rock e já ganha o kit Rock Clássico.',
    startLevel: 3,
    skippedUnits: ['u1'],
  },
  intermediario: {
    tier: 'intermediario',
    label: 'Intermediário',
    description: 'Levadas e viradas já estão no seu repertório. Começa no groove avançado com o kit Studio Pro.',
    startLevel: 6,
    skippedUnits: ['u1', 'u2', 'u3', 'u4'],
  },
  avancado: {
    tier: 'avancado',
    label: 'Avançado',
    description: 'Você manda bem! Começa direto no metal e pedal duplo com o kit Metal Extremo.',
    startLevel: 10,
    skippedUnits: ['u1', 'u2', 'u3', 'u4', 'u5'],
  },
};

export const MAX_QUIZ_POINTS = QUIZ.reduce((sum, q) => sum + Math.max(...q.options.map((o) => o.points)), 0);

/** `answers[i]` = índice da opção escolhida na pergunta i. */
export function scoreQuiz(answers: number[]): number {
  return QUIZ.reduce((sum, q, i) => sum + (q.options[answers[i]]?.points ?? 0), 0);
}

export function tierForScore(points: number): PlacementTier {
  const ratio = points / MAX_QUIZ_POINTS;
  if (ratio >= 0.8) return 'avancado';
  if (ratio >= 0.5) return 'intermediario';
  if (ratio >= 0.25) return 'basico';
  return 'iniciante';
}

export function placementXp(tier: PlacementTier): number {
  return xpForLevel(PLACEMENTS[tier].startLevel);
}

export function skippedLessonIds(tier: PlacementTier): string[] {
  const units = new Set(PLACEMENTS[tier].skippedUnits);
  return UNITS.filter((u) => units.has(u.id)).flatMap((u) => u.lessons.map((l) => l.id));
}

/** Aplica o resultado do nivelamento. Nunca remove progresso já conquistado. */
export function applyPlacement(profile: Profile, tier: PlacementTier): Profile {
  const lessons = { ...profile.lessons };
  for (const id of skippedLessonIds(tier)) {
    if (!lessons[id]) lessons[id] = { stars: 0, bestAccuracy: 0, skipped: true };
  }
  const xp = Math.max(profile.xp, placementXp(tier));
  const level = levelFromXp(xp);
  const bestKit = [...KITS].reverse().find((k) => k.unlockLevel <= level) ?? KITS[0];
  return { ...profile, onboarded: true, placement: tier, xp, lessons, selectedKit: bestKit.id };
}
