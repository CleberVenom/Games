export type SoundCategory = 'Animais' | 'Veículos' | 'Casa' | 'Efeitos' | 'Memes';

export interface ReferenceSound {
  id: string;
  title: string;
  category: SoundCategory;
  /** Duração aproximada do áudio de referência (o arquivo entra no Passo 2). */
  durationMs: number;
}

export const SOUNDS: readonly ReferenceSound[] = [
  { id: 'dog-bark', title: 'Latido de cachorro', category: 'Animais', durationMs: 1400 },
  { id: 'cat-meow', title: 'Miado de gato', category: 'Animais', durationMs: 1300 },
  { id: 'rooster', title: 'Canto do galo', category: 'Animais', durationMs: 2600 },
  { id: 'cow-moo', title: 'Mugido de vaca', category: 'Animais', durationMs: 2200 },
  { id: 'car-horn', title: 'Buzina de carro', category: 'Veículos', durationMs: 1200 },
  { id: 'siren', title: 'Sirene', category: 'Veículos', durationMs: 3000 },
  { id: 'doorbell', title: 'Campainha', category: 'Casa', durationMs: 1800 },
  { id: 'laser', title: 'Tiro de laser', category: 'Efeitos', durationMs: 900 },
  { id: 'sad-trombone', title: 'Trombone triste', category: 'Memes', durationMs: 2800 },
  { id: 'evil-laugh', title: 'Risada maligna', category: 'Memes', durationMs: 2400 },
];

export function getSound(id: string): ReferenceSound {
  const sound = SOUNDS.find((s) => s.id === id);
  if (!sound) throw new Error(`Som desconhecido: ${id}`);
  return sound;
}
