import { fromBase64, toBase64 } from '../online/clipCodec';

/** Áudio dos sons criados no app, versão web: um WAV por som no IndexedDB do navegador. */

const DB_NAME = 'mimic-mobile';
const STORE = 'custom-sounds';

let opening: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  opening ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return opening;
}

async function run<T>(mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const store = (await db()).transaction(STORE, mode).objectStore(STORE);
  return new Promise((resolve, reject) => {
    const req = op(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveAudio(id: string, wav: Uint8Array): Promise<void> {
  await run('readwrite', (s) => s.put(wav, id));
}

/** Fonte para `decodeAudioData`: os bytes do WAV (cópia nova a cada chamada). */
export async function audioSource(id: string): Promise<ArrayBuffer> {
  const bytes = await run<Uint8Array | undefined>('readonly', (s) => s.get(id));
  if (!bytes) throw new Error(`Som não encontrado: ${id}`);
  return bytes.slice().buffer;
}

export async function deleteAudio(id: string): Promise<void> {
  await run('readwrite', (s) => s.delete(id));
}

/** O WAV de um som em base64, para compartilhar o pack com amigos. */
export async function readAudioBase64(id: string): Promise<string> {
  const bytes = await run<Uint8Array | undefined>('readonly', (s) => s.get(id));
  if (!bytes) throw new Error(`Som não encontrado: ${id}`);
  return toBase64(bytes);
}

/** Guarda um som que veio de um pack compartilhado (WAV em base64). */
export async function saveAudioBase64(id: string, base64: string): Promise<void> {
  await saveAudio(id, fromBase64(base64));
}
