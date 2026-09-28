import { Piece } from '../game/types';

export type KitId = 'iniciante' | 'rock' | 'studio' | 'metal';

/** Chave de um sample em assets/sounds (ver src/audio/samples.ts). */
export type SampleKey =
  | 'acustico/kick_1'
  | 'acustico/snare_1'
  | 'acustico/hihat_1'
  | 'acustico/hihat_open_1'
  | 'acustico/tom1_1'
  | 'acustico/floor_1'
  | 'acustico/crash_1'
  | 'estudio/snare_1'
  | 'estudio/snare_2'
  | 'estudio/hihat_1'
  | 'estudio/hihat_2'
  | 'estudio/hihat_open_1'
  | 'estudio/tom1_1'
  | 'estudio/tom1_2'
  | 'estudio/tom2_1'
  | 'estudio/tom2_2'
  | 'estudio/floor_1'
  | 'estudio/floor_2'
  | 'estudio/crash_1'
  | 'estudio/ride_1'
  | 'metal/kick_1'
  | 'comum/stick_1'
  | 'comum/stick_2';

export interface Kit {
  id: KitId;
  name: string;
  description: string;
  unlockLevel: number;
  /** Peças disponíveis, na ordem das pistas (o bumbo vira a barra horizontal). */
  pieces: Piece[];
  doublePedal: boolean;
  /** Samples por peça; mais de um = round-robin (evita o efeito "metralhadora"). */
  sounds: Partial<Record<Piece, SampleKey[]>>;
  hihatOpen: SampleKey[];
  /** Ganho por peça para equilibrar a mixagem. */
  gain: Partial<Record<Piece, number>>;
  color: string;
}

export const KITS: Kit[] = [
  {
    id: 'iniciante',
    name: 'Kit Iniciante',
    description: '4 peças: bumbo, caixa, chimbal e prato de ataque. Tudo que você precisa para as primeiras levadas.',
    unlockLevel: 1,
    pieces: ['hihat', 'snare', 'crash', 'kick'],
    doublePedal: false,
    sounds: {
      kick: ['acustico/kick_1'],
      snare: ['acustico/snare_1'],
      hihat: ['acustico/hihat_1'],
      crash: ['acustico/crash_1'],
    },
    hihatOpen: ['acustico/hihat_open_1'],
    gain: { kick: 1, snare: 0.9, hihat: 0.55, crash: 0.6 },
    color: '#FF8A00',
  },
  {
    id: 'rock',
    name: 'Rock Clássico',
    description: '6 peças: ganha tom e surdo para as primeiras viradas. O kit dos grandes clássicos do rock.',
    unlockLevel: 3,
    pieces: ['hihat', 'snare', 'tom1', 'floor', 'crash', 'kick'],
    doublePedal: false,
    sounds: {
      kick: ['acustico/kick_1'],
      snare: ['acustico/snare_1'],
      hihat: ['acustico/hihat_1'],
      tom1: ['acustico/tom1_1'],
      floor: ['acustico/floor_1'],
      crash: ['acustico/crash_1'],
    },
    hihatOpen: ['acustico/hihat_open_1'],
    gain: { kick: 1, snare: 0.9, hihat: 0.55, tom1: 0.85, floor: 0.9, crash: 0.6 },
    color: '#FF3B5C',
  },
  {
    id: 'studio',
    name: 'Studio Pro',
    description: '8 peças gravadas em estúdio: 2 tons, surdo, condução (ride) e caixa com esteira brilhante.',
    unlockLevel: 6,
    pieces: ['hihat', 'snare', 'tom1', 'tom2', 'floor', 'ride', 'crash', 'kick'],
    doublePedal: false,
    sounds: {
      kick: ['acustico/kick_1'],
      snare: ['estudio/snare_1', 'estudio/snare_2'],
      hihat: ['estudio/hihat_1', 'estudio/hihat_2'],
      tom1: ['estudio/tom1_1', 'estudio/tom1_2'],
      tom2: ['estudio/tom2_1', 'estudio/tom2_2'],
      floor: ['estudio/floor_1', 'estudio/floor_2'],
      ride: ['estudio/ride_1'],
      crash: ['estudio/crash_1'],
    },
    hihatOpen: ['estudio/hihat_open_1'],
    gain: { kick: 1, snare: 0.85, hihat: 0.5, tom1: 0.8, tom2: 0.8, floor: 0.85, ride: 0.55, crash: 0.6 },
    color: '#2F80ED',
  },
  {
    id: 'metal',
    name: 'Metal Extremo',
    description: 'Pedal duplo e bumbo seco com ataque marcado, para galopes, semicolcheias e blast beats.',
    unlockLevel: 10,
    pieces: ['hihat', 'snare', 'tom1', 'tom2', 'floor', 'ride', 'crash', 'kick'],
    doublePedal: true,
    sounds: {
      kick: ['metal/kick_1'],
      snare: ['acustico/snare_1'],
      hihat: ['estudio/hihat_1', 'estudio/hihat_2'],
      tom1: ['estudio/tom1_1', 'estudio/tom1_2'],
      tom2: ['estudio/tom2_1', 'estudio/tom2_2'],
      floor: ['estudio/floor_1', 'estudio/floor_2'],
      ride: ['estudio/ride_1'],
      crash: ['estudio/crash_1'],
    },
    hihatOpen: ['estudio/hihat_open_1'],
    gain: { kick: 1, snare: 0.95, hihat: 0.5, tom1: 0.85, tom2: 0.85, floor: 0.9, ride: 0.55, crash: 0.65 },
    color: '#C86BFA',
  },
];

export const STICK_SAMPLES: SampleKey[] = ['comum/stick_1', 'comum/stick_2'];

export function getKit(id: KitId): Kit {
  const kit = KITS.find((k) => k.id === id);
  if (!kit) throw new Error(`Kit desconhecido: ${id}`);
  return kit;
}

export function kitsUnlockedAt(level: number): Kit[] {
  return KITS.filter((k) => k.unlockLevel <= level);
}
