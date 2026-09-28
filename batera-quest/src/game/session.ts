import { Judgement, Note, Piece } from './types';

/** Janelas de acerto (segundos, para mais ou para menos). */
export const WINDOWS = { perfect: 0.045, great: 0.09, good: 0.135 } as const;

const POINTS: Record<Exclude<Judgement, 'miss'>, number> = { perfect: 100, great: 70, good: 40 };
const ACCURACY_WEIGHT: Record<Judgement, number> = { perfect: 1, great: 0.8, good: 0.5, miss: 0 };
const ROCK_DELTA: Record<Judgement, number> = { perfect: 0.025, great: 0.02, good: 0.01, miss: -0.045 };

/** Limiares de precisão para 1..5 estrelas. */
export const STAR_THRESHOLDS = [0.25, 0.45, 0.65, 0.8, 0.93];

/** Segundos de "Energia Rock" com a barra cheia. */
const ENERGY_FULL_SECONDS = 16;
const ENERGY_PER_10_COMBO = 0.125;

export const PENDING = 0;
export const HIT = 1;
export const MISSED = 2;

export interface HitResult {
  noteIndex: number;
  judgement: Exclude<Judgement, 'miss'>;
  /** Positivo = atrasado, negativo = adiantado (segundos). */
  delta: number;
  points: number;
}

export interface SessionResults {
  score: number;
  accuracy: number;
  stars: number;
  maxCombo: number;
  counts: Record<Judgement, number>;
  total: number;
  fullCombo: boolean;
  failed: boolean;
}

export function starsForAccuracy(accuracy: number): number {
  return STAR_THRESHOLDS.filter((t) => accuracy >= t).length;
}

/** Estado de uma partida: julgamento dos toques, combo, multiplicador, medidor de rock e energia. */
export class GameSession {
  readonly notes: Note[];
  readonly status: Uint8Array;
  score = 0;
  combo = 0;
  maxCombo = 0;
  counts: Record<Judgement, number> = { perfect: 0, great: 0, good: 0, miss: 0 };
  rock = 0.6;
  energy = 0;
  failed = false;
  private energyActiveUntil = -Infinity;
  private byPiece = new Map<Piece, number[]>();
  private cursor = new Map<Piece, number>();
  private missCursor = 0;

  constructor(notes: Note[], private readonly canFail: boolean) {
    this.notes = notes;
    this.status = new Uint8Array(notes.length);
    notes.forEach((n, i) => {
      const list = this.byPiece.get(n.piece) ?? [];
      list.push(i);
      this.byPiece.set(n.piece, list);
    });
    for (const piece of this.byPiece.keys()) this.cursor.set(piece, 0);
  }

  get resolved(): number {
    return this.counts.perfect + this.counts.great + this.counts.good + this.counts.miss;
  }

  get multiplier(): number {
    return Math.min(4, 1 + Math.floor(this.combo / 10));
  }

  isEnergyActive(t: number): boolean {
    return t < this.energyActiveUntil;
  }

  /** Nível da barra de energia (0..1) no instante `t`. */
  energyAt(t: number): number {
    if (this.isEnergyActive(t)) return (this.energyActiveUntil - t) / ENERGY_FULL_SECONDS;
    return this.energy;
  }

  canActivateEnergy(t: number): boolean {
    return !this.isEnergyActive(t) && this.energy >= 0.5;
  }

  activateEnergy(t: number): boolean {
    if (!this.canActivateEnergy(t)) return false;
    this.energyActiveUntil = t + this.energy * ENERGY_FULL_SECONDS;
    this.energy = 0;
    return true;
  }

  /** Registra um toque na peça `piece` no tempo `t`. Retorna null se não havia nota para acertar. */
  hit(piece: Piece, t: number): HitResult | null {
    if (this.failed) return null;
    const list = this.byPiece.get(piece);
    if (!list) return null;
    let c = this.cursor.get(piece) ?? 0;
    while (c < list.length && this.status[list[c]] !== PENDING) c++;
    this.cursor.set(piece, c);

    let best = -1;
    let bestAbs = Infinity;
    for (let k = c; k < list.length; k++) {
      const idx = list[k];
      const d = t - this.notes[idx].time;
      if (d < -WINDOWS.good) break;
      if (this.status[idx] !== PENDING) continue;
      if (Math.abs(d) <= WINDOWS.good && Math.abs(d) < bestAbs) {
        best = idx;
        bestAbs = Math.abs(d);
      }
    }
    if (best < 0) return null;

    const judgement: HitResult['judgement'] =
      bestAbs <= WINDOWS.perfect ? 'perfect' : bestAbs <= WINDOWS.great ? 'great' : 'good';
    this.status[best] = HIT;
    this.counts[judgement]++;
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    if (this.combo % 10 === 0 && !this.isEnergyActive(t)) {
      this.energy = Math.min(1, this.energy + ENERGY_PER_10_COMBO);
    }
    const points = POINTS[judgement] * this.multiplier * (this.isEnergyActive(t) ? 2 : 1);
    this.score += points;
    this.rock = Math.min(1, this.rock + ROCK_DELTA[judgement]);
    return { noteIndex: best, judgement, delta: t - this.notes[best].time, points };
  }

  /** Marca como erradas as notas que passaram da janela. Retorna os índices recém-perdidos. */
  update(t: number): number[] {
    const missed: number[] = [];
    if (this.failed) return missed;
    while (this.missCursor < this.notes.length && this.notes[this.missCursor].time < t - WINDOWS.good) {
      const i = this.missCursor++;
      if (this.status[i] !== PENDING) continue;
      this.status[i] = MISSED;
      this.counts.miss++;
      this.combo = 0;
      this.rock = Math.max(0, this.rock + ROCK_DELTA.miss);
      missed.push(i);
      if (this.canFail && this.rock <= 0) {
        this.failed = true;
        break;
      }
    }
    return missed;
  }

  results(): SessionResults {
    const total = this.notes.length;
    const weighted =
      this.counts.perfect * ACCURACY_WEIGHT.perfect +
      this.counts.great * ACCURACY_WEIGHT.great +
      this.counts.good * ACCURACY_WEIGHT.good;
    const accuracy = total === 0 ? 0 : weighted / total;
    return {
      score: this.score,
      accuracy,
      stars: this.failed ? 0 : starsForAccuracy(accuracy),
      maxCombo: this.maxCombo,
      counts: { ...this.counts },
      total,
      fullCombo: !this.failed && total > 0 && this.counts.miss === 0 && this.resolved === total,
      failed: this.failed,
    };
  }
}
