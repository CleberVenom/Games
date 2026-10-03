import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { ModifierId, MODIFIERS } from '../game/modifiers';
import { glow, gradients, palette } from '../theme/tokens';
import { Gradient } from './Gradient';
import { hapticTap } from './haptics';
import { Icon } from './Icon';
import { KIND_STYLE, MODIFIER_ICON } from './ModifierBadge';

const SIZE = 288;
const R = SIZE / 2;
const RIM = 10;
const STEP = 360 / MODIFIERS.length;
const POINTER = 22;
const SPIN_MS = 4200;

const rad = (deg: number) => (deg * Math.PI) / 180;
const at = (deg: number, r: number) => [R + r * Math.sin(rad(deg)), R - r * Math.cos(rad(deg))] as const;

/** Fatia `i`, centrada em i·STEP graus (0 = topo, sentido horário). */
function wedge(i: number): string {
  const r = R - RIM;
  const [x0, y0] = at((i - 0.5) * STEP, r);
  const [x1, y1] = at((i + 0.5) * STEP, r);
  return `M ${R} ${R} L ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1} Z`;
}

interface Props {
  /** Casa sorteada (a regra já decidiu; a roleta só mostra). */
  target: ModifierId;
  onStop: () => void;
}

/**
 * Roleta em SVG: gira 5 voltas desacelerando até a casa sorteada parar sob o ponteiro, com um toque
 * háptico a cada casa que passa.
 */
export function Wheel({ target, onStop }: Props) {
  const rotation = useSharedValue(0);
  const onStopRef = useRef(onStop);
  useEffect(() => {
    onStopRef.current = onStop;
  });

  useEffect(() => {
    const index = MODIFIERS.findIndex((m) => m.id === target);
    const jitter = (Math.random() - 0.5) * STEP * 0.6;
    const finish = () => onStopRef.current();
    rotation.value = withTiming(
      360 * 5 + (360 - index * STEP) + jitter,
      { duration: SPIN_MS, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) scheduleOnRN(finish);
      },
    );
  }, [target, rotation]);

  useAnimatedReaction(
    () => Math.floor((rotation.value + STEP / 2) / STEP),
    (slot, previous) => {
      if (previous !== null && slot !== previous) scheduleOnRN(hapticTap);
    },
  );

  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  return (
    <View style={{ width: SIZE, height: SIZE + POINTER / 2 }} accessibilityLabel="Roleta de efeitos">
      <View
        style={{
          position: 'absolute',
          top: POINTER / 2,
          width: SIZE,
          height: SIZE,
          borderRadius: R,
          boxShadow: glow(palette.fuchsia[500], 60, 0.4, 0),
        }}>
        <Animated.View style={[{ width: SIZE, height: SIZE }, spin]}>
          <Svg width={SIZE} height={SIZE}>
            <Defs>
              {Object.entries(KIND_STYLE).map(([kind, s]) => (
                <LinearGradient key={kind} id={`kind-${kind}`} x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={s.colors[0]} />
                  <Stop offset="1" stopColor={s.colors[1]} />
                </LinearGradient>
              ))}
            </Defs>
            <Circle cx={R} cy={R} r={R - 2} fill={palette.night[850]} stroke={palette.night[600]} strokeWidth={3} />
            {MODIFIERS.map((m, i) => (
              <Path key={m.id} d={wedge(i)} fill={`url(#kind-${m.kind})`} stroke={palette.night[950]} strokeWidth={2} />
            ))}
            {MODIFIERS.map((m, i) => {
              const [x, y] = at((i + 0.5) * STEP, R - RIM / 2);
              return <Circle key={m.id} cx={x} cy={y} r={3} fill={palette.mist[50]} opacity={0.9} />;
            })}
          </Svg>
          {MODIFIERS.map((m, i) => {
            const [x, y] = at(i * STEP, R * 0.64);
            return (
              <View
                key={m.id}
                style={{
                  position: 'absolute',
                  left: x - 16,
                  top: y - 16,
                  width: 32,
                  height: 32,
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: [{ rotate: `${i * STEP}deg` }],
                }}>
                <Icon name={MODIFIER_ICON[m.id]} size={24} color={palette.mist[50]} />
              </View>
            );
          })}
        </Animated.View>

        <View pointerEvents="none" style={{ position: 'absolute', left: R - 34, top: R - 34 }}>
          <Gradient
            colors={gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="h-[68px] w-[68px] items-center justify-center overflow-hidden rounded-full border-4 border-night-900">
            <Icon name="sparkles" size={26} color={palette.mist[50]} />
          </Gradient>
        </View>
      </View>

      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: R - POINTER / 2 - 2 }}>
        <Svg width={POINTER + 4} height={POINTER + 6}>
          <Path
            d={`M 2 2 L ${POINTER + 2} 2 L ${POINTER / 2 + 2} ${POINTER + 4} Z`}
            fill={palette.mist[50]}
            stroke={palette.night[950]}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </Svg>
      </View>
    </View>
  );
}
