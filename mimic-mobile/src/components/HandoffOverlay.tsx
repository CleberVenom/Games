import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';

import { REPLAYS_PER_TURN } from '../game/match';
import type { Player } from '../game/types';
import { palette, PLAYER_HEX } from '../theme/tokens';
import { Avatar } from './Avatar';
import { Backdrop } from './Backdrop';
import { GradientButton } from './Buttons';
import { Icon, IconName } from './Icon';
import { PressableScale } from './PressableScale';

interface Props {
  player: Player;
  round: number;
  insets: { top: number; bottom: number };
  onReady: () => void;
  onExit: () => void;
}

/** Tela de "passe o celular": o som só toca quando o próximo jogador confirma que está pronto. */
export function HandoffOverlay({ player, round, insets, onReady, onExit }: Props) {
  const hex = PLAYER_HEX[player.color];
  return (
    <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(200)} style={StyleSheet.absoluteFill}>
      <Backdrop />
      <View className="flex-1 px-6" style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }}>
        <PressableScale
          onPress={onExit}
          accessibilityRole="button"
          accessibilityLabel="Sair da partida"
          className="h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
          <Icon name="close" size={20} color={palette.mist[200]} />
        </PressableScale>
        <View className="flex-1 items-center justify-center gap-8">
          <Animated.View entering={FadeInDown.duration(400).springify()} style={{ alignItems: 'center', gap: 16 }}>
            <Avatar label={player.name} color={player.color} size={96} active />
            <View className="items-center gap-1">
              <Text className="font-label text-xs uppercase tracking-[3px] text-mist-400">Rodada {round}</Text>
              <Text className="font-ui text-base text-mist-200">Passe o celular para</Text>
              <Text className="text-center font-display text-5xl" style={{ color: hex }} numberOfLines={1} adjustsFontSizeToFit>
                {player.name}
              </Text>
            </View>
          </Animated.View>

          <View className="w-full gap-3 rounded-3xl border border-white/5 bg-white/5 p-5">
            <Rule icon="ear" text="O som toca sozinho, uma vez" />
            <Rule
              icon="repeat"
              text={`Você pode ouvir de novo ${REPLAYS_PER_TURN === 1 ? '1 vez' : `${REPLAYS_PER_TURN} vezes`}`}
            />
            <Rule icon="mic" text="A imitação tem uma chance só" />
          </View>
        </View>

        <GradientButton label="Estou pronto" icon="play" onPress={onReady} />
      </View>
    </Animated.View>
  );
}

function Rule({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-8 w-8 items-center justify-center rounded-xl bg-white/5">
        <Icon name={icon} size={16} color={palette.violet[300]} />
      </View>
      <Text className="flex-1 font-ui text-sm text-mist-200">{text}</Text>
    </View>
  );
}
