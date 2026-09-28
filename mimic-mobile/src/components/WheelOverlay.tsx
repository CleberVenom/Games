import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';

import { getModifier, ModifierId } from '../game/modifiers';
import type { Player } from '../game/types';
import { PLAYER_HEX } from '../theme/tokens';
import { Backdrop } from './Backdrop';
import { GradientButton } from './Buttons';
import { hapticResult } from './haptics';
import { ModifierCard } from './ModifierBadge';
import { Wheel } from './Wheel';

interface Props {
  /** Casa já sorteada pela regra (a roleta anima até ela). */
  modifier: ModifierId;
  nextPlayer: Player;
  insets: { top: number; bottom: number };
  onNext: () => void;
}

/** Tela da roleta: gira, revela o efeito do próximo turno e passa a vez. */
export function WheelOverlay({ modifier, nextPlayer, insets, onNext }: Props) {
  const [stopped, setStopped] = useState(false);
  const m = getModifier(modifier);

  return (
    <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(200)} style={StyleSheet.absoluteFill}>
      <Backdrop />
      <View className="flex-1 px-6" style={{ paddingTop: insets.top + 28, paddingBottom: insets.bottom + 24 }}>
        <View className="items-center gap-1">
          <Text className="font-label text-xs uppercase tracking-[3px] text-mist-400">Roleta</Text>
          <Text className="text-center font-heading text-xl text-mist-50">
            Efeito para a vez de{' '}
            <Text style={{ color: PLAYER_HEX[nextPlayer.color] }}>{nextPlayer.name}</Text>
          </Text>
        </View>

        <View className="flex-1 items-center justify-center">
          <Wheel
            target={modifier}
            onStop={() => {
              hapticResult(m.kind === 'bonus' || m.kind === 'neutral');
              setStopped(true);
            }}
          />
        </View>

        <View className="min-h-[190px] justify-end">
          {stopped ? (
            <Animated.View entering={FadeInDown.duration(350)} style={{ gap: 16 }}>
              <ModifierCard modifier={m} />
              <GradientButton label={`Próximo: ${nextPlayer.name}`} icon="arrow-forward" onPress={onNext} />
            </Animated.View>
          ) : (
            <Text className="pb-6 text-center font-ui text-sm text-mist-400">Girando…</Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
}
