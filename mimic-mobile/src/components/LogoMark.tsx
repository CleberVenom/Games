import { useEffect } from 'react';
import { Image } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { glow, gradients } from '../theme/tokens';

const SIZE = 104;
/** Mesma proporção dos cantos de logo.png (scripts/make-icons.py). */
const RADIUS = SIZE * 0.22;

/** Marca do app: o gato no microfone (a mesma arte do ícone), balançando devagar como num show. */
export function LogoMark() {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [t]);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.03 * t.value }, { rotate: `${-1.5 + 3 * t.value}deg` }],
  }));

  return (
    <Animated.View
      style={[{ width: SIZE, height: SIZE, borderRadius: RADIUS, boxShadow: glow(gradients.primary[0], 44, 0.55, 14) }, animated]}>
      <Image
        source={require('../../assets/images/logo.png')}
        accessibilityLabel="Imitashow"
        style={{ width: SIZE, height: SIZE }}
      />
    </Animated.View>
  );
}
