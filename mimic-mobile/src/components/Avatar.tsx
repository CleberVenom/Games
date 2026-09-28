import { Text, View } from 'react-native';

import type { PlayerColor } from '../game/types';
import { glow, PLAYER_HEX, withAlpha } from '../theme/tokens';

interface Props {
  label: string;
  color: PlayerColor;
  size?: number;
  /** Brilho na cor do jogador (jogador da vez). */
  active?: boolean;
}

export function Avatar({ label, color, size = 40, active = false }: Props) {
  const hex = PLAYER_HEX[color];
  return (
    <View
      className="items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: hex,
        backgroundColor: withAlpha(hex, 0.16),
        boxShadow: active ? glow(hex, size / 2, 0.55, 0) : undefined,
      }}>
      <Text className="font-display" style={{ color: hex, fontSize: size * 0.42 }}>
        {label.trim().charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}
