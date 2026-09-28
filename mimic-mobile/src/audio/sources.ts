import { Asset } from 'expo-asset';

import { audioSource } from './customAudio';
import { PERSONAL_PACKS } from './personalPacks';
import { SOUND_FILES } from './soundFiles';

/** Sons que vão dentro do app: os oficiais e os da pasta packs-pessoais/. */
const BUNDLED: Record<string, number> = {
  ...SOUND_FILES,
  ...Object.fromEntries(PERSONAL_PACKS.flatMap((p) => p.sounds.map((s) => [s.id, s.file]))),
};

/** Onde está o áudio de um som, no formato que `decodeAudioData` aceita. */
export async function resolveSource(id: string): Promise<string | ArrayBuffer> {
  const module = BUNDLED[id];
  if (module === undefined) return audioSource(id);
  const asset = Asset.fromModule(module);
  if (!asset.localUri) await asset.downloadAsync();
  return asset.localUri ?? asset.uri;
}
