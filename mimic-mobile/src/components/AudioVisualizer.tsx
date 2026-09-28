import { useEffect, useMemo } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import type { VisualizerMode } from '../audio/useVisualizerLevels';
import type { Phase } from '../game/types';
import { glow, gradients, palette, sampleGradient } from '../theme/tokens';
import { Gradient } from './Gradient';

export const BAR_COUNT = 32;

const MODE_STOPS: Record<VisualizerMode, readonly string[]> = {
  idle: [palette.violet[600], palette.violet[400], palette.cyan[500]],
  reference: [palette.cyan[400], palette.violet[400], palette.cyan[400]],
  recording: [palette.pink[400], palette.violet[500], palette.pink[400]],
  analyzing: [palette.violet[400], palette.cyan[300], palette.violet[400]],
};

const PHASE_UI: Record<Phase, { mode: VisualizerMode; label: string; accent: string; live: boolean }> = {
  handoff: { mode: 'idle', label: 'Aguardando o jogador', accent: palette.violet[500], live: false },
  listening: { mode: 'reference', label: 'Ouça com atenção', accent: palette.cyan[400], live: true },
  ready: { mode: 'idle', label: 'Sua vez de imitar', accent: palette.violet[400], live: false },
  recording: { mode: 'recording', label: 'Gravando', accent: palette.pink[400], live: true },
  analyzing: { mode: 'analyzing', label: 'Analisando tom e ritmo', accent: palette.violet[400], live: true },
  result: { mode: 'idle', label: 'Imitação avaliada', accent: palette.mint[400], live: false },
};

export function visualizerMode(phase: Phase): VisualizerMode {
  return PHASE_UI[phase].mode;
}

interface Props {
  phase: Phase;
  levels: SharedValue<number[]>;
  /** Janela de gravação, para a barra de progresso. */
  recordingMs: number;
}

/** Cartão central: status da fase + barras de áudio animadas (+ progresso ao gravar). */
export function VisualizerCard({ phase, levels, recordingMs }: Props) {
  const ui = PHASE_UI[phase];
  const colors = useMemo(
    () =>
      Array.from({ length: BAR_COUNT }, (_, i) => sampleGradient(MODE_STOPS[ui.mode], i / (BAR_COUNT - 1))),
    [ui.mode],
  );

  return (
    <View
      className="min-h-[150px] flex-1 rounded-4xl border border-white/5 bg-night-850/80 px-5 pb-5 pt-4"
      style={{ boxShadow: glow(ui.accent, 48, 0.22, 0) }}>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <StatusDot color={ui.accent} live={ui.live} />
          <Text className="font-label text-sm text-mist-200">{ui.label}</Text>
        </View>
        {phase === 'recording' && (
          <Text className="font-ui text-xs text-mist-400">
            máx. {(recordingMs / 1000).toFixed(1).replace('.', ',')} s
          </Text>
        )}
      </View>

      <View className="flex-1 flex-row items-center justify-between py-3">
        {colors.map((color, i) => (
          <Bar key={i} index={i} color={color} levels={levels} />
        ))}
      </View>

      {phase === 'recording' && <RecordingProgress durationMs={recordingMs} />}
    </View>
  );
}

function Bar({ index, color, levels }: { index: number; color: string; levels: SharedValue<number[]> }) {
  const animated = useAnimatedStyle(() => {
    const v = levels.value[index] ?? 0;
    return { height: `${6 + v * 94}%`, opacity: 0.35 + 0.65 * v };
  });
  return <Animated.View style={[{ width: 5, borderRadius: 3, backgroundColor: color }, animated]} />;
}

function StatusDot({ color, live }: { color: string; live: boolean }) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = live
      ? withRepeat(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }), -1, true)
      : withTiming(0, { duration: 200 });
  }, [live, pulse]);
  const animated = useAnimatedStyle(() => ({ opacity: 1 - pulse.value * 0.65 }));
  return (
    <Animated.View
      style={[
        { width: 8, height: 8, borderRadius: 4, backgroundColor: color, boxShadow: glow(color, 8, 0.9, 0) },
        animated,
      ]}
    />
  );
}

function RecordingProgress({ durationMs }: { durationMs: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(1, { duration: durationMs, easing: Easing.linear });
  }, [durationMs, progress]);
  const animated = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  return (
    <View className="h-1.5 overflow-hidden rounded-full bg-white/10">
      <Animated.View style={[{ height: '100%', borderRadius: 999, overflow: 'hidden' }, animated]}>
        <Gradient colors={gradients.record} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} className="flex-1" />
      </Animated.View>
    </View>
  );
}
