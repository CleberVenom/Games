import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AVATARS } from '../avatars/avatars';
import type { AvatarId } from '../game/types';
import { palette } from '../theme/tokens';
import { Avatar } from './Avatar';
import { GradientButton } from './Buttons';
import { AvatarCarousel } from './AvatarCarousel';
import { Icon } from './Icon';

interface Props {
  visible: boolean;
  /** Nome de quem está escolhendo (aparece no título). */
  who: string;
  current: AvatarId;
  /** Mascotes que outros jogadores já escolheram → nome deles. */
  takenBy: Partial<Record<AvatarId, string>>;
  /** Escolhe o mascote. `false` = alguém pegou esse mascote antes (só acontece online). */
  onPick: (avatar: AvatarId) => void | boolean | Promise<boolean | void>;
  onClose: () => void;
}

/** Folha de baixo com o carrossel de mascotes. Escolher é só tocar; "Pronto" fecha. */
export function AvatarSheet({ visible, who, current, takenBy, onPick, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [lost, setLost] = useState(false);
  const total = Object.keys(AVATARS).length;
  const available = total - Object.keys(takenBy).length;

  useEffect(() => {
    if (!lost) return;
    const timer = setTimeout(() => setLost(false), 3000);
    return () => clearTimeout(timer);
  }, [lost]);

  async function pick(avatar: AvatarId) {
    setLost(false);
    if ((await onPick(avatar)) === false) setLost(true);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-night-950/75">
        <Pressable className="flex-1" onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar" />
        <View
          className="gap-4 rounded-t-4xl border-t border-white/10 bg-night-850 pt-3"
          style={{ paddingBottom: insets.bottom + 20, boxShadow: '0px -24px 48px rgba(14, 2, 20, 0.5)' }}>
          <View className="h-1 w-10 self-center rounded-full bg-white/20" />
          <View className="items-center gap-1 px-5">
            <Text className="font-label text-[11px] uppercase tracking-[3px] text-mist-400">Escolha o mascote</Text>
            <Text className="font-heading text-xl text-mist-50" numberOfLines={1}>
              {who}
            </Text>
          </View>

          <View className="items-center gap-2">
            <Avatar avatar={current} size={112} active />
            <Text className="font-heading text-base text-mist-50">{AVATARS[current].name}</Text>
          </View>

          <AvatarCarousel value={current} takenBy={takenBy} onPick={pick} />

          <View className="min-h-[20px] items-center justify-center px-5">
            {lost ? (
              <Animated.View entering={FadeIn.duration(200)} className="flex-row items-center gap-2">
                <Icon name="alert-circle" size={16} color={palette.coral[400]} />
                <Text className="font-body text-xs text-mist-50">Alguém acabou de escolher esse. Escolha outro!</Text>
              </Animated.View>
            ) : (
              <Text className="font-body text-xs text-mist-400">
                Deslize para os lados · {available} de {total} disponíveis
              </Text>
            )}
          </View>

          <View className="px-5">
            <GradientButton label="Pronto" icon="checkmark" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
