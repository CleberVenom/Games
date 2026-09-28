import { useEffect } from 'react';
import { View } from 'react-native';
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

const BARS = [14, 26, 38, 24, 12];

/** Marca do app: ondas sonoras em gradiente neon, balançando devagar. */
export function LogoMark() {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [t]);

  return (
    <View style={{ borderRadius: 28, boxShadow: glow(gradients.primary[0], 44, 0.55, 14) }}>
      <Gradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="h-20 w-20 flex-row items-center justify-center gap-1 overflow-hidden rounded-[28px]">
        {BARS.map((h, i) => (
          <LogoBar key={i} height={h} index={i} t={t} />
        ))}
      </Gradient>
    </View>
  );
}

function LogoBar({ height, index, t }: { height: number; index: number; t: SharedValue<number> }) {
  const animated = useAnimatedStyle(() => ({
    transform: [{ scaleY: 0.6 + 0.4 * Math.abs(Math.sin((t.value + index * 0.2) * Math.PI)) }],
  }));
  return (
    <Animated.View
      style={[{ width: 5, height, borderRadius: 3, backgroundColor: palette.mist[50] }, animated]}
    />
  );
}
