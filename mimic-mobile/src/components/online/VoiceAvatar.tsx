import { View } from 'react-native';

import type { AvatarId } from '../../game/types';
import { glow, palette } from '../../theme/tokens';
import { Avatar } from '../Avatar';
import { Icon } from '../Icon';

interface Props {
  avatar: AvatarId;
  size: number;
  active?: boolean;
  /** Anel verde enquanto a pessoa fala no chat de voz. */
  speaking?: boolean;
  /** Selo de microfone mudo. */
  muted?: boolean;
}

/** Avatar com os sinais do chat de voz: anel de quem está falando e selo de mudo. */
export function VoiceAvatar({ avatar, size, active, speaking = false, muted = false }: Props) {
  const ring = size / 2 + 4;
  return (
    <View style={{ width: size, height: size }}>
      {speaking && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -4,
            left: -4,
            right: -4,
            bottom: -4,
            borderRadius: ring,
            borderWidth: 2,
            borderColor: palette.mint[400],
            boxShadow: glow(palette.mint[400], 14, 0.7, 0),
          }}
        />
      )}
      <Avatar avatar={avatar} size={size} active={active} />
      {muted && (
        <View
          pointerEvents="none"
          className="absolute -bottom-1 -right-1 h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-night-950">
          <Icon name="mic-off" size={11} color={palette.mist[400]} />
        </View>
      )}
    </View>
  );
}
