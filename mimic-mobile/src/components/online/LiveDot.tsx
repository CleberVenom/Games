import { useEffect } from 'react';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { glow } from '../../theme/tokens';

/** Ponto pulsando: indica que algo está acontecendo (aguardando, ao vivo). */
export function LiveDot({ color }: { color: string }) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 800, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [pulse]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - pulse.value * 0.6,
    transform: [{ scale: 1 + pulse.value * 0.25 }],
  }));
  return (
    <Animated.View
      style={[
        { width: 10, height: 10, borderRadius: 5, backgroundColor: color, boxShadow: glow(color, 10, 0.9, 0) },
        style,
      ]}
    />
  );
}
