import { Chart, Note, Piece } from './types';

/** Para onde cada peça vai quando o kit não a possui (em ordem de preferência). */
const FALLBACK: Record<Piece, Piece[]> = {
  kick: [],
  snare: [],
  hihat: [],
  crash: ['hihat'],
  ride: ['hihat', 'crash'],
  tom1: ['tom2', 'snare'],
  tom2: ['tom1', 'floor', 'snare'],
  floor: ['tom2', 'tom1', 'snare'],
};

export function mapPiece(piece: Piece, available: Piece[]): Piece | null {
  if (available.includes(piece)) return piece;
  return FALLBACK[piece].find((p) => available.includes(p)) ?? null;
}

/** Adapta um chart às peças de um kit (ex.: viradas nos tons viram caixa no Kit Iniciante). */
export function reduceChartToKit(chart: Chart, available: Piece[]): Chart {
  const seen = new Set<string>();
  const notes: Note[] = [];
  for (const n of chart.notes) {
    const piece = mapPiece(n.piece, available);
    if (!piece) continue;
    const key = `${Math.round(n.time * 1000)}:${piece}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const note: Note = { time: n.time, piece };
    if (n.open && piece === 'hihat') note.open = true;
    notes.push(note);
  }
  return { ...chart, notes };
}

export function piecesUsed(chart: Chart): Piece[] {
  return Array.from(new Set(chart.notes.map((n) => n.piece)));
}
