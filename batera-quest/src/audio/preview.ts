import { Kit } from '../content/kits';
import { Chart } from '../game/types';
import { engine } from './engine';

/** Toca um chart como exemplo (com contagem de baquetas). Retorna a duração em segundos. */
export async function playPreview(kit: Kit, chart: Chart): Promise<number> {
  await engine.resume();
  await engine.loadKit(kit);
  engine.stopScheduled();
  const spb = 60 / chart.bpm;
  const start = engine.now() + 0.2 + 4 * spb;
  for (let b = -4; b < 0; b++) engine.stick(start + b * spb, true);
  for (const n of chart.notes) engine.play(kit, n.piece, { when: start + n.time, open: n.open, track: true });
  return 4 * spb + chart.duration + 0.2;
}

export function stopPreview() {
  engine.stopScheduled();
}
