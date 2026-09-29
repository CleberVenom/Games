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
  animais: { title: 'Animais', description: 'Latidos, miados, zurros e uivos', icon: 'paw' },
  vozes: { title: 'Vozes', description: 'Risadas, arrotos, roncos e outros sons de gente', icon: 'happy' },
  memes: { title: 'Memes & zoeira', description: 'Trombone triste, caminhão do gás, internet discada…', icon: 'flame' },
  maquinas: { title: 'Máquinas & efeitos', description: 'Buzinas, sirenes, motores e ferramentas', icon: 'flash' },
  games: { title: 'Games & 8-bit', description: 'Narrador de luta, moedinhas, power-up e fliperama', icon: 'game-controller' },
  casa: { title: 'Casa & cotidiano', description: 'Panela de pressão, campainha, zíper e liquidificador', icon: 'home' },
  natureza: { title: 'Natureza & clima', description: 'Chuva, trovão, arara, bugio e cigarra', icon: 'leaf' },
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
