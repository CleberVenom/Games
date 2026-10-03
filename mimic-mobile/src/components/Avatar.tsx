import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { AVATAR_ART } from '../avatars/art';
import { AVATARS } from '../avatars/avatars';
import type { AvatarId } from '../game/types';
import { glow, withAlpha } from '../theme/tokens';

interface Props {
  avatar: AvatarId;
  size?: number;
  /** Brilho na cor do mascote (jogador da vez). */
  active?: boolean;
}

/** O mascote do jogador dentro de um anel na cor dele (a forma identifica; a cor é só reforço). */
export function Avatar({ avatar, size = 40, active = false }: Props) {
  const { tint, name } = AVATARS[avatar];
  const inner = Math.round(size * 0.84);
  return (
    <View
      accessibilityLabel={name}
      className="items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: tint,
        backgroundColor: withAlpha(tint, 0.2),
        boxShadow: active ? glow(tint, size / 2, 0.55, 0) : undefined,
      }}>
      <SvgXml xml={AVATAR_ART[avatar]} width={inner} height={inner} />
    </View>
  );
}
