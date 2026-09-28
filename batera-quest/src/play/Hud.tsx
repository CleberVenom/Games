import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { colors, JUDGEMENT_STYLE } from '../ui/theme';
import { useHud } from './hud';

function Judgement() {
  const judgement = useHud((s) => s.judgement);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);
  useEffect(() => {
    if (!judgement) return;
    opacity.value = 1;
    opacity.value = withDelay(250, withTiming(0, { duration: 250 }));
    scale.value = 1.35;
    scale.value = withTiming(1, { duration: 120 });
  }, [judgement, opacity, scale]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));
  if (!judgement) return null;
  const j = JUDGEMENT_STYLE[judgement.kind];
  return (
    <Animated.Text style={[styles.judgement, { color: j.color }, style]} pointerEvents="none">
      {j.text}
    </Animated.Text>
  );
}

function CountIn() {
  const countIn = useHud((s) => s.countIn);
  if (countIn === null) return null;
  return (
    <View style={styles.countWrap} pointerEvents="none">
      <Text style={styles.count}>{countIn}</Text>
    </View>
  );
}

export function Hud({ onPause, onEnergy, title }: { onPause: () => void; onEnergy: () => void; title: string }) {
  const { score, combo, multiplier, rock, energy, energyActive, canActivate, progress } = useHud();
  const rockColor = rock < 0.25 ? colors.danger : rock < 0.5 ? colors.warning : colors.success;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={styles.progressTrack} pointerEvents="none">
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
      <View style={styles.left} pointerEvents="none">
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.score}>{score.toLocaleString('pt-BR')}</Text>
        <Text style={[styles.mult, energyActive && { color: '#7DF9FF' }]}>
          x{multiplier} {combo > 0 ? `· ${combo} combo` : ''}
        </Text>
      </View>
      <View style={styles.right} pointerEvents="box-none">
        <Pressable accessibilityRole="button" accessibilityLabel="Pausar" onPress={onPause} style={styles.pause} hitSlop={10}>
          <Text style={styles.pauseText}>II</Text>
        </Pressable>
        <View style={styles.meterRow} pointerEvents="none">
          <Text style={styles.meterLabel}>ROCK</Text>
          <View style={styles.meter}>
            <View style={{ width: `${rock * 100}%`, height: '100%', backgroundColor: rockColor, borderRadius: 4 }} />
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ativar energia"
          disabled={!canActivate}
          onPress={onEnergy}
          style={[styles.energy, canActivate && styles.energyReady, energyActive && styles.energyActive]}
        >
          <Text style={styles.energyText}>⚡ {energyActive ? 'ENERGIA x2!' : canActivate ? 'ATIVAR' : 'ENERGIA'}</Text>
          <View style={styles.energyTrack}>
            <View style={{ width: `${energy * 100}%`, height: '100%', backgroundColor: '#7DF9FF', borderRadius: 3 }} />
          </View>
        </Pressable>
      </View>
      <Judgement />
      <CountIn />
    </View>
  );
}

const styles = StyleSheet.create({
  progressTrack: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: '#ffffff15' },
  progressFill: { height: 3, backgroundColor: colors.accent },
  left: { position: 'absolute', top: 8, left: 12, maxWidth: '40%' },
  title: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  score: { color: colors.text, fontSize: 24, fontWeight: '900', textShadowColor: '#000', textShadowRadius: 4 },
  mult: { color: colors.accent, fontSize: 14, fontWeight: '900' },
  right: { position: 'absolute', top: 8, right: 12, alignItems: 'flex-end', gap: 6 },
  pause: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#000000AA', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  pauseText: { color: colors.text, fontWeight: '900', fontSize: 16 },
  meterRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meterLabel: { color: colors.muted, fontSize: 10, fontWeight: '900' },
  meter: { width: 110, height: 10, backgroundColor: '#ffffff22', borderRadius: 4, overflow: 'hidden' },
  energy: { width: 140, padding: 6, borderRadius: 10, backgroundColor: '#000000AA', borderWidth: 1, borderColor: colors.border },
  energyReady: { borderColor: '#7DF9FF' },
  energyActive: { backgroundColor: '#0B3B40' },
  energyText: { color: '#7DF9FF', fontWeight: '900', fontSize: 11, marginBottom: 4 },
  energyTrack: { height: 6, backgroundColor: '#ffffff22', borderRadius: 3, overflow: 'hidden' },
  judgement: { position: 'absolute', top: '28%', alignSelf: 'center', fontSize: 30, fontWeight: '900', textShadowColor: '#000', textShadowRadius: 6 },
  countWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  count: { color: colors.text, fontSize: 96, fontWeight: '900', opacity: 0.85, textShadowColor: '#000', textShadowRadius: 10 },
});
