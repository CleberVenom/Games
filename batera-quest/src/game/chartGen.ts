import { patternBeats } from './pattern';
import { Chart, Difficulty, Note, Pattern, Piece } from './types';

/**
 * Gerador de charts PROVISÓRIOS para o catálogo de músicas.
 *
 * Não é transcrição das músicas originais: são levadas genéricas do estilo, no andamento
 * aproximado de cada faixa, organizadas numa estrutura típica (intro, verso, refrão, ponte).
 * Quando o licenciamento sair, o chart oficial substitui este (campo `chart` em songs.ts).
 */

export type StyleId =
  | 'stomp'
  | 'ballad'
  | 'rock8'
  | 'rock16'
  | 'halftime'
  | 'funk'
  | 'disco'
  | 'tribal'
  | 'nu'
  | 'punk'
  | 'gallop'
  | 'thrash'
  | 'doublebass'
  | 'blast';

interface Style {
  verse: Pattern;
  chorus: Pattern;
  bridge: Pattern;
}

const SN_24 = '....x.......x...';
const HH_8 = 'x.x.x.x.x.x.x.x.';
const HH_16 = 'xxxxxxxxxxxxxxxx';
const Q = 'x...x...x...x...';

export const STYLES: Record<StyleId, Style> = {
  stomp: {
    verse: { lines: { kick: 'x.x.....x.x.....', snare: SN_24 } },
    chorus: { lines: { kick: 'x.x.....x.x.....', snare: SN_24, hihat: Q } },
    bridge: { lines: { kick: 'x.x.....x.x.....', snare: SN_24, crash: 'x...............' } },
  },
  ballad: {
    verse: { lines: { hihat: HH_8, kick: 'x.......x.......', snare: SN_24 } },
    chorus: { lines: { ride: HH_8, kick: 'x.....x.x.......', snare: SN_24 } },
    bridge: { lines: { hihat: Q, kick: 'x.........x.....', snare: '........x.......' } },
  },
  rock8: {
    verse: { lines: { hihat: HH_8, kick: 'x.......x.x.....', snare: SN_24 } },
    chorus: { lines: { ride: HH_8, kick: 'x.....x.x.x.....', snare: SN_24 } },
    bridge: { lines: { hihat: 'x.x.x.x.x.x.x.o.', kick: 'x..x..x.x.......', snare: SN_24 } },
  },
  rock16: {
    verse: { lines: { hihat: HH_16, kick: 'x.....x...x.....', snare: SN_24 } },
    chorus: { lines: { ride: HH_8, kick: 'x.....x.x.x...x.', snare: SN_24 } },
    bridge: { lines: { hihat: 'x.x.x.x.x.x.x.o.', kick: 'x.x...x...x.....', snare: SN_24 } },
  },
  halftime: {
    verse: { lines: { hihat: HH_8, kick: 'x.........x.....', snare: '........x.......' } },
    chorus: { lines: { ride: HH_8, kick: 'x.....x...x.....', snare: '........x.......' } },
    bridge: { lines: { hihat: HH_8, kick: 'x.......x.x.....', snare: SN_24 } },
  },
  funk: {
    verse: { lines: { hihat: 'xxxxxxoxxxxxxxox', kick: 'x..x..x...x..x..', snare: SN_24 } },
    chorus: { lines: { hihat: 'x.o.x.o.x.o.x.o.', kick: 'x..x..x.x.x.....', snare: SN_24 } },
    bridge: { lines: { ride: HH_8, kick: 'x.x...x..x......', snare: '....x..x....x...' } },
  },
  disco: {
    verse: { lines: { hihat: 'x.o.x.o.x.o.x.o.', kick: Q, snare: SN_24 } },
    chorus: { lines: { ride: HH_8, kick: Q, snare: SN_24 } },
    bridge: { lines: { hihat: HH_16, kick: Q, snare: SN_24 } },
  },
  tribal: {
    verse: { lines: { floor: HH_8, kick: 'x.......x.......', snare: SN_24 } },
    chorus: { lines: { hihat: HH_8, kick: 'x.....x.x.......', snare: SN_24, tom1: '..............x.' } },
    bridge: { lines: { tom1: 'x..x..x.', floor: '..x..x.xx..x..x.', kick: 'x.......x.......' } },
  },
  nu: {
    verse: { lines: { hihat: HH_8, kick: 'x..x..x...x.....', snare: SN_24 } },
    chorus: { lines: { crash: HH_8, kick: 'x.xx..x.x.x..x..', snare: SN_24 } },
    bridge: { lines: { hihat: HH_16, kick: 'x..x..x...x..x..', snare: SN_24 } },
  },
  punk: {
    verse: { lines: { hihat: HH_8, kick: 'x.....x.x.......', snare: SN_24 } },
    chorus: { lines: { crash: Q, ride: '..x...x...x...x.', kick: 'x.x...x.x.x...x.', snare: SN_24 } },
    bridge: { lines: { hihat: HH_8, kick: 'x...x...x...x...', snare: SN_24 } },
  },
  gallop: {
    verse: { lines: { hihat: Q, kick: 'x.xxx.xxx.xxx.xx', snare: SN_24 } },
    chorus: { lines: { crash: Q, kick: 'x.xxx.xxx.xxx.xx', snare: SN_24 } },
    bridge: { lines: { ride: HH_8, kick: 'x.....x.x.......', snare: SN_24 } },
  },
  thrash: {
    verse: { lines: { hihat: Q, kick: Q, snare: '..x...x...x...x.' } },
    chorus: { lines: { crash: Q, kick: Q, snare: '..x...x...x...x.' } },
    bridge: { lines: { ride: HH_8, kick: 'x.xxx.xxx.xxx.xx', snare: SN_24 } },
  },
  doublebass: {
    verse: { lines: { hihat: HH_8, kick: 'x.x.x.x.x.x.x.x.', snare: SN_24 } },
    chorus: { lines: { crash: Q, kick: HH_16, snare: SN_24 } },
    bridge: { lines: { ride: Q, kick: HH_16, snare: '........x.......' } },
  },
  blast: {
    verse: { lines: { hihat: HH_8, kick: 'x.xxx.xxx.xxx.xx', snare: SN_24 } },
    chorus: { lines: { crash: Q, kick: HH_16, snare: SN_24 } },
    bridge: { lines: { ride: HH_8, kick: HH_8, snare: '.x.x.x.x.x.x.x.x' } },
  },
};

/** Virada nos tempos 3 e 4 (a primeira metade do compasso mantém a levada). */
const FILL_HALF: Pattern = {
  lines: { snare: '........xxxx....', tom1: '............xx..', floor: '..............xx' },
};
/** Virada de compasso inteiro descendo pelos tons. */
const FILL_FULL: Pattern = {
  lines: { snare: 'xxxx............', tom1: '....xxxx........', tom2: '........xxxx....', floor: '............xxxx' },
};

type BeatNote = { beat: number; piece: Piece; open?: boolean };

function firstHalf(p: Pattern): Pattern {
  const lines: Pattern['lines'] = {};
  for (const [piece, line] of Object.entries(p.lines) as [Piece, string][]) {
    const half = Math.floor(line.length / 2);
    lines[piece] = line.slice(0, half) + '.'.repeat(line.length - half);
  }
  return { beats: p.beats, lines };
}

function mergePatterns(a: Pattern, b: Pattern): Pattern {
  const lines: Pattern['lines'] = { ...a.lines };
  for (const [piece, line] of Object.entries(b.lines) as [Piece, string][]) {
    const base = lines[piece];
    lines[piece] = base && base.length === line.length
      ? Array.from(line, (ch, i) => (ch === '.' ? base[i] : ch)).join('')
      : line;
  }
  return { beats: a.beats, lines };
}

interface Section {
  groove: Pattern;
  bars: number;
  fill: 'half' | 'full' | null;
}

function structure(style: Style, scale: number): Section[] {
  const s = (bars: number) => Math.max(2, Math.round(bars * scale));
  return [
    { groove: style.verse, bars: s(4), fill: 'half' },
    { groove: style.verse, bars: s(8), fill: 'half' },
    { groove: style.chorus, bars: s(8), fill: 'full' },
    { groove: style.verse, bars: s(8), fill: 'half' },
    { groove: style.chorus, bars: s(8), fill: 'full' },
    { groove: style.bridge, bars: s(8), fill: 'full' },
    { groove: style.chorus, bars: s(8), fill: 'half' },
  ];
}

const PRIORITY: Piece[] = ['kick', 'snare', 'crash', 'hihat', 'ride', 'tom1', 'tom2', 'floor'];
const EPS = 1e-6;

/** Simplifica as notas conforme a dificuldade (tempos em batidas). */
export function thinForDifficulty(notes: BeatNote[], difficulty: Difficulty): BeatNote[] {
  if (difficulty === 'expert') return notes;
  const frac = (b: number) => b - Math.floor(b + EPS);
  const onQuarter = (b: number) => Math.abs(frac(b)) < EPS;
  const onEighth = (b: number) => onQuarter(b) || Math.abs(frac(b) - 0.5) < EPS;
  const cymbal = (p: Piece) => p === 'hihat' || p === 'ride';

  if (difficulty === 'dificil') {
    // Semicolcheias saem, exceto bumbos sincopados (o pedal duplo contínuo vira colcheias).
    const kicksPerBar = new Map<number, number>();
    for (const n of notes) {
      if (n.piece === 'kick') {
        const bar = Math.floor(n.beat / 4 + EPS);
        kicksPerBar.set(bar, (kicksPerBar.get(bar) ?? 0) + 1);
      }
    }
    return notes.filter(
      (n) => onEighth(n.beat) || (n.piece === 'kick' && (kicksPerBar.get(Math.floor(n.beat / 4 + EPS)) ?? 0) <= 8),
    );
  }
  if (difficulty === 'medio') {
    // Colcheias; chimbal/condução só nos tempos.
    return notes.filter((n) => (cymbal(n.piece) ? onQuarter(n.beat) : onEighth(n.beat)));
  }

  // Fácil: só tempos inteiros; chimbal/condução apenas quando tocam sozinhos; no máximo 2 notas juntas.
  const byTime = new Map<number, BeatNote[]>();
  for (const n of notes) {
    if (!onQuarter(n.beat)) continue;
    const key = Math.round(n.beat * 1000);
    byTime.set(key, [...(byTime.get(key) ?? []), n]);
  }
  const out: BeatNote[] = [];
  for (const group of byTime.values()) {
    const hasOther = group.some((n) => !cymbal(n.piece));
    const kept = hasOther ? group.filter((n) => !cymbal(n.piece)) : group;
    kept.sort((a, b) => PRIORITY.indexOf(a.piece) - PRIORITY.indexOf(b.piece));
    out.push(...kept.slice(0, 2));
  }
  return out;
}

export interface GenerateOptions {
  style: StyleId;
  bpm: number;
  difficulty: Difficulty;
  /** Duração alvo em segundos (aprox.). */
  targetSeconds?: number;
}

export function generateSongChart({ style, bpm, difficulty, targetSeconds = 110 }: GenerateOptions): Chart {
  const def = STYLES[style];
  const secPerBar = (4 * 60) / bpm;
  const baseBars = structure(def, 1).reduce((a, s) => a + s.bars, 0);
  const rawScale = targetSeconds / (baseBars * secPerBar);
  const scale = rawScale < 0.75 ? 0.5 : rawScale > 1.5 ? 2 : 1;

  const beatNotes: BeatNote[] = [];
  let bar = 0;
  for (const section of structure(def, scale)) {
    for (let i = 0; i < section.bars; i++) {
      const last = i === section.bars - 1;
      let pattern = section.groove;
      if (last && section.fill === 'half') pattern = mergePatterns(firstHalf(section.groove), FILL_HALF);
      if (last && section.fill === 'full') pattern = FILL_FULL;
      let notes = patternBeats(pattern);
      if (i === 0) {
        // Início de seção: prato de ataque + bumbo no 1, sem chimbal/condução nesse tempo.
        notes = notes.filter((n) => !(n.beat === 0 && (n.piece === 'hihat' || n.piece === 'ride' || n.piece === 'crash')));
        if (!notes.some((n) => n.beat === 0 && n.piece === 'kick')) notes.push({ beat: 0, piece: 'kick' });
        notes.push({ beat: 0, piece: 'crash' });
      }
      for (const n of notes) beatNotes.push({ ...n, beat: n.beat + bar * 4 });
      bar++;
    }
  }
  // Final: ataque + bumbo.
  beatNotes.push({ beat: bar * 4, piece: 'crash' }, { beat: bar * 4, piece: 'kick' });

  const secPerBeat = 60 / bpm;
  const notes: Note[] = thinForDifficulty(beatNotes, difficulty).map((n) => {
    const note: Note = { time: n.beat * secPerBeat, piece: n.piece };
    if (n.open) note.open = true;
    return note;
  });
  notes.sort((a, b) => a.time - b.time || a.piece.localeCompare(b.piece));
  return { bpm, beatsPerBar: 4, notes, duration: (bar * 4 + 1) * secPerBeat };
}
