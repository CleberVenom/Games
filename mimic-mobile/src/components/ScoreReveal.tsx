import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { getModifier, ModifierId } from '../game/modifiers';
import type { TurnScore } from '../game/types';
import { glow, gradients, palette, withAlpha } from '../theme/tokens';
import { Gradient } from './Gradient';
import { Icon, IconName } from './Icon';
import { KIND_STYLE, MODIFIER_ICON } from './ModifierBadge';

function verdict(total: number): { label: string; color: string } {
  if (total >= 90) return { label: 'Lendário!', color: palette.mint[400] };
  if (total >= 75) return { label: 'Mandou muito bem', color: palette.cyan[400] };
  if (total >= 50) return { label: 'Quase lá', color: palette.violet[300] };
  if (total >= 25) return { label: 'Criativo, no mínimo', color: palette.amber[400] };
  return { label: 'Isso foi um som?', color: palette.coral[400] };
}

/** Número que sobe de 0 até `target` com desaceleração. */
function useCountUp(target: number, durationMs: number): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const t0 = Date.now();
    let raf = 0;
    const tick = () => {
      const p = Math.min(1, (Date.now() - t0) / durationMs);
      setValue(Math.round(target * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
}

interface Props {
  score: TurnScore;
  /** Pontos que entraram no placar (a nota com o bônus da roleta). */
  points: number;
  modifier: ModifierId | null;
  playerName: string;
}

export function ScoreReveal({ score, points, modifier, playerName }: Props) {
  const bonus = modifier && getModifier(modifier).kind === 'bonus' ? getModifier(modifier) : null;
  const shown = useCountUp(score.total, 900);
  const v = verdict(score.total);
  return (
    <View
      className="gap-4 rounded-4xl border border-white/5 bg-night-800/80 p-5"
      style={{ boxShadow: glow(v.color, 40, 0.25, 8) }}>
      <View className="flex-row items-end justify-between">
        <View className="flex-1 gap-1">
          <Text className="font-label text-[11px] uppercase tracking-[2px] text-mist-400" numberOfLines={1}>
            Nota de {playerName}
          </Text>
          <Text className="font-heading text-xl" style={{ color: v.color }}>
            {v.label}
          </Text>
        </View>
        <Text
          className="font-display text-6xl text-mist-50"
          style={{ textShadowColor: v.color, textShadowRadius: 18, textShadowOffset: { width: 0, height: 0 } }}>
          {shown}
        </Text>
      </View>
      <ScoreBar icon="musical-notes" label="Tom" value={score.pitch} colors={gradients.listen} delay={150} />
      <ScoreBar icon="pulse" label="Ritmo" value={score.rhythm} colors={gradients.primary} delay={300} />
      {bonus && (
        <View
          className="flex-row items-center gap-2 rounded-2xl px-3 py-2.5"
          style={{ backgroundColor: withAlpha(KIND_STYLE.bonus.accent, 0.12) }}>
          <Icon name={MODIFIER_ICON[bonus.id]} size={16} color={KIND_STYLE.bonus.accent} />
          <Text className="flex-1 font-label text-sm" style={{ color: KIND_STYLE.bonus.accent }}>
            {bonus.title}
          </Text>
          <Text className="font-heading text-base text-mist-50">
            {points > 0 ? `+${points} no placar` : 'sem som, sem bônus'}
          </Text>
        </View>
      )}
    </View>
  );
}

interface BarProps {
  icon: IconName;
  label: string;
  value: number;
  colors: readonly [string, string, ...string[]];
  delay: number;
}

function ScoreBar({ icon, label, value, colors, delay }: BarProps) {
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = withDelay(delay, withTiming(value / 100, { duration: 800, easing: Easing.out(Easing.cubic) }));
  }, [value, delay, fill]);
  const animated = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <Icon name={icon} size={14} color={palette.mist[400]} />
          <Text className="font-ui text-sm text-mist-200">{label}</Text>
        </View>
        <Text className="font-label text-sm text-mist-50">{value}</Text>
      </View>
      <View className="h-2 overflow-hidden rounded-full bg-white/10">
        <Animated.View style={[{ height: '100%', borderRadius: 999, overflow: 'hidden' }, animated]}>
          <Gradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} className="flex-1" />
        </Animated.View>
      </View>
    </View>
  );
}
