import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { AVATAR_LIST } from '../avatars/avatars';
import { AVATAR_IDS, AvatarId } from '../game/types';
import { palette } from '../theme/tokens';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';

/** Largura de cada mascote no carrossel (o dedo desliza de um em um). */
const ITEM = 108;

interface Props {
  value: AvatarId;
  /** Mascotes que outro jogador já escolheu → nome dele. Ficam apagados e não dá para tocar. */
  takenBy: Partial<Record<AvatarId, string>>;
  onPick: (avatar: AvatarId) => void;
}

/**
 * Carrossel lateral com todos os mascotes: deslize para os dois lados, toque para escolher. Rolar não escolhe
 * nada — dá para passar direto por um mascote e voltar nele depois.
 */
export function AvatarCarousel({ value, takenBy, onPick }: Props) {
  const scroll = useRef<ScrollView>(null);
  const first = useRef(value);
  const [width, setWidth] = useState(0);
  const pad = Math.max(0, (width - ITEM) / 2);

  // Ao abrir, o mascote atual aparece no centro.
  useEffect(() => {
    if (width > 0) scroll.current?.scrollTo({ x: AVATAR_IDS.indexOf(first.current) * ITEM, animated: false });
  }, [width]);

  return (
    <ScrollView
      ref={scroll}
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={ITEM}
      decelerationRate="fast"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      testID="avatar-carousel"
      className="grow-0">
      {/* Espaçadores nas pontas deixam o primeiro e o último mascote chegarem ao centro (padding é ignorado no fim da rolagem na web). */}
      <View style={{ width: pad }} />
      {AVATAR_LIST.map(({ id, name }) => {
        const owner = takenBy[id];
        const selected = id === value;
        return (
          <PressableScale
            key={id}
            onPress={() => onPick(id)}
            disabled={Boolean(owner)}
            accessibilityRole="button"
            accessibilityLabel={owner ? `${name}, já escolhido por ${owner}` : name}
            accessibilityState={{ selected, disabled: Boolean(owner) }}
            className="items-center gap-2 py-2"
            style={{ width: ITEM }}>
            <View style={{ opacity: owner ? 0.28 : 1 }}>
              <Avatar avatar={id} size={84} active={selected} />
            </View>
            {selected && (
              <View className="absolute right-3 top-1 h-6 w-6 items-center justify-center rounded-full bg-mint-400">
                <Icon name="checkmark" size={15} color={palette.night[950]} />
              </View>
            )}
            {owner && (
              <View className="absolute right-3 top-1 h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-night-950">
                <Icon name="lock-closed" size={12} color={palette.mist[400]} />
              </View>
            )}
            <Text
              numberOfLines={2}
              className={`px-1 text-center font-label text-xs leading-4 ${owner ? 'text-mist-500' : 'text-mist-200'}`}>
              {owner ? `de ${owner}` : name}
            </Text>
          </PressableScale>
        );
      })}
      <View style={{ width: pad }} />
    </ScrollView>
  );
}
