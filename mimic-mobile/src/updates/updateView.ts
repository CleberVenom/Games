/**
 * Aviso de versão nova (lógica pura). O estado vem do `useUpdates` do expo-updates; aqui só se decide o que
 * mostrar. Atualizações pelo EAS Update trocam o JavaScript e os sons do app sem reinstalar o APK.
 */
export type UpdateView = 'none' | 'available' | 'downloading' | 'ready' | 'error';

export interface UpdateFlags {
  isUpdateAvailable: boolean;
  isUpdatePending: boolean;
  isDownloading: boolean;
  isRestarting?: boolean;
  downloadError?: Error;
}

export function updateView(flags: UpdateFlags): UpdateView {
  if (flags.isDownloading) return 'downloading';
  if (flags.isUpdatePending || flags.isRestarting) return 'ready';
  if (flags.downloadError) return 'error';
  if (flags.isUpdateAvailable) return 'available';
  return 'none';
}

const two = (n: number) => String(n).padStart(2, '0');

/** "30/09 às 14:05", no fuso do celular. */
export function formatWhen(d: Date): string {
  return `${two(d.getDate())}/${two(d.getMonth() + 1)} às ${two(d.getHours())}:${two(d.getMinutes())}`;
}

/** Texto do rodapé: a versão do APK e, se estiver rodando uma atualização, quando ela foi publicada. */
export function versionLabel(version: string, embedded: boolean, createdAt: Date | null): string {
  if (embedded || !createdAt) return `Versão ${version}`;
  return `Versão ${version} · atualizada em ${formatWhen(createdAt)}`;
}
