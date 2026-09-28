import { ALL_PIECES, Chart, Note, Pattern } from './types';

const HIT = /[xXoO]/;

/** Converte um compasso em grade para notas (tempos em batidas, relativos ao início do compasso). */
export function patternBeats(pattern: Pattern): { beat: number; piece: Note['piece']; open?: boolean }[] {
  const beats = pattern.beats ?? 4;
  const out: { beat: number; piece: Note['piece']; open?: boolean }[] = [];
  for (const piece of ALL_PIECES) {
    const line = pattern.lines[piece];
    if (!line) continue;
    const steps = line.length;
    for (let i = 0; i < steps; i++) {
      const ch = line[i];
      if (!HIT.test(ch)) continue;
      const note: { beat: number; piece: Note['piece']; open?: boolean } = { beat: (i * beats) / steps, piece };
      if (piece === 'hihat' && (ch === 'o' || ch === 'O')) note.open = true;
      out.push(note);
    }
  }
  return out;
}

/** Monta um chart tocando os compassos em sequência. */
export function chartFromBars(bars: Pattern[], bpm: number): Chart {
  const secPerBeat = 60 / bpm;
  const notes: Note[] = [];
  let beatCursor = 0;
  for (const bar of bars) {
    for (const n of patternBeats(bar)) {
      const note: Note = { time: (beatCursor + n.beat) * secPerBeat, piece: n.piece };
      if (n.open) note.open = true;
      notes.push(note);
    }
    beatCursor += bar.beats ?? 4;
  }
  notes.sort((a, b) => a.time - b.time || a.piece.localeCompare(b.piece));
  return { bpm, beatsPerBar: 4, notes, duration: beatCursor * secPerBeat };
}

/** Repete uma sequência de compassos `repeats` vezes (exercícios das aulas). */
export function repeatBars(sequence: Pattern[], repeats: number): Pattern[] {
  const out: Pattern[] = [];
  for (let i = 0; i < repeats; i++) out.push(...sequence);
  return out;
}
