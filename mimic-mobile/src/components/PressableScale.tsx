import { cssInterop } from 'nativewind';
import { ReactNode } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { hapticTap } from './haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SPRING = { damping: 14, stiffness: 280, mass: 0.6 };

interface Props extends Omit<PressableProps, 'style' | 'children'> {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
  /** Escala enquanto o dedo está no botão. */
  pressedScale?: number;
  haptic?: boolean;
}

/**
 * Base de todos os botões: encolhe com mola ao toque (feedback imediato), cresce levemente no
 * hover (mouse, na web) e dispara um toque háptico.
 */
export function PressableScale({
  children,
  style,
  pressedScale = 0.95,
  haptic = true,
  onPress,
  onPressIn,
  onPressOut,
  onHoverIn,
  onHoverOut,
  ...rest
}: Props) {
  const pressed = useSharedValue(false);
  const hovered = useSharedValue(false);
  const animated = useAnimatedStyle(() => ({
    transform: [
      { scale: withSpring(pressed.value ? pressedScale : hovered.value ? 1.03 : 1, SPRING) },
    ],
  }));

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        pressed.value = true;
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.value = false;
        onPressOut?.(e);
      }}
      onHoverIn={(e) => {
        hovered.value = true;
        onHoverIn?.(e);
      }}
      onHoverOut={(e) => {
        hovered.value = false;
        onHoverOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) hapticTap();
        onPress?.(e);
      }}
      style={[style, animated]}>
      {children}
    </AnimatedPressable>
  );
}

cssInterop(PressableScale, { className: 'style' });
