import { OFFICIAL_PACK_IDS, OfficialPackId, ReferenceSound, SOUNDS } from './sounds';

/** De onde vem o pack: incluso no app, da pasta packs-pessoais/ do repositório ou criado no celular. */
export type PackSource = 'official' | 'personal' | 'custom';

export interface Pack {
  id: string;
  title: string;
  description: string;
  /** Nome de ícone do Ionicons. */
  icon: string;
  source: PackSource;
  sounds: ReferenceSound[];
}

const OFFICIAL: Record<OfficialPackId, Omit<Pack, 'id' | 'source' | 'sounds'>> = {
  animais: { title: 'Animais & natureza', description: 'Latidos, rugidos, uivos, arara, trovão e ondas', icon: 'paw' },
  vozes: { title: 'Vozes & zoeira', description: 'Risadas, arrotos, trombone triste, caminhão do gás…', icon: 'happy' },
  maquinas: {
    title: 'Efeitos & games',
    description: 'Sirenes, motores, campainha, moedinhas e narrador de luta',
    icon: 'game-controller',
  },
};

export const OFFICIAL_PACKS: readonly Pack[] = OFFICIAL_PACK_IDS.map((id) => ({
  id,
  source: 'official',
  ...OFFICIAL[id],
  sounds: SOUNDS.filter((s) => s.pack === id),
}));

/** Sons sorteáveis na partida: todos os sons dos packs escolhidos, sem repetir. */
export function poolFrom(packs: readonly Pack[], selected: ReadonlySet<string>): string[] {
  const ids = packs.filter((p) => selected.has(p.id)).flatMap((p) => p.sounds.map((s) => s.id));
  return [...new Set(ids)];
}
