/** Peças da bateria que viram pistas (lanes) no jogo. */
export type Piece = 'kick' | 'snare' | 'hihat' | 'tom1' | 'tom2' | 'floor' | 'crash' | 'ride';

export const ALL_PIECES: Piece[] = ['kick', 'snare', 'hihat', 'tom1', 'tom2', 'floor', 'crash', 'ride'];

export interface Note {
  /** Tempo em segundos a partir do primeiro tempo do compasso 1. */
  time: number;
  piece: Piece;
  /** Chimbal aberto (só faz sentido em `hihat`). */
  open?: boolean;
}

export interface Chart {
  bpm: number;
  beatsPerBar: number;
  notes: Note[];
  /** Fim do conteúdo tocável, em segundos. */
  duration: number;
}

export type Difficulty = 'facil' | 'medio' | 'dificil' | 'expert';

export const DIFFICULTIES: Difficulty[] = ['facil', 'medio', 'dificil', 'expert'];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  facil: 'Fácil',
  medio: 'Médio',
  dificil: 'Difícil',
  expert: 'Expert',
};

/**
 * Padrão em grade, uma linha por peça. O tamanho da string define a subdivisão do compasso
 * (16 caracteres = semicolcheias em 4/4, 12 = tercinas de colcheia, 8 = colcheias...).
 * `x` = toque, `o` = chimbal aberto, qualquer outro caractere = pausa.
 */
export interface Pattern {
  beats?: number;
  lines: Partial<Record<Piece, string>>;
}

export type Judgement = 'perfect' | 'great' | 'good' | 'miss';
