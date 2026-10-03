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
const RING = SIZE + 28;
/** Segmentos do anel de contagem regressiva da gravação. */
const SEGMENTS = 40;

const seconds = (ms: number) => `${(ms / 1000).toFixed(1).replace('.', ',')} s`;

function stateUi(state: RecordState, durationMs: number): { icon: IconName; title: string; hint: string } {
  switch (state) {
    case 'locked':
      return { icon: 'ear', title: 'Ouça a referência', hint: 'O botão libera quando o som terminar' };
    case 'ready':
      return { icon: 'mic', title: 'Toque para imitar', hint: `Uma chance só: grava por ${seconds(durationMs)}` };
    case 'recording':
      return { icon: 'mic', title: 'Imite agora!', hint: `Termina sozinho em ${seconds(durationMs)}` };
    case 'busy':
      return { icon: 'hourglass', title: 'Analisando…', hint: 'Comparando com a referência' };
  }
}

interface Props {
  state: RecordState;
  onPress: () => void;
  /** Níveis de áudio: o halo pulsa com a voz durante a gravação. */
  levels: SharedValue<number[]>;
  /** Tempo da gravação (o do som original): o anel conta regressivamente. */
  durationMs: number;
}

/**
 * Botão de gravação: gradiente neon e halo que respira (pronto) ou reage à voz (gravando).
 * Gravando, não aceita toque: o anel externo se apaga até o fim do tempo do som original.
 */
export function RecordButton({ state, onPress, levels, durationMs }: Props) {
  const ui = stateUi(state, durationMs);
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
      // O halo pulsa com o volume de agora: a barra mais nova do gráfico rolando.
      const lv = levels.value;
      const now = lv.length > 0 ? lv[lv.length - 1] : 0;
      return { opacity: 0.5, transform: [{ scale: 1.08 + Math.min(Math.max(now, 0), 1) * 0.45 }] };
    }
    if (state === 'ready') {
      return { opacity: 0.4 - pulse.value * 0.25, transform: [{ scale: 1.08 + pulse.value * 0.22 }] };
    }
    return { opacity: 0, transform: [{ scale: 1 }] };
  });

  return (
    <View className="items-center gap-4">
      <View className="items-center justify-center" style={{ width: RING, height: RING }}>
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
        {state === 'recording' ? (
          <CountdownRing durationMs={durationMs} />
        ) : (
          <View
            pointerEvents="none"
            className="absolute rounded-full border border-white/10"
            style={{ width: RING, height: RING }}
          />
        )}
        <PressableScale
          onPress={onPress}
          disabled={state !== 'ready'}
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

/** Anel de segmentos em volta do botão; eles se apagam no sentido horário até o tempo acabar. */
function CountdownRing({ durationMs }: { durationMs: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: durationMs, easing: Easing.linear });
  }, [durationMs, progress]);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', width: RING, height: RING }}>
      {Array.from({ length: SEGMENTS }, (_, i) => (
        <Segment key={i} index={i} progress={progress} />
      ))}
    </View>
  );
}

function Segment({ index, progress }: { index: number; progress: SharedValue<number> }) {
  const angle = (index / SEGMENTS) * 360;
  const r = RING / 2 - 4;
  const rad = (angle * Math.PI) / 180;
  const animated = useAnimatedStyle(() => ({ opacity: progress.value <= index / SEGMENTS ? 1 : 0.14 }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: 3,
          height: 8,
          borderRadius: 2,
          left: RING / 2 + r * Math.sin(rad) - 1.5,
          top: RING / 2 - r * Math.cos(rad) - 4,
          backgroundColor: palette.pink[400],
          transform: [{ rotate: `${angle}deg` }],
        },
        animated,
      ]}
    />
  );
}
