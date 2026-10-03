import { ScrollView, Text, View } from 'react-native';

import type { Player } from '../game/types';
import { withAlpha } from '../theme/tokens';
import { Avatar } from './Avatar';
import { AVATARS } from '../avatars/avatars';

/** Placar em faixa horizontal; o jogador da vez fica destacado na cor dele. */
export function Scoreboard({ players, current }: { players: Player[]; current: number }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="grow-0"
      contentContainerClassName="gap-3 px-5">
      {players.map((p, i) => {
        const active = i === current;
        const hex = AVATARS[p.avatar].tint;
        return (
          <View
            key={p.id}
            className="flex-row items-center gap-2.5 rounded-2xl border py-2 pl-2 pr-4"
            style={{
              borderColor: active ? withAlpha(hex, 0.6) : 'rgba(255, 255, 255, 0.06)',
              backgroundColor: active ? withAlpha(hex, 0.12) : 'rgba(255, 255, 255, 0.04)',
            }}>
            <Avatar avatar={p.avatar} size={32} active={active} />
            <View>
              <Text className="max-w-[96px] font-label text-xs text-mist-200" numberOfLines={1}>
                {p.name}
              </Text>
              <Text className="font-heading text-base text-mist-50">{p.score}</Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}
