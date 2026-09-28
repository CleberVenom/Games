import { OfficialPackId, ReferenceSound, SOUNDS } from './sounds';

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
  animais: { title: 'Animais', description: 'Latidos, miados, mugidos e rugidos', icon: 'paw' },
  vozes: { title: 'Vozes', description: 'Risadas, espirros, roncos e outros sons de gente', icon: 'happy' },
  memes: { title: 'Memes & zoeira', description: 'Trombone triste, ba dum tss, caminhão do gás…', icon: 'flame' },
  maquinas: { title: 'Máquinas & efeitos', description: 'Buzinas, sirenes, apitos e alarmes', icon: 'flash' },
};

export const OFFICIAL_PACKS: readonly Pack[] = (Object.keys(OFFICIAL) as OfficialPackId[]).map((id) => ({
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
