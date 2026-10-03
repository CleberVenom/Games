import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { engine } from '../../audio/engine';
import { useVisualizer } from '../../audio/useVisualizerLevels';
import { fetchClip, react, ReactionEntry, Session } from '../../online/api';
import { CLIP_NET_RATE, decodeClip } from '../../online/clipCodec';
import { countReactions, PRESENT_INTRO_MS, RoomPlayer, RoomRound, RoomScore } from '../../online/room';
import { findSound } from '../../store/library';
import { BAR_COUNT, Bars } from '../AudioVisualizer';
import { Avatar } from '../Avatar';
import { ScoreReveal } from '../ScoreReveal';
import { FloatingReactions, ReactionBar } from './Reactions';
import { AVATARS } from '../../avatars/avatars';

type Stage = 'intro' | 'playing' | 'reveal';

interface Props {
  session: Session;
  round: RoomRound;
  players: Record<string, RoomPlayer>;
  scores: Record<string, RoomScore>;
  reactions: Record<string, ReactionEntry[]>;
}

/**
 * Apresentação de uma imitação (em todos os celulares ao mesmo tempo; use `key` por apresentado): o nome de quem
 * imitou, a gravação tocando
 * com as barras ao vivo e, no fim, a nota. Todos podem reagir com emoji enquanto isso.
 */
export function PresentView({ session, round, players, scores, reactions }: Props) {
  const uid = round.order[round.presenting];
  const player = players[uid];
  const score = scores[uid];
  const [stage, setStage] = useState<Stage>('intro');
  const viz = useVisualizer(stage === 'playing' ? 'reference' : 'idle', BAR_COUNT);

  useEffect(() => {
    let active = true;
    const clip = fetchClip(session.code, round.number, uid).catch(() => null);
    const timer = setTimeout(async () => {
      const data = await clip;
      if (!active) return;
      setStage('playing');
      const samples = data ? decodeClip(data) : null;
      if (samples && samples.length > 0) await engine.playSamples(samples, CLIP_NET_RATE).catch(() => {});
      else await new Promise((r) => setTimeout(r, 1200));
      if (active) setStage('reveal');
    }, PRESENT_INTRO_MS);
    return () => {
      active = false;
      clearTimeout(timer);
      engine.stop();
    };
  }, [session.code, round.number, uid]);

  if (!player) return null;
  const hex = AVATARS[player.avatar].tint;
  const sound = findSound(round.soundId);
  const received = reactions[uid] ?? [];

  return (
    <View className="flex-1 gap-5">
      <View className="items-center gap-1">
        <Text className="font-label text-[11px] uppercase tracking-[3px] text-mist-400">
          Apresentação · {round.presenting + 1} de {round.order.length}
        </Text>
        <Text className="text-center font-body text-sm text-mist-400">
          Imitando: <Text className="font-label text-mist-200">{sound?.title ?? 'som da rodada'}</Text>
        </Text>
      </View>

      <Animated.View key={uid} entering={ZoomIn.duration(400)}>
        <View
          className="items-center gap-4 rounded-4xl border border-white/5 bg-night-850/80 px-5 py-6"
          style={{ boxShadow: `0px 0px 60px ${hex}33` }}>
          <Avatar avatar={player.avatar} size={stage === 'reveal' ? 56 : 84} active />
          <Text
            className="text-center font-display text-4xl"
            style={{ color: hex }}
            numberOfLines={1}
            adjustsFontSizeToFit>
            {player.name}
          </Text>
          {/* Com a nota na tela, o cartão encolhe para as reações continuarem à vista. */}
          {stage !== 'reveal' && (
            <>
              <View className="h-24 w-full">
                <Bars mode={stage === 'playing' ? 'recording' : 'idle'} viz={viz} />
              </View>
              <Text className="font-ui text-sm text-mist-400">
                {stage === 'intro' ? 'Prepare os ouvidos…' : 'Tocando a imitação…'}
              </Text>
            </>
          )}
        </View>
      </Animated.View>

      {stage === 'reveal' && score ? (
        <Animated.View entering={FadeInDown.duration(350)}>
          <ScoreReveal score={score} points={score.points} modifier={round.modifier} playerName={player.name} />
        </Animated.View>
      ) : (
        <View className="min-h-[40px]" />
      )}

      <View className="mt-auto gap-2">
        <Text className="text-center font-label text-[11px] uppercase tracking-[2px] text-mist-500">
          {uid === session.uid ? 'Veja como a galera reagiu' : `Reaja à imitação de ${player.name}`}
        </Text>
        <ReactionBar
          counts={countReactions(received)}
          disabled={uid === session.uid}
          onReact={(emoji) => react(session, round.number, uid, emoji).catch(() => {})}
        />
      </View>

      <FloatingReactions entries={received} />
    </View>
  );
}
