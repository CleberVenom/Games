/**
 * Packs compartilhados por código (lógica pura). O pack vai para `sharedPacks/{código}` no Firebase: o dono
 * envia uma "foto" dos sons; se ele mudar o pack depois, compartilha de novo e ganha um código novo.
 */

const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sem I e O, que confundem com 1 e 0
export const PACK_CODE_LENGTH = 5;

export function packCode(rng: () => number = Math.random): string {
  return Array.from({ length: PACK_CODE_LENGTH }, () => CODE_LETTERS[Math.floor(rng() * CODE_LETTERS.length)]).join('');
}

export function normalizePackCode(text: string): string {
  return text
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, PACK_CODE_LENGTH);
}

/** O último compartilhamento de um pack: o código e quais sons foram enviados. */
export interface PackShare {
  code: string;
  soundIds: string[];
}

/** O pack mudou (sons entraram ou saíram) desde o último compartilhamento? */
export function needsReshare(pack: { sounds: { id: string }[]; share?: PackShare }): boolean {
  if (!pack.share) return true;
  const sent = new Set(pack.share.soundIds);
  return pack.sounds.length !== sent.size || pack.sounds.some((s) => !sent.has(s.id));
}

/**
 * Id do pack baixado neste celular: baixar o mesmo código de novo atualiza o download anterior, e um pack
 * criado aqui com o mesmo id (versão alterada por um amigo) nunca é sobrescrito — o baixado entra separado.
 */
export function importedPackId(
  code: string,
  packId: string,
  local: readonly { id: string; from?: string }[],
  fresh: () => string,
): string {
  const again = local.find((p) => p.from === code);
  if (again) return again.id;
  const same = local.find((p) => p.id === packId);
  return same && !same.from ? fresh() : packId;
}

/**
 * Códigos dos packs da sala que este celular ainda precisa baixar: os que têm algum som que ele não tem.
 * `lists` traz os ids dos sons de cada código (a lista é pequena; o áudio só vem se precisar).
 */
export function missingSharedPacks(
  shared: Record<string, string> | undefined,
  lists: Record<string, readonly string[]>,
  local: ReadonlySet<string>,
): string[] {
  return Object.values(shared ?? {}).filter((code) => (lists[code] ?? []).some((id) => !local.has(id)));
}
