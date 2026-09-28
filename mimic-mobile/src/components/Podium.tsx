import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Standing, standings } from '../game/match';
import type { Player } from '../game/types';
import { findSound } from '../store/library';
import { glow, palette, PLAYER_HEX, withAlpha } from '../theme/tokens';
import { Avatar } from './Avatar';
import { Backdrop } from './Backdrop';
import { GradientButton } from './Buttons';
import { Gradient } from './Gradient';
import { hapticResult } from './haptics';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';

/** Altura do degrau por posição (1º mais alto). */
const STEP_HEIGHT: Record<number, number> = { 1: 150, 2: 112, 3: 84 };

interface Props {
  players: Player[];
  rounds: number;
  insets: { top: number; bottom: number };
  onRematch: () => void;
  onNewGame: () => void;
}

function bestLine(p: Player): string {
  if (!p.best) return 'Nenhuma imitação pontuou';
  return `Melhor imitação: ${findSound(p.best.soundId)?.title ?? 'som removido'} · ${p.best.total}`;
}

/** Fim de partida: pódio dos 3 primeiros, demais colocados e revanche. */
export function Podium({ players, rounds, insets, onRematch, onNewGame }: Props) {
  const ranking = standings(players);
  const top = ranking.slice(0, 3);
  const winners = ranking.filter((s) => s.place === 1);
  // Ordem de palco: 2º à esquerda, 1º no centro, 3º à direita.
  const stage = [top[1], top[0], top[2]].filter((s): s is Standing => s !== undefined);

  useEffect(() => hapticResult(true), []);

  return (
    <Animated.View entering={FadeIn.duration(300)} style={StyleSheet.absoluteFill}>
      <Backdrop />
      <ScrollView
        contentContainerClassName="gap-7 px-5"
        contentContainerStyle={{ paddingTop: insets.top + 28, paddingBottom: insets.bottom + 24 }}>
        <Animated.View entering={FadeInDown.duration(400)} style={{ alignItems: 'center', gap: 6 }}>
          <Text className="font-label text-xs uppercase tracking-[3px] text-mist-400">
            Fim de jogo · {rounds} rodadas
          </Text>
          <Text className="text-center font-display text-4xl text-mist-50">
            {winners.length > 1 ? 'Empate no topo!' : `${winners[0].player.name} venceu!`}
          </Text>
          <Text className="text-center font-body text-sm text-mist-400">{bestLine(winners[0].player)}</Text>
        </Animated.View>

        <View className="flex-row items-end justify-center gap-3">
          {stage.map((s, i) => (
            <PodiumStep key={s.player.id} standing={s} delay={200 + i * 180} />
          ))}
        </View>

        {ranking.length > 3 && (
          <View className="gap-2">
            {ranking.slice(3).map((s, i) => (
              <Animated.View key={s.player.id} entering={FadeInDown.delay(700 + i * 100).duration(300)}>
                <View className="flex-row items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                  <Text className="w-7 font-heading text-base text-mist-400">{s.place}º</Text>
                  <Avatar label={s.player.name} color={s.player.color} size={36} />
                  <View className="flex-1">
                    <Text className="font-label text-sm text-mist-50" numberOfLines={1}>
                      {s.player.name}
                    </Text>
                    <Text className="font-body text-xs text-mist-400" numberOfLines={1}>
                      {bestLine(s.player)}
                    </Text>
                  </View>
                  <Text className="font-heading text-lg text-mist-50">{s.player.score}</Text>
                </View>
              </Animated.View>
            ))}
          </View>
        )}

        <View className="gap-3">
          <GradientButton label="Jogar de novo" icon="refresh" onPress={onRematch} />
          <PressableScale
            onPress={onNewGame}
            accessibilityRole="button"
            className="h-14 flex-row items-center justify-center gap-2 rounded-[20px] border border-white/10 bg-white/5">
            <Icon name="people" size={18} color={palette.mist[200]} />
            <Text className="font-label text-base text-mist-200">Novo jogo (trocar jogadores ou packs)</Text>
          </PressableScale>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

function PodiumStep({ standing, delay }: { standing: Standing; delay: number }) {
  const { player, place } = standing;
  const hex = PLAYER_HEX[player.color];
  const target = STEP_HEIGHT[place] ?? STEP_HEIGHT[3];
  const height = useSharedValue(0);
  useEffect(() => {
    height.value = withDelay(delay, withTiming(target, { duration: 700, easing: Easing.out(Easing.back(1.2)) }));
  }, [delay, target, height]);
  const grow = useAnimatedStyle(() => ({ height: height.value }));

  return (
    <View className="flex-1 items-center gap-2" style={{ maxWidth: 116 }}>
      <Animated.View entering={FadeInDown.delay(delay + 300).duration(400)} style={{ alignItems: 'center', gap: 6 }}>
        {place === 1 && <Icon name="trophy" size={26} color={palette.amber[400]} />}
        <Avatar label={player.name} color={player.color} size={place === 1 ? 64 : 52} active={place === 1} />
        <Text className="font-label text-sm text-mist-50" numberOfLines={1}>
          {player.name}
        </Text>
        <Text className="font-heading text-lg" style={{ color: hex }}>
          {player.score}
        </Text>
      </Animated.View>
      <Animated.View
        style={[
          { width: '100%', borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
          { boxShadow: glow(hex, 28, 0.35, 0) },
          grow,
        ]}>
        <Gradient
          colors={[withAlpha(hex, 0.9), withAlpha(hex, 0.15)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          className="flex-1 items-center pt-3">
          <Text className="font-display text-3xl text-night-950">{place}º</Text>
        </Gradient>
      </Animated.View>
    </View>
  );
}
