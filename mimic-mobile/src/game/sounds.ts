import manifest from '../../assets/sounds/manifest.json';

/** Packs oficiais: os 37 sons livres (CC0/domínio público) que vêm com o app. */
export type OfficialPackId = 'animais' | 'vozes' | 'memes' | 'maquinas';

export interface ReferenceSound {
  id: string;
  title: string;
  /** Pack de origem (oficial, pessoal ou criado no app). */
  pack: string;
  /** Duração do arquivo de referência. */
  durationMs: number;
}

/** Títulos e packs. Os arquivos, créditos e licenças ficam em assets/sounds (ver CREDITS.md). */
const CATALOG: readonly (Omit<ReferenceSound, 'durationMs'> & { pack: OfficialPackId })[] = [
  { id: 'dog-bark', title: 'Latido de cachorro', pack: 'animais' },
  { id: 'cat-meow', title: 'Miado de gato', pack: 'animais' },
  { id: 'rooster', title: 'Canto do galo', pack: 'animais' },
  { id: 'cow-moo', title: 'Mugido de vaca', pack: 'animais' },
  { id: 'pig-oink', title: 'Ronco de porco', pack: 'animais' },
  { id: 'sheep-baa', title: 'Balido de ovelha', pack: 'animais' },
  { id: 'hen-cluck', title: 'Cacarejo de galinha', pack: 'animais' },
  { id: 'crow', title: 'Corvo', pack: 'animais' },
  { id: 'lion-roar', title: 'Rugido de leão', pack: 'animais' },
  { id: 'horse-neigh', title: 'Relincho de cavalo', pack: 'animais' },
  { id: 'evil-laugh', title: 'Risada maligna', pack: 'vozes' },
  { id: 'sneeze', title: 'Espirro', pack: 'vozes' },
  { id: 'snore', title: 'Ronco', pack: 'vozes' },
  { id: 'baby-cry', title: 'Bebê chorando', pack: 'vozes' },
  { id: 'burp', title: 'Arroto', pack: 'vozes' },
  { id: 'sad-trombone', title: 'Trombone triste', pack: 'memes' },
  { id: 'rimshot', title: 'Ba dum tss', pack: 'memes' },
  { id: 'record-scratch', title: 'Scratch de DJ', pack: 'memes' },
  { id: 'air-horn', title: 'Buzina de torcida', pack: 'memes' },
  { id: 'gas-truck', title: 'Caminhão do gás', pack: 'memes' },
  { id: 'old-phone', title: 'Toque de celular antigo', pack: 'memes' },
  { id: 'dun-dun-dun', title: 'Dun dun duuun', pack: 'memes' },
  { id: 'flawless-victory', title: '“Flawless victory!”', pack: 'memes' },
  { id: 'fire-in-the-hole', title: '“Fire in the hole!”', pack: 'memes' },
  { id: 'game-over', title: '“Game over”', pack: 'memes' },
  { id: 'crickets', title: 'Grilos (silêncio constrangedor)', pack: 'memes' },
  { id: 'dramatic-boom', title: 'Boom dramático', pack: 'memes' },
  { id: 'car-horn', title: 'Buzina de carro', pack: 'maquinas' },
  { id: 'siren', title: 'Sirene de polícia', pack: 'maquinas' },
  { id: 'referee-whistle', title: 'Apito de juiz', pack: 'maquinas' },
  { id: 'train-whistle', title: 'Apito de trem', pack: 'maquinas' },
  { id: 'boing', title: 'Boing', pack: 'maquinas' },
  { id: 'alarm-clock', title: 'Despertador', pack: 'maquinas' },
  { id: 'toilet-flush', title: 'Descarga', pack: 'maquinas' },
  { id: 'robot', title: 'Robô', pack: 'maquinas' },
  { id: 'laser', title: 'Tiro de laser', pack: 'maquinas' },
  { id: 'vuvuzela', title: 'Vuvuzela', pack: 'maquinas' },
];

const DURATIONS: Record<string, { durationMs: number } | undefined> = manifest;

/** Sons oficiais (durações em assets/sounds/manifest.json, gerado por scripts/build-sounds.py). */
export const SOUNDS: readonly ReferenceSound[] = CATALOG.map((s) => {
  const entry = DURATIONS[s.id];
  if (!entry) throw new Error(`Som sem arquivo gerado: ${s.id} (rode scripts/build-sounds.py)`);
  return { ...s, durationMs: entry.durationMs };
});
