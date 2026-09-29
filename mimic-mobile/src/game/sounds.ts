import manifest from '../../assets/sounds/manifest.json';

/** Packs oficiais: sons livres (CC0/domínio público) que vêm com o app. */
export const OFFICIAL_PACK_IDS = ['animais', 'vozes', 'memes', 'maquinas', 'games', 'casa', 'natureza'] as const;
export type OfficialPackId = (typeof OFFICIAL_PACK_IDS)[number];

export interface ReferenceSound {
  id: string;
  title: string;
  /** Pack de origem (oficial, pessoal ou criado no app). */
  pack: string;
  /** Duração do arquivo de referência. */
  durationMs: number;
}

const ENTRIES: Record<string, { durationMs: number; title: string; pack: string }> = manifest;

/**
 * Sons oficiais, na ordem de assets/sounds/manifest.json — título, pack e duração vêm de
 * scripts/build-sounds.py (arquivos, créditos e licenças em assets/sounds, ver CREDITS.md).
 */
export const SOUNDS: readonly (ReferenceSound & { pack: OfficialPackId })[] = Object.entries(ENTRIES).map(
  ([id, entry]) => {
    if (!(OFFICIAL_PACK_IDS as readonly string[]).includes(entry.pack)) {
      throw new Error(`Pack desconhecido no manifest: ${entry.pack} (${id})`);
    }
    return { id, title: entry.title, pack: entry.pack as OfficialPackId, durationMs: entry.durationMs };
  },
);
