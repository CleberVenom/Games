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
