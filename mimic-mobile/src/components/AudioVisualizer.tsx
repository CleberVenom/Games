import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import type { Visualizer, VisualizerMode } from '../audio/useVisualizerLevels';
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
  viz: Visualizer;
  /** Janela de gravação, para a barra de progresso. */
  recordingMs: number;
  /** A silhueta do som original está pronta (ela rola junto com a voz na gravação). */
  guide: boolean;
}

/** Cartão central: status da fase + gráfico de som rolando (+ silhueta do original e progresso ao imitar). */
export function VisualizerCard({ phase, viz, recordingMs, guide }: Props) {
  const ui = PHASE_UI[phase];
  const legend = guide && (phase === 'ready' || phase === 'recording');

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
        <Bars mode={ui.mode} viz={viz} />
      </View>

      {legend && <Legend />}
      {phase === 'recording' && <RecordingProgress durationMs={recordingMs} />}
    </View>
  );
}

/**
 * Gráfico de som: barras de volume que entram pela direita e saem pela esquerda (a fileira tem uma barra a
 * mais, escondida, e desliza `shift` de uma barra para a esquerda entre uma barra nova e outra). Atrás de cada
 * barra, a silhueta do som original no mesmo instante, quando houver.
 */
export function Bars({ mode, viz }: { mode: VisualizerMode; viz: Visualizer }) {
  const [width, setWidth] = useState(0);
  const slots = BAR_COUNT + 1;
  const slot = width / BAR_COUNT;
  const colors = useMemo(
    () => Array.from({ length: slots }, (_, i) => sampleGradient(MODE_STOPS[mode], i / (slots - 1))),
    [mode, slots],
  );
  const { shift } = viz;
  const row = useAnimatedStyle(() => ({ transform: [{ translateX: (shift.value - 1) * slot }] }), [slot]);
  return (
    <View className="flex-1 overflow-hidden" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <Animated.View style={[{ flexDirection: 'row', height: '100%', width: slots * slot }, row]}>
          {colors.map((color, i) => (
            <View key={i} style={{ width: slot, height: '100%', alignItems: 'center', justifyContent: 'center' }}>
              <GhostBar index={i} ghost={viz.ghost} />
              <Bar index={i} color={color} levels={viz.levels} />
            </View>
          ))}
        </Animated.View>
      )}
    </View>
  );
}

function Bar({ index, color, levels }: { index: number; color: string; levels: SharedValue<number[]> }) {
  const animated = useAnimatedStyle(() => {
    const v = Math.min(Math.max(levels.value[index] ?? 0, 0), 1);
    return { height: `${6 + v * 94}%`, opacity: 0.35 + 0.65 * v };
  });
  return <Animated.View style={[{ width: 5, borderRadius: 3, backgroundColor: color }, animated]} />;
}

/** Silhueta translúcida do som original naquele instante (some quando não há). */
function GhostBar({ index, ghost }: { index: number; ghost: SharedValue<number[]> }) {
  const animated = useAnimatedStyle(() => {
    const v = Math.min(Math.max(ghost.value[index] ?? 0, 0), 1);
    return { height: `${6 + v * 94}%`, opacity: v > 0.01 ? 1 : 0 };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: 7,
          borderRadius: 4,
          borderWidth: 1,
          borderColor: withAlpha(palette.cyan[300], 0.55),
          backgroundColor: withAlpha(palette.cyan[400], 0.16),
        },
        animated,
      ]}
    />
  );
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
