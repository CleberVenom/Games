import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { glow, gradients, palette } from '../theme/tokens';
import { Gradient } from './Gradient';
import { Icon, IconName } from './Icon';
import { PressableScale } from './PressableScale';

export type RecordState = 'locked' | 'ready' | 'recording' | 'busy';

const SIZE = 104;

const STATE_UI: Record<RecordState, { icon: IconName; title: string; hint: string }> = {
  locked: { icon: 'ear', title: 'Ouça a referência', hint: 'O botão libera quando o som terminar' },
  ready: { icon: 'mic', title: 'Toque para imitar', hint: 'Uma chance só — sem repetir' },
  recording: { icon: 'stop', title: 'Toque para parar', hint: 'Imite agora!' },
  busy: { icon: 'hourglass', title: 'Analisando…', hint: 'Comparando com a referência' },
};

interface Props {
  state: RecordState;
  onPress: () => void;
  /** Níveis de áudio: o halo pulsa com a voz durante a gravação. */
  levels: SharedValue<number[]>;
}

/** Botão de gravação: gradiente neon, anel externo e halo que respira (pronto) ou reage à voz (gravando). */
export function RecordButton({ state, onPress, levels }: Props) {
  const ui = STATE_UI[state];
  const active = state === 'ready' || state === 'recording';
  const colors = state === 'recording' ? gradients.record : gradients.primary;
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value =
      state === 'ready'
        ? withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }), -1, true)
        : withTiming(0, { duration: 200 });
  }, [state, pulse]);

  const halo = useAnimatedStyle(() => {
    if (state === 'recording') {
      const lv = levels.value;
      let sum = 0;
      for (let i = 0; i < lv.length; i++) sum += lv[i];
      return { opacity: 0.5, transform: [{ scale: 1.08 + Math.min(sum / lv.length, 1) * 0.45 }] };
    }
    if (state === 'ready') {
      return { opacity: 0.4 - pulse.value * 0.25, transform: [{ scale: 1.08 + pulse.value * 0.22 }] };
    }
    return { opacity: 0, transform: [{ scale: 1 }] };
  });

  return (
    <View className="items-center gap-4">
      <View className="items-center justify-center" style={{ width: SIZE + 28, height: SIZE + 28 }}>
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              width: SIZE,
              height: SIZE,
              borderRadius: SIZE / 2,
              backgroundColor: colors[0],
            },
            halo,
          ]}
        />
        <View
          pointerEvents="none"
          className="absolute rounded-full border border-white/10"
          style={{ width: SIZE + 28, height: SIZE + 28 }}
        />
        <PressableScale
          onPress={onPress}
          disabled={!active}
          pressedScale={0.9}
          haptic={false}
          accessibilityRole="button"
          accessibilityLabel={ui.title}
          style={{
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            boxShadow: active ? glow(colors[0], 36, 0.55, 12) : undefined,
          }}>
          {active ? (
            <Gradient
              colors={colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="flex-1 items-center justify-center overflow-hidden rounded-full">
              <Icon name={ui.icon} size={40} color={palette.mist[50]} />
            </Gradient>
          ) : (
            <View className="flex-1 items-center justify-center rounded-full border border-white/10 bg-night-700">
              <Icon name={ui.icon} size={34} color={palette.mist[400]} />
            </View>
          )}
        </PressableScale>
      </View>
      <View className="items-center gap-1">
        <Text className="font-heading text-lg text-mist-50">{ui.title}</Text>
        <Text className="font-body text-sm text-mist-400">{ui.hint}</Text>
      </View>
    </View>
  );
}
