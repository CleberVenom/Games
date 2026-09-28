import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { Alert, BackHandler, Platform, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSimulatedTurn } from '../audio/useSimulatedTurn';
import { useSyntheticLevels } from '../audio/useSyntheticLevels';
import { BAR_COUNT, VisualizerCard, visualizerMode } from '../components/AudioVisualizer';
import { Avatar } from '../components/Avatar';
import { Backdrop } from '../components/Backdrop';
import { GradientButton } from '../components/Buttons';
import { HandoffOverlay } from '../components/HandoffOverlay';
import { hapticImpact, hapticResult } from '../components/haptics';
import { Icon } from '../components/Icon';
import { PressableScale } from '../components/PressableScale';
import { RecordButton, RecordState } from '../components/RecordButton';
import { ReferenceCard } from '../components/ReferenceCard';
import { Scoreboard } from '../components/Scoreboard';
import { ScoreReveal } from '../components/ScoreReveal';
import { Match, recordingWindowMs } from '../game/match';
import { getSound } from '../game/sounds';
import type { Phase } from '../game/types';
import { useMatch } from '../store/match';
import { palette, PLAYER_HEX } from '../theme/tokens';

/** Evita encerrar a gravação (a única chance) com um toque duplo acidental. */
const MIN_RECORDING_MS = 600;

const RECORD_STATE: Record<Phase, RecordState> = {
  handoff: 'locked',
  listening: 'locked',
  ready: 'ready',
  recording: 'recording',
  analyzing: 'busy',
  result: 'busy',
};

export default function GameScreen() {
  const match = useMatch((s) => s.match);
  if (!match) return <Redirect href="/" />;
  return <Game match={match} />;
}

function Game({ match }: { match: Match }) {
  const insets = useSafeAreaInsets();
  const dispatch = useMatch((s) => s.dispatch);
  const { phase, players, current, round, replaysLeft, lastScore } = match;
  const player = players[current];
  const nextPlayer = players[(current + 1) % players.length];
  const sound = getSound(match.soundId);
  const recordingMs = recordingWindowMs(sound.durationMs);

  const levels = useSyntheticLevels(visualizerMode(phase), BAR_COUNT);
  useSimulatedTurn(phase, sound.durationMs, recordingMs, dispatch);

  const recordStartedAt = useRef(0);
  const onRecordPress = () => {
    if (phase === 'ready') {
      hapticImpact();
      recordStartedAt.current = Date.now();
      dispatch({ type: 'record' });
    } else if (phase === 'recording' && Date.now() - recordStartedAt.current >= MIN_RECORDING_MS) {
      hapticImpact();
      dispatch({ type: 'recordingEnded' });
    }
  };

  useEffect(() => {
    if (phase === 'result' && lastScore) hapticResult(lastScore.total >= 50);
  }, [phase, lastScore]);

  const exit = useCallback(() => {
    const leave = () => router.dismissTo('/');
    if (Platform.OS === 'web') {
      if (window.confirm('Sair da partida? O placar será perdido.')) leave();
      return;
    }
    Alert.alert('Sair da partida?', 'O placar desta partida será perdido.', [
      { text: 'Continuar jogando', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: leave },
    ]);
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      exit();
      return true;
    });
    return () => sub.remove();
  }, [exit]);

  return (
    <View className="flex-1 bg-night-950">
      <Backdrop />
      <View className="flex-1" style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }}>
        <View className="flex-row items-center px-5 pb-4">
          <View className="w-24 items-start">
            <PressableScale
              onPress={exit}
              accessibilityRole="button"
              accessibilityLabel="Sair da partida"
              className="h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
              <Icon name="close" size={20} color={palette.mist[200]} />
            </PressableScale>
          </View>
          <View className="flex-1 items-center">
            <Text className="font-label text-[11px] uppercase tracking-[3px] text-mist-400">Rodada {round}</Text>
            <Text className="font-heading text-base text-mist-50">
              Turno {current + 1} de {players.length}
            </Text>
          </View>
          <View className="w-24 items-end">
            <View className="flex-row items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5">
              <Icon name="flask-outline" size={12} color={palette.amber[400]} />
              <Text className="font-label text-[11px] text-amber-400">Simulado</Text>
            </View>
          </View>
        </View>

        <Scoreboard players={players} current={current} />

        <View className="flex-1 gap-4 px-5 pt-5">
          <View className="flex-row items-center gap-3">
            <Avatar label={player.name} color={player.color} size={44} active />
            <View className="flex-1">
              <Text className="font-label text-[11px] uppercase tracking-[2px] text-mist-400">Vez de</Text>
              <Text
                className="font-display text-2xl"
                style={{ color: PLAYER_HEX[player.color] }}
                numberOfLines={1}>
                {player.name}
              </Text>
            </View>
          </View>

          <ReferenceCard
            sound={sound}
            phase={phase}
            replaysLeft={replaysLeft}
            onReplay={() => dispatch({ type: 'replay' })}
          />

          <VisualizerCard phase={phase} levels={levels} recordingMs={recordingMs} />
        </View>

        <View className="px-5 pt-5">
          {phase === 'result' && lastScore ? (
            <Animated.View entering={FadeInDown.duration(350)} style={{ gap: 16 }}>
              <ScoreReveal score={lastScore} playerName={player.name} />
              <GradientButton
                label={`Próximo: ${nextPlayer.name}`}
                icon="arrow-forward"
                onPress={() => dispatch({ type: 'next' })}
              />
            </Animated.View>
          ) : (
            <RecordButton state={RECORD_STATE[phase]} onPress={onRecordPress} levels={levels} />
          )}
        </View>
      </View>

      {phase === 'handoff' && (
        <HandoffOverlay
          player={player}
          round={round}
          insets={insets}
          onReady={() => dispatch({ type: 'start' })}
          onExit={exit}
        />
      )}
    </View>
  );
}
