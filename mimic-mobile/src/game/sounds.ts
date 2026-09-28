import manifest from '../../assets/sounds/manifest.json';

export type SoundCategory = 'Animais' | 'Pessoas' | 'Memes' | 'Efeitos';

export interface ReferenceSound {
  id: string;
  title: string;
  category: SoundCategory;
  /** Duração do arquivo (assets/sounds/manifest.json, gerado por scripts/build-sounds.py). */
  durationMs: number;
}

/** Títulos e categorias. Os arquivos, créditos e licenças ficam em assets/sounds (ver CREDITS.md). */
const CATALOG: readonly Omit<ReferenceSound, 'durationMs'>[] = [
  { id: 'dog-bark', title: 'Latido de cachorro', category: 'Animais' },
  { id: 'cat-meow', title: 'Miado de gato', category: 'Animais' },
  { id: 'rooster', title: 'Canto do galo', category: 'Animais' },
  { id: 'cow-moo', title: 'Mugido de vaca', category: 'Animais' },
  { id: 'pig-oink', title: 'Ronco de porco', category: 'Animais' },
  { id: 'sheep-baa', title: 'Balido de ovelha', category: 'Animais' },
  { id: 'hen-cluck', title: 'Cacarejo de galinha', category: 'Animais' },
  { id: 'crow', title: 'Corvo', category: 'Animais' },
  { id: 'lion-roar', title: 'Rugido de leão', category: 'Animais' },
  { id: 'horse-neigh', title: 'Relincho de cavalo', category: 'Animais' },
  { id: 'evil-laugh', title: 'Risada maligna', category: 'Pessoas' },
  { id: 'sneeze', title: 'Espirro', category: 'Pessoas' },
  { id: 'snore', title: 'Ronco', category: 'Pessoas' },
  { id: 'baby-cry', title: 'Bebê chorando', category: 'Pessoas' },
  { id: 'burp', title: 'Arroto', category: 'Pessoas' },
  { id: 'sad-trombone', title: 'Trombone triste', category: 'Memes' },
  { id: 'rimshot', title: 'Ba dum tss', category: 'Memes' },
  { id: 'record-scratch', title: 'Scratch de DJ', category: 'Memes' },
  { id: 'air-horn', title: 'Buzina de torcida', category: 'Memes' },
  { id: 'gas-truck', title: 'Caminhão do gás', category: 'Memes' },
  { id: 'old-phone', title: 'Toque de celular antigo', category: 'Memes' },
  { id: 'dun-dun-dun', title: 'Dun dun duuun', category: 'Memes' },
  { id: 'flawless-victory', title: '“Flawless victory!”', category: 'Memes' },
  { id: 'fire-in-the-hole', title: '“Fire in the hole!”', category: 'Memes' },
  { id: 'game-over', title: '“Game over”', category: 'Memes' },
  { id: 'crickets', title: 'Grilos (silêncio constrangedor)', category: 'Memes' },
  { id: 'dramatic-boom', title: 'Boom dramático', category: 'Memes' },
  { id: 'car-horn', title: 'Buzina de carro', category: 'Efeitos' },
  { id: 'siren', title: 'Sirene de polícia', category: 'Efeitos' },
  { id: 'referee-whistle', title: 'Apito de juiz', category: 'Efeitos' },
  { id: 'train-whistle', title: 'Apito de trem', category: 'Efeitos' },
  { id: 'boing', title: 'Boing', category: 'Efeitos' },
  { id: 'alarm-clock', title: 'Despertador', category: 'Efeitos' },
  { id: 'toilet-flush', title: 'Descarga', category: 'Efeitos' },
  { id: 'robot', title: 'Robô', category: 'Efeitos' },
  { id: 'laser', title: 'Tiro de laser', category: 'Efeitos' },
  { id: 'vuvuzela', title: 'Vuvuzela', category: 'Efeitos' },
];

const DURATIONS: Record<string, { durationMs: number } | undefined> = manifest;

export const SOUNDS: readonly ReferenceSound[] = CATALOG.map((s) => {
  const entry = DURATIONS[s.id];
  if (!entry) throw new Error(`Som sem arquivo gerado: ${s.id} (rode scripts/build-sounds.py)`);
  return { ...s, durationMs: entry.durationMs };
});

export function getSound(id: string): ReferenceSound {
  const sound = SOUNDS.find((s) => s.id === id);
  if (!sound) throw new Error(`Som desconhecido: ${id}`);
  return sound;
}
