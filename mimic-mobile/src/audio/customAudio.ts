import { Directory, File, Paths } from 'expo-file-system';

/** Áudio dos sons criados no app: um WAV por som em `documentos/custom-sounds/` (não é apagado pelo sistema). */
function folder(): Directory {
  const dir = new Directory(Paths.document, 'custom-sounds');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

export async function saveAudio(id: string, wav: Uint8Array): Promise<void> {
  const file = new File(folder(), `${id}.wav`);
  if (file.exists) file.delete();
  file.create();
  file.write(wav);
}

/** Fonte para `decodeAudioData`: o caminho do arquivo. */
export async function audioSource(id: string): Promise<string> {
  return new File(folder(), `${id}.wav`).uri;
}

export async function deleteAudio(id: string): Promise<void> {
  const file = new File(folder(), `${id}.wav`);
  if (file.exists) file.delete();
}

/** O WAV de um som em base64, para compartilhar o pack com amigos. */
export async function readAudioBase64(id: string): Promise<string> {
  return new File(folder(), `${id}.wav`).base64();
}

/** Guarda um som que veio de um pack compartilhado (WAV em base64). */
export async function saveAudioBase64(id: string, base64: string): Promise<void> {
  const file = new File(folder(), `${id}.wav`);
  if (file.exists) file.delete();
  file.create();
  file.write(base64, { encoding: 'base64' });
}
