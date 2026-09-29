import { ScrollView, Text, View } from 'react-native';

import type { RoomPlayer } from '../../online/room';
import { palette, PLAYER_HEX, withAlpha } from '../../theme/tokens';
import { Avatar } from '../Avatar';
import { Icon } from '../Icon';

export type PlayerStatus = 'done' | 'waiting' | 'offline' | 'none';

interface Props {
  ids: string[];
  players: Record<string, RoomPlayer>;
  me: string;
  /** Situação de cada um na rodada (ex.: já enviou a imitação). */
  status?: (uid: string) => PlayerStatus;
  /** Mostra o placar ao lado do nome. */
  showScore?: boolean;
}

/** Faixa horizontal com os jogadores da sala: avatar, nome, placar e se já enviaram a imitação. */
export function PlayerStrip({ ids, players, me, status, showScore = false }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="grow-0"
      contentContainerClassName="gap-2 px-5">
      {ids.map((uid) => {
        const p = players[uid];
        if (!p) return null;
        const s = status?.(uid) ?? 'none';
        const hex = PLAYER_HEX[p.color];
        return (
          <View
            key={uid}
            className="flex-row items-center gap-2 rounded-2xl border py-1.5 pl-1.5 pr-3"
            style={{
              borderColor: uid === me ? withAlpha(hex, 0.6) : 'rgba(255, 255, 255, 0.06)',
              backgroundColor: uid === me ? withAlpha(hex, 0.1) : 'rgba(255, 255, 255, 0.04)',
              opacity: p.online ? 1 : 0.45,
            }}>
            <Avatar label={p.name} color={p.color} size={32} />
            <View>
              <Text className="max-w-[92px] font-label text-xs text-mist-50" numberOfLines={1}>
                {uid === me ? `${p.name} (você)` : p.name}
              </Text>
              {showScore && <Text className="font-heading text-sm text-mist-50">{p.score}</Text>}
            </View>
            {s === 'done' && <Icon name="checkmark-circle" size={18} color={palette.mint[400]} />}
            {s === 'waiting' && <Icon name="ellipsis-horizontal-circle" size={18} color={palette.mist[400]} />}
            {s === 'offline' && <Icon name="cloud-offline" size={16} color={palette.mist[500]} />}
          </View>
        );
      })}
    </ScrollView>
  );
}
