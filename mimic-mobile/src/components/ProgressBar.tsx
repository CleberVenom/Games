import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { gradients } from '../theme/tokens';
import { Gradient } from './Gradient';

/** Barra de andamento (envio/download de sons), com o preenchimento deslizando a cada passo. */
export function ProgressBar({ value }: { value: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(Math.min(1, Math.max(0, value)), { duration: 300 });
  }, [progress, value]);
  const fill = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  return (
    <View className="h-2 overflow-hidden rounded-full bg-white/10">
      <Animated.View style={[{ height: '100%', borderRadius: 999, overflow: 'hidden' }, fill]}>
        <Gradient colors={gradients.listen} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
      </Animated.View>
    </View>
  );
}
