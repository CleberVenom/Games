// Gerado por scripts/build-sounds.py — não edite à mão.
// Packs da pasta packs-pessoais/ (uso privado do grupo; veja packs-pessoais/README.md).

export interface PersonalPack {
  id: string;
  title: string;
  description: string;
  icon: string;
  sounds: { id: string; title: string; durationMs: number; file: number }[];
}

export const PERSONAL_PACKS: PersonalPack[] = [];
