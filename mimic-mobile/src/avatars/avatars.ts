import { AVATAR_IDS, AvatarId, PlayerColor } from '../game/types';
import { avatarTints } from '../theme/palette';

export interface AvatarInfo {
  id: AvatarId;
  name: string;
  /** Cor do anel e do fundo. */
  tint: string;
  /** Cor antiga equivalente, gravada na sala para celulares que ainda não têm os mascotes. */
  color: PlayerColor;
}

const NAMES: Record<AvatarId, [string, PlayerColor]> = {
  polvo: ['Polvo de fones', 'coral'],
  gato: ['Gato cantor', 'orange'],
  pintinho: ['Pintinho de festa', 'amber'],
  sapo: ['Sapo rei', 'lime'],
  estegossauro: ['Estegossauro de óculos', 'mint'],
  tubarao: ['Tubarão de boné', 'cyan'],
  robo: ['Robô de gravata', 'sky'],
  fantasma: ['Fantasma zoeiro', 'violet'],
  monstro: ['Monstrinho de um olho', 'orchid'],
  disfarce: ['Disfarce de bigode', 'pink'],
  abacaxi: ['Abacaxi de óculos', 'amber'],
  alien: ['Alien de antena', 'lime'],
  caveira: ['Caveira pirata', 'sky'],
  coruja: ['Coruja nerd', 'orange'],
  unicornio: ['Unicórnio festeiro', 'pink'],
};

export const AVATARS = Object.fromEntries(
  AVATAR_IDS.map((id) => [id, { id, name: NAMES[id][0], tint: avatarTints[id], color: NAMES[id][1] }]),
) as Record<AvatarId, AvatarInfo>;

/** Todos os mascotes, na ordem do carrossel. */
export const AVATAR_LIST: AvatarInfo[] = AVATAR_IDS.map((id) => AVATARS[id]);

/** Os 10 mascotes originais, um para cada cor antiga. */
const FOR_COLOR = Object.fromEntries(
  AVATAR_IDS.slice(0, 10).map((id) => [AVATARS[id].color, id]),
) as Record<PlayerColor, AvatarId>;

export function isAvatarId(value: unknown): value is AvatarId {
  return typeof value === 'string' && (AVATAR_IDS as readonly string[]).includes(value);
}

/** Mascote de um jogador de sala: o que ele escolheu ou, em salas de versões antigas (só com cor), o da cor. */
export function avatarOf(player: { avatar?: string; color?: PlayerColor }): AvatarId {
  if (isAvatarId(player.avatar)) return player.avatar;
  return (player.color && FOR_COLOR[player.color]) || AVATAR_IDS[0];
}

/** Mascotes que ainda ninguém escolheu, na ordem do carrossel. */
export function freeAvatars(taken: Iterable<AvatarId>): AvatarId[] {
  const used = new Set(taken);
  return AVATAR_IDS.filter((id) => !used.has(id));
}

/** Sorteia um mascote livre (quem entra sem escolher ganha um e troca depois, se quiser). */
export function randomFreeAvatar(taken: Iterable<AvatarId>, rng: () => number = Math.random): AvatarId | null {
  const free = freeAvatars(taken);
  return free.length > 0 ? free[Math.floor(rng() * free.length)] : null;
}
