export type ModifierKind = 'bonus' | 'sound' | 'rule' | 'neutral';

/** Sabotagens que mudam só como a referência toca (a nota continua comparando com o som limpo). */
export type SoundEffect = 'echo' | 'distortion' | 'fast' | 'telephone';

export type ModifierId = 'double' | 'plus15' | SoundEffect | 'noReplay' | 'shortTime' | 'nothing';

export interface Modifier {
  id: ModifierId;
  kind: ModifierKind;
  title: string;
  /** Como o efeito aparece para quem vai jogar. */
  description: string;
}

/** Casas da roleta, na ordem em que aparecem (sentido horário a partir do topo). */
export const MODIFIERS: readonly Modifier[] = [
  { id: 'double', kind: 'bonus', title: 'Pontos em dobro', description: 'A nota desta vez vale o dobro.' },
  { id: 'echo', kind: 'sound', title: 'Eco', description: 'O som de referência toca com eco.' },
  { id: 'noReplay', kind: 'rule', title: 'Sem repetição', description: 'Não dá para ouvir a referência de novo.' },
  { id: 'distortion', kind: 'sound', title: 'Distorção', description: 'O som de referência toca distorcido.' },
  { id: 'nothing', kind: 'neutral', title: 'Nada acontece', description: 'Turno normal. Respira.' },
  { id: 'fast', kind: 'sound', title: 'Acelerado', description: 'O som de referência toca rápido e mais agudo.' },
  { id: 'plus15', kind: 'bonus', title: '+15 pontos', description: 'Ganha 15 pontos extras se fizer algum som.' },
  { id: 'telephone', kind: 'sound', title: 'Telefone', description: 'O som de referência toca abafado, como numa ligação.' },
  { id: 'shortTime', kind: 'rule', title: 'Tempo curto', description: 'A gravação acaba bem mais cedo.' },
];

export function getModifier(id: ModifierId): Modifier {
  return MODIFIERS.find((m) => m.id === id)!;
}

export function soundEffectOf(id: ModifierId | null): SoundEffect | null {
  return id !== null && getModifier(id).kind === 'sound' ? (id as SoundEffect) : null;
}

/** Pontos que entram no placar para uma nota, com o modificador do turno. */
export function pointsFor(total: number, modifier: ModifierId | null): number {
  if (modifier === 'double') return total * 2;
  if (modifier === 'plus15') return total > 0 ? total + 15 : 0;
  return total;
}
