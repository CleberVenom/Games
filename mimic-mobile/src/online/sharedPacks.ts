import { get, ref, runTransaction, set } from 'firebase/database';

import { readAudioBase64, saveAudioBase64 } from '../audio/customAudio';
import { CustomPack, CustomSound, newId, useLibrary } from '../store/library';
import { firebase, signIn } from './firebase';
import { importedPackId, packCode } from './packShare';

/**
 * Packs compartilhados por código (regras em database.rules.json):
 *   sharedPacks/{código}/meta        dono, id do pack, nome, ícone, quantos sons e quando
 *   sharedPacks/{código}/sounds      lista dos sons (id, título, duração) — pequena, dá para ver antes de baixar
 *   sharedPacks/{código}/audio/{id}  o WAV de cada som em base64
 *   sharedPacks/{código}/done        true quando todos os sons subiram
 * Só quem criou o código envia os sons; depois o pack não muda (mudou o pack → código novo).
 */
const packRef = (code: string, path = '') => ref(firebase().db, `sharedPacks/${code}${path ? `/${path}` : ''}`);

export interface SharedPackInfo {
  code: string;
  packId: string;
  title: string;
  icon: string;
  sounds: CustomSound[];
  /** Todos os sons já subiram. */
  complete: boolean;
}

export class ShareError extends Error {
  constructor(public reason: 'missing' | 'incomplete' | 'unavailable') {
    super(reason);
  }
}

type Progress = (done: number, total: number) => void;

/** Envia o pack (foto dos sons de agora) e devolve o código para os amigos baixarem. */
export async function sharePack(pack: CustomPack, onProgress?: Progress): Promise<string> {
  const uid = await signIn();
  const total = pack.sounds.length;
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = packCode();
    const meta = { owner: uid, packId: pack.id, title: pack.title, icon: pack.icon, count: total, createdAt: Date.now() };
    const result = await runTransaction(packRef(code, 'meta'), (current) => (current ? undefined : meta));
    if (!result.committed) continue;
    const sounds: CustomSound[] = pack.sounds.map(({ id, title, durationMs }) => ({ id, title, durationMs }));
    await set(packRef(code, 'sounds'), sounds);
    for (const [i, sound] of sounds.entries()) {
      onProgress?.(i, total);
      await set(packRef(code, `audio/${sound.id}`), await readAudioBase64(sound.id));
    }
    await set(packRef(code, 'done'), true);
    onProgress?.(total, total);
    return code;
  }
  throw new ShareError('unavailable');
}

/** O que tem num código (sem baixar o áudio). */
export async function fetchSharedPack(code: string): Promise<SharedPackInfo> {
  await signIn();
  const [meta, sounds, done] = await Promise.all([
    get(packRef(code, 'meta')),
    get(packRef(code, 'sounds')),
    get(packRef(code, 'done')),
  ]);
  if (!meta.exists()) throw new ShareError('missing');
  const m = meta.val() as { packId: string; title: string; icon: string };
  return {
    code,
    packId: m.packId,
    title: m.title,
    icon: m.icon,
    sounds: (sounds.val() ?? []) as CustomSound[],
    complete: done.val() === true,
  };
}

/** Baixa o áudio de todos os sons e devolve o pack pronto para entrar na biblioteca do celular. */
export async function downloadSharedPack(info: SharedPackInfo, onProgress?: Progress): Promise<CustomPack> {
  if (!info.complete) throw new ShareError('incomplete');
  const total = info.sounds.length;
  for (const [i, sound] of info.sounds.entries()) {
    onProgress?.(i, total);
    const audio = await get(packRef(info.code, `audio/${sound.id}`));
    if (!audio.exists()) throw new ShareError('incomplete');
    await saveAudioBase64(sound.id, audio.val() as string);
  }
  onProgress?.(total, total);
  return {
    id: importedPackId(info.code, info.packId, useLibrary.getState().custom, () => newId('pack')),
    title: info.title,
    icon: info.icon,
    sounds: info.sounds,
    from: info.code,
    // Baixado sem mudanças: se for usado numa sala, vale o mesmo código.
    share: { code: info.code, soundIds: info.sounds.map((s) => s.id) },
  };
}
