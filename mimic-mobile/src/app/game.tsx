import { Redirect, router } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { Alert, BackHandler, Platform, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAudioTurn } from '../audio/useAudioTurn';
import { useReferenceEnvelope } from '../audio/useReferenceEnvelope';
import { useVisualizer } from '../audio/useVisualizerLevels';
import { BAR_COUNT, VisualizerCard, visualizerMode } from '../components/AudioVisualizer';
import { Avatar } from '../components/Avatar';
import { Backdrop } from '../components/Backdrop';
import { GradientButton } from '../components/Buttons';
import { HandoffOverlay } from '../components/HandoffOverlay';
import { ModifierBadge } from '../components/ModifierBadge';
import { Podium } from '../components/Podium';
import { hapticImpact, hapticResult } from '../components/haptics';
import { Icon } from '../components/Icon';
import { PressableScale } from '../components/PressableScale';
import { RecordButton, RecordState } from '../components/RecordButton';
import { ReferenceCard } from '../components/ReferenceCard';
import { Scoreboard } from '../components/Scoreboard';
import { ScoreReveal } from '../components/ScoreReveal';
import { WheelOverlay } from '../components/WheelOverlay';
import { isLastTurn, Match, recordingWindowMs } from '../game/match';
import { getModifier, soundEffectOf } from '../game/modifiers';
import type { Phase } from '../game/types';
import { findPack, findSound } from '../store/library';
import { useMatch } from '../store/match';
import { palette, PLAYER_HEX } from '../theme/tokens';

const RECORD_STATE: Record<Phase, RecordState> = {
  handoff: 'locked',
  listening: 'locked',
  ready: 'ready',
  recording: 'recording',
  analyzing: 'busy',
  result: 'busy',
  wheel: 'busy',
  finished: 'busy',
};

export default function GameScreen() {
  const match = useMatch((s) => s.match);
  if (!match) return <Redirect href="/" />;
  return <Game match={match} />;
}

function Game({ match }: { match: Match }) {
  const insets = useSafeAreaInsets();
  const dispatch = useMatch((s) => s.dispatch);
  const rematch = useMatch((s) => s.rematch);
  const { phase, players, current, round, totalRounds, replaysLeft, lastScore, lastPoints, modifier } = match;
  const player = players[current];
  const nextPlayer = players[(current + 1) % players.length];
  const sound = findSound(match.soundId) ?? { id: match.soundId, title: 'Som removido', pack: '', durationMs: 1000 };
  const pack = findPack(sound.pack) ?? { title: 'Pack removido', icon: 'help' };
  const lastTurn = isLastTurn(match);
  const recordingMs = recordingWindowMs(sound.durationMs, modifier);
  const effect = soundEffectOf(modifier);
  const activeModifier = modifier && modifier !== 'nothing' ? getModifier(modifier) : null;

  const envelope = useReferenceEnvelope(sound.id);
  const viz = useVisualizer(visualizerMode(phase), BAR_COUNT, phase === 'recording' ? envelope : null);
  useAudioTurn(phase, sound.id, sound.durationMs, recordingMs, effect, dispatch);

  // A gravação termina sozinha no tempo do som original: não há como parar antes.
  const onRecordPress = () => {
    if (phase !== 'ready') return;
    hapticImpact();
    dispatch({ type: 'record' });
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
            <Text className="font-label text-[11px] uppercase tracking-[3px] text-mist-400">Rodada {round} de {totalRounds}</Text>
            <Text className="font-heading text-base text-mist-50">
              Turno {current + 1} de {players.length}
            </Text>
          </View>
          <View className="w-24" />
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
            {activeModifier && <ModifierBadge modifier={activeModifier} />}
          </View>

          <ReferenceCard
            sound={sound}
            pack={pack}
            phase={phase}
            replaysLeft={replaysLeft}
            replayBlocked={modifier === 'noReplay'}
            effect={effect}
            onReplay={() => dispatch({ type: 'replay' })}
          />

          <VisualizerCard phase={phase} viz={viz} recordingMs={recordingMs} guide={envelope !== null} />
        </View>

        <View className="px-5 pt-5">
          {(phase === 'result' || phase === 'wheel') && lastScore ? (
            <Animated.View entering={FadeInDown.duration(350)} style={{ gap: 16 }}>
              <ScoreReveal score={lastScore} points={lastPoints ?? lastScore.total} modifier={modifier} playerName={player.name} />
              {lastTurn ? (
                <GradientButton label="Ver o pódio" icon="trophy" onPress={() => dispatch({ type: 'finish' })} />
              ) : (
                <GradientButton label="Girar a roleta" icon="sync" onPress={() => dispatch({ type: 'spin' })} />
              )}
            </Animated.View>
          ) : (
            <RecordButton state={RECORD_STATE[phase]} onPress={onRecordPress} levels={viz.levels} durationMs={recordingMs} />
          )}
        </View>
      </View>

      {phase === 'handoff' && (
        <HandoffOverlay
          player={player}
          round={round}
          insets={insets}
          modifier={modifier ? getModifier(modifier) : null}
          replays={replaysLeft}
          onReady={() => dispatch({ type: 'start' })}
          onExit={exit}
        />
      )}

      {phase === 'wheel' && match.nextModifier && (
        <WheelOverlay
          modifier={match.nextModifier}
          heading={
            <>
              Efeito para a vez de <Text style={{ color: PLAYER_HEX[nextPlayer.color] }}>{nextPlayer.name}</Text>
            </>
          }
          insets={insets}
          action={{ label: `Próximo: ${nextPlayer.name}`, onPress: () => dispatch({ type: 'next' }) }}
        />
      )}

      {phase === 'finished' && (
        <Podium
          players={players}
          rounds={totalRounds}
          insets={insets}
          onRematch={rematch}
          onNewGame={() => router.dismissTo('/')}
        />
      )}
    </View>
  );
}
