import { Kit, KITS } from '../content/kits';
import { Lesson, findLesson } from '../content/lessons';
import { Song } from '../content/songs';
import { generateSongChart } from './chartGen';
import { chartFromBars, repeatBars } from './pattern';
import { isKitUnlocked, Profile } from './progression';
import { piecesUsed, reduceChartToKit } from './reduce';
import { Chart, Difficulty } from './types';

export function lessonChart(lesson: Lesson): Chart {
  return chartFromBars(repeatBars(lesson.exercise.bars, lesson.exercise.repeats), lesson.exercise.bpm);
}

export function songChart(song: Song, difficulty: Difficulty): Chart {
  return song.charts?.[difficulty] ?? generateSongChart({ style: song.style, bpm: song.bpm, difficulty });
}

/** Kit usado numa aula: o escolhido pelo aluno se tiver todas as peças; senão o kit da unidade. */
export function kitForLesson(profile: Profile, lessonId: string, chart: Chart): Kit {
  const selected = KITS.find((k) => k.id === profile.selectedKit) ?? KITS[0];
  const needed = piecesUsed(chart);
  if (isKitUnlocked(profile, selected.id) && needed.every((p) => selected.pieces.includes(p))) return selected;
  const unitKit = findLesson(lessonId)?.unit.kit;
  return KITS.find((k) => k.id === unitKit) ?? selected;
}

export function kitForSong(profile: Profile): Kit {
  const selected = KITS.find((k) => k.id === profile.selectedKit);
  return selected && isKitUnlocked(profile, selected.id) ? selected : KITS[0];
}

export function chartForKit(chart: Chart, kit: Kit): Chart {
  return reduceChartToKit(chart, kit.pieces);
}
