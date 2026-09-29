import { useCallback, useReducer, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { Recording } from '../../audio/recording';
import { useAudioTurn } from '../../audio/useAudioTurn';
import { useReferenceProfile } from '../../audio/useReferenceProfile';
import { useVisualizerLevels } from '../../audio/useVisualizerLevels';
import { recordingWindowMs } from '../../game/match';
import { getModifier, pointsFor, soundEffectOf } from '../../game/modifiers';
import type { Phase, TurnScore } from '../../game/types';
import { Session, submitImitation } from '../../online/api';
import { encodeClip } from '../../online/clipCodec';
import type { RoomPlayer, RoomRound, RoomScore } from '../../online/room';
import { reduceSolo, SoloEvent, soloTurn } from '../../online/turn';
import { findPack, findSound } from '../../store/library';
import { palette } from '../../theme/tokens';
import { BAR_COUNT, VisualizerCard, visualizerMode } from '../AudioVisualizer';
import { GradientButton } from '../Buttons';
import { hapticImpact } from '../haptics';
import { Icon } from '../Icon';
import { ModifierBadge } from '../ModifierBadge';
import { PressableScale } from '../PressableScale';
import { RecordButton, RecordState } from '../RecordButton';
import { ReferenceCard } from '../ReferenceCard';
import { LiveDot } from './LiveDot';

const RECORD_STATE: Partial<Record<Phase, RecordState>> = {
  handoff: 'locked',
  listening: 'locked',
  ready: 'ready',
  recording: 'recording',
  analyzing: 'busy',
};

interface Props {
  session: Session;
  round: RoomRound;
  players: Record<string, RoomPlayer>;
  ids: string[];
  scores: Record<string, RoomScore>;
}

type Upload = 'idle' | 'sending' | 'sent' | 'failed';

/** A vez deste celular numa rodada online: ouvir, imitar (no tempo do som) e enviar a imitação. */
export function ImitateView({ session, round, players, ids, scores }: Props) {
  const sound = findSound(round.soundId);
  const [turn, dispatch] = useReducer(reduceSolo, round.modifier, soloTurn);
  const recording = useRef<Recording | null>(null);
  const onRecorded = useCallback((rec: Recording | null) => {
    recording.current = rec;
  }, []);
  const [upload, setUpload] = useState<Upload>('idle');

  const durationMs = sound?.durationMs ?? 3000;
  const recordingMs = recordingWindowMs(durationMs, round.modifier);
  const effect = soundEffectOf(round.modifier);
  const levels = useVisualizerLevels(visualizerMode(turn.phase), BAR_COUNT);
  const profile = useReferenceProfile(round.soundId, BAR_COUNT);

  const send = useCallback(
    async (score: TurnScore) => {
      setUpload('sending');
      const rec = recording.current;
      const hasAudio = Boolean(rec && rec.samples.length > 0);
      const clip = hasAudio && rec ? encodeClip(rec.samples, rec.sampleRate) : '';
      const clipMs = hasAudio && rec ? Math.round((rec.samples.length / rec.sampleRate) * 1000) : 0;
      try {
        const points = pointsFor(score.total, round.modifier);
        await submitImitation(session, round.number, { ...score, points }, clip, clipMs);
        setUpload('sent');
      } catch {
        setUpload('failed');
      }
    },
    [session, round.number, round.modifier],
  );

  // A nota sai do áudio do turno: guarda no estado e já envia a imitação para a sala.
  const onTurnEvent = useCallback(
    (event: SoloEvent) => {
      dispatch(event);
      if (event.type === 'scored') send(event.score);
    },
    [send, dispatch],
  );
  useAudioTurn(turn.phase, round.soundId, durationMs, recordingMs, effect, onTurnEvent, onRecorded);

  if (!sound) {
    return (
      <View className="gap-3 rounded-3xl border border-coral-400/30 bg-coral-400/10 p-5">
        <Text className="font-heading text-base text-mist-50">Este celular não tem o som da rodada</Text>
        <Text className="font-body text-sm leading-5 text-mist-200">
          Atualize o Mimic Mobile para a mesma versão do anfitrião. Você volta a jogar na próxima rodada.
        </Text>
      </View>
    );
  }

  const pack = findPack(sound.pack) ?? { title: 'Pack', icon: 'help' };
  const modifier = round.modifier && round.modifier !== 'nothing' ? getModifier(round.modifier) : null;
  const pending = ids.filter((uid) => players[uid]?.online && !scores[uid] && uid !== session.uid);

  return (
    <View className="flex-1 gap-4">
      <View className="flex-row items-center gap-3">
        <View className="flex-1">
          <Text className="font-label text-[11px] uppercase tracking-[2px] text-mist-400">Todos ao mesmo tempo</Text>
          <Text className="font-display text-2xl text-mist-50">Sua vez de imitar</Text>
        </View>
        {modifier && <ModifierBadge modifier={modifier} />}
      </View>

      <ReferenceCard
        sound={sound}
        pack={pack}
        phase={turn.phase}
        replaysLeft={turn.replaysLeft}
        replayBlocked={round.modifier === 'noReplay'}
        effect={effect}
        onReplay={() => dispatch({ type: 'replay' })}
      />

      <VisualizerCard phase={turn.phase} levels={levels} recordingMs={recordingMs} profile={profile} />

      <View className="pt-1">
        {turn.phase === 'handoff' ? (
          <View className="gap-3">
            <Text className="text-center font-body text-sm text-mist-400">
              Quando estiver pronto, toque para ouvir. Cada um ouve e imita no seu celular.
            </Text>
            <GradientButton
              label="Ouvir o som"
              icon="ear"
              onPress={() => {
                hapticImpact();
                dispatch({ type: 'start' });
              }}
            />
          </View>
        ) : turn.phase === 'result' ? (
          <Animated.View entering={FadeInDown.duration(300)}>
            <View className="gap-3 rounded-3xl border border-white/5 bg-white/5 p-5">
              {upload === 'failed' ? (
                <>
                  <View className="flex-row items-center gap-2">
                    <Icon name="cloud-offline" size={18} color={palette.coral[400]} />
                    <Text className="flex-1 font-heading text-base text-mist-50">
                      Não foi possível enviar a imitação
                    </Text>
                  </View>
                  <PressableScale
                    onPress={() => turn.score && send(turn.score)}
                    accessibilityRole="button"
                    className="h-12 items-center justify-center rounded-2xl bg-white/10">
                    <Text className="font-label text-sm text-mist-50">Tentar de novo</Text>
                  </PressableScale>
                </>
              ) : (
                <>
                  <View className="flex-row items-center gap-2">
                    {upload === 'sent' ? (
                      <Icon name="checkmark-circle" size={20} color={palette.mint[400]} />
                    ) : (
                      <LiveDot color={palette.violet[400]} />
                    )}
                    <Text className="font-heading text-base text-mist-50">
                      {upload === 'sent' ? 'Imitação enviada!' : 'Enviando a imitação…'}
                    </Text>
                  </View>
                  <Text className="font-body text-sm leading-5 text-mist-400">
                    {pending.length > 0
                      ? `Esperando ${pending.map((uid) => players[uid].name).join(', ')}. A nota aparece na apresentação.`
                      : 'Todo mundo imitou! A apresentação já vai começar.'}
                  </Text>
                </>
              )}
            </View>
          </Animated.View>
        ) : (
          <RecordButton
            state={RECORD_STATE[turn.phase] ?? 'busy'}
            onPress={() => {
              if (turn.phase !== 'ready') return;
              hapticImpact();
              dispatch({ type: 'record' });
            }}
            levels={levels}
            durationMs={recordingMs}
          />
        )}
      </View>
    </View>
  );
}
