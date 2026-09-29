import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import type { ReactionEntry } from '../../online/api';
import { Reaction, REACTION_EMOJI, REACTIONS } from '../../online/room';
import { hapticTap } from '../haptics';
import { PressableScale } from '../PressableScale';

const LABEL: Record<Reaction, string> = { laugh: 'Risada', tomato: 'Tomate', happy: 'Feliz', scared: 'Assustado' };
const FLOAT_MS = 2200;

/** Botões de reação (risada, tomate, feliz, assustado) com a contagem de cada um. */
export function ReactionBar({
  counts,
  onReact,
  disabled = false,
}: {
  counts: Record<Reaction, number>;
  onReact: (r: Reaction) => void;
  disabled?: boolean;
}) {
  return (
    <View className="flex-row justify-between gap-3">
      {REACTIONS.map((r) => (
        <PressableScale
          key={r}
          onPress={() => {
            hapticTap();
            onReact(r);
          }}
          disabled={disabled}
          pressedScale={0.85}
          haptic={false}
          accessibilityRole="button"
          accessibilityLabel={`Reagir: ${LABEL[r]}`}
          className="h-16 flex-1 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
          <Text style={{ fontSize: 28 }}>{REACTION_EMOJI[r]}</Text>
          {counts[r] > 0 && (
            <View className="absolute -right-1.5 -top-1.5 min-w-[22px] items-center rounded-full bg-violet-500 px-1.5 py-0.5">
              <Text className="font-heading text-[11px] text-mist-50">{counts[r]}</Text>
            </View>
          )}
        </PressableScale>
      ))}
    </View>
  );
}

interface Floating {
  id: string;
  emoji: Reaction;
  x: number;
}

/** Reações chegando ao vivo: cada uma sobe e some por cima da tela (em todos os celulares). */
export function FloatingReactions({ entries }: { entries: readonly ReactionEntry[] }) {
  const seen = useRef(new Set<string>());
  const first = useRef(true);
  const [items, setItems] = useState<Floating[]>([]);

  useEffect(() => {
    const fresh = entries.filter((e) => !seen.current.has(e.id));
    fresh.forEach((e) => seen.current.add(e.id));
    // As reações que já existiam quando a tela abriu não sobem de novo.
    if (first.current) {
      first.current = false;
      return;
    }
    if (fresh.length === 0) return;
    setItems((list) => [...list, ...fresh.map((e) => ({ id: e.id, emoji: e.emoji, x: 0.1 + Math.random() * 0.8 }))]);
    const timer = setTimeout(() => setItems((list) => list.filter((i) => !fresh.some((e) => e.id === i.id))), FLOAT_MS);
    return () => clearTimeout(timer);
  }, [entries]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {items.map((i) => (
        <FloatingEmoji key={i.id} emoji={i.emoji} x={i.x} />
      ))}
    </View>
  );
}

function FloatingEmoji({ emoji, x }: { emoji: Reaction; x: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: FLOAT_MS, easing: Easing.out(Easing.quad) });
  }, [t]);
  const style = useAnimatedStyle(() => ({
    opacity: t.value < 0.7 ? 1 : 1 - (t.value - 0.7) / 0.3,
    transform: [{ translateY: -260 * t.value }, { scale: 0.6 + Math.min(t.value * 4, 1) * 0.6 }],
  }));
  return (
    <Animated.View style={[{ position: 'absolute', bottom: 120, left: `${x * 100}%` }, style]}>
      <Text style={{ fontSize: 40 }}>{REACTION_EMOJI[emoji]}</Text>
    </Animated.View>
  );
}
