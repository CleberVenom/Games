import { Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { ReactionEntry } from '../../online/api';
import { countReactions, REACTION_EMOJI, REACTIONS, RoomPlayer, RoomScore } from '../../online/room';
import { palette, withAlpha } from '../../theme/tokens';
import { Avatar } from '../Avatar';
import { GradientButton } from '../Buttons';
import { LiveDot } from './LiveDot';

interface Props {
  me: string;
  roundNumber: number;
  totalRounds: number;
  players: Record<string, RoomPlayer>;
  scores: Record<string, RoomScore>;
  reactions: Record<string, ReactionEntry[]>;
  /** Botão do anfitrião ("Girar a roleta" ou "Ver o pódio"); convidados veem a espera. */
  action?: { label: string; icon: 'sync' | 'trophy'; onPress: () => void };
  hostName: string;
}

/** Fim da rodada: placar geral, pontos desta rodada e as reações que cada um recebeu. */
export function RoundResults({ me, roundNumber, totalRounds, players, scores, reactions, action, hostName }: Props) {
  const ranking = Object.entries(players).sort(([, a], [, b]) => b.score - a.score);

  return (
    <View className="flex-1 gap-5">
      <View className="items-center gap-1">
        <Text className="font-label text-[11px] uppercase tracking-[3px] text-mist-400">
          Fim da rodada {roundNumber} de {totalRounds}
        </Text>
        <Text className="font-display text-3xl text-mist-50">Placar</Text>
      </View>

      <View className="gap-2">
        {ranking.map(([uid, p], i) => {
          const s = scores[uid];
          const counts = countReactions(reactions[uid] ?? []);
          return (
            <Animated.View key={uid} entering={FadeInDown.delay(i * 90).duration(300)}>
              <View
                className="flex-row items-center gap-3 rounded-2xl border px-3 py-3"
                style={{
                  borderColor: uid === me ? withAlpha(palette.violet[400], 0.45) : 'rgba(255, 255, 255, 0.05)',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                }}>
                <Text className="w-6 text-center font-heading text-base text-mist-400">{i + 1}º</Text>
                <Avatar label={p.name} color={p.color} size={40} />
                <View className="flex-1 gap-0.5">
                  <Text className="font-label text-sm text-mist-50" numberOfLines={1}>
                    {p.name}
                    {uid === me ? ' (você)' : ''}
                  </Text>
                  <View className="flex-row flex-wrap items-center gap-x-2">
                    <Text className="font-body text-xs text-mist-400">
                      {s ? `nota ${s.total} · +${s.points}` : 'não imitou'}
                    </Text>
                    {REACTIONS.filter((r) => counts[r] > 0).map((r) => (
                      <Text key={r} className="font-body text-xs text-mist-200">
                        {REACTION_EMOJI[r]} {counts[r]}
                      </Text>
                    ))}
                  </View>
                </View>
                <Text className="font-display text-2xl text-mist-50">{p.score}</Text>
              </View>
            </Animated.View>
          );
        })}
      </View>

      <View className="mt-auto">
        {action ? (
          <GradientButton label={action.label} icon={action.icon} onPress={action.onPress} />
        ) : (
          <View className="flex-row items-center justify-center gap-3 py-4">
            <LiveDot color={palette.violet[400]} />
            <Text className="font-ui text-sm text-mist-400">Aguardando {hostName} seguir…</Text>
          </View>
        )}
      </View>
    </View>
  );
}
