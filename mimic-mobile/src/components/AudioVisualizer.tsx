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
import { glow, gradients, palette, sampleGradient, withAlpha } from '../theme/tokens';
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
  wheel: { mode: 'idle', label: 'Imitação avaliada', accent: palette.mint[400], live: false },
  finished: { mode: 'idle', label: 'Imitação avaliada', accent: palette.mint[400], live: false },
};

export function visualizerMode(phase: Phase): VisualizerMode {
  return PHASE_UI[phase].mode;
}

interface Props {
  phase: Phase;
  levels: SharedValue<number[]>;
  /** Janela de gravação, para a barra de progresso. */
  recordingMs: number;
  /** Silhueta do som original (0–1 por barra): fica fixa atrás das barras na hora de imitar. */
  profile: number[] | null;
}

/** Cartão central: status da fase + barras de áudio animadas (+ silhueta e progresso ao imitar). */
export function VisualizerCard({ phase, levels, recordingMs, profile }: Props) {
  const ui = PHASE_UI[phase];
  const ghost = phase === 'ready' || phase === 'recording' ? profile : null;

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
            {(recordingMs / 1000).toFixed(1).replace('.', ',')} s
          </Text>
        )}
      </View>

      <View className="flex-1 py-3">
        <Bars mode={ui.mode} levels={levels} ghost={ghost} />
      </View>

      {ghost && <Legend />}
      {phase === 'recording' && <RecordingProgress durationMs={recordingMs} />}
    </View>
  );
}

/** Altura (0–1) que uma barra ao vivo teria com o nível `v` do espectro — a mesma regra do visualizador. */
const barHeight = (v: number) => 0.06 + 0.94 * Math.min(Math.max(v, 0), 1);

/**
 * Fileira de barras coloridas pelo gradiente do modo; a altura vem de `levels` (0–1).
 * Com `ghost`, a silhueta do som original fica fixa e translúcida atrás de cada barra.
 */
export function Bars({
  mode,
  levels,
  ghost = null,
}: {
  mode: VisualizerMode;
  levels: SharedValue<number[]>;
  ghost?: number[] | null;
}) {
  const colors = useMemo(
    () => Array.from({ length: BAR_COUNT }, (_, i) => sampleGradient(MODE_STOPS[mode], i / (BAR_COUNT - 1))),
    [mode],
  );
  return (
    <View className="flex-1 flex-row items-center justify-between">
      {colors.map((color, i) => (
        <View key={i} className="h-full items-center justify-center" style={{ width: 7 }}>
          {ghost && (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                width: 7,
                height: `${6 + barHeight(ghost[i] ?? 0) * 94}%`,
                borderRadius: 4,
                borderWidth: 1,
                borderColor: withAlpha(palette.cyan[300], 0.55),
                backgroundColor: withAlpha(palette.cyan[400], 0.16),
              }}
            />
          )}
          <Bar index={i} color={color} levels={levels} />
        </View>
      ))}
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

/** Legenda da comparação: silhueta = som original; barras = voz ao vivo. */
function Legend() {
  return (
    <View className="flex-row items-center justify-center gap-5 pb-3">
      <View className="flex-row items-center gap-2">
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 3,
            borderWidth: 1,
            borderColor: withAlpha(palette.cyan[300], 0.7),
            backgroundColor: withAlpha(palette.cyan[400], 0.2),
          }}
        />
        <Text className="font-ui text-xs text-mist-200">Som original</Text>
      </View>
      <View className="flex-row items-center gap-2">
        <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: palette.pink[400] }} />
        <Text className="font-ui text-xs text-mist-200">Sua voz</Text>
      </View>
    </View>
  );
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
