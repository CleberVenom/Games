import { Text, View } from 'react-native';

import { ReferenceSound, SoundCategory } from '../game/sounds';
import type { Phase } from '../game/types';
import { gradients, palette } from '../theme/tokens';
import { Gradient } from './Gradient';
import { Icon, IconName } from './Icon';
import { PressableScale } from './PressableScale';

const CATEGORY_ICON: Record<SoundCategory, IconName> = {
  Animais: 'paw',
  Veículos: 'car-sport',
  Casa: 'home',
  Efeitos: 'flash',
  Memes: 'happy',
};

const STATUS: Record<Phase, string> = {
  handoff: 'Toca sozinho quando o jogador estiver pronto',
  listening: 'Tocando agora…',
  ready: 'Repetição já usada',
  recording: 'Referência encerrada',
  analyzing: 'Referência encerrada',
  result: 'Referência encerrada',
};

interface Props {
  sound: ReferenceSound;
  phase: Phase;
  replaysLeft: number;
  onReplay: () => void;
}

/** O som que deve ser imitado, com o botão da repetição permitida. */
export function ReferenceCard({ sound, phase, replaysLeft, onReplay }: Props) {
  const seconds = (sound.durationMs / 1000).toFixed(1).replace('.', ',');
  const canReplay = phase === 'ready' && replaysLeft > 0;

  return (
    <View className="flex-row items-center gap-4 rounded-3xl border border-white/5 bg-night-800/70 p-4">
      <Gradient
        colors={gradients.listen}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="h-14 w-14 items-center justify-center overflow-hidden rounded-2xl">
        <Icon name={CATEGORY_ICON[sound.category]} size={26} color={palette.mist[50]} />
      </Gradient>
      <View className="flex-1 gap-0.5">
        <Text className="font-label text-[11px] uppercase tracking-[2px] text-cyan-400">
          {sound.category} · {seconds} s
        </Text>
        <Text className="font-heading text-lg text-mist-50" numberOfLines={1}>
          {sound.title}
        </Text>
        {canReplay ? (
          <PressableScale
            onPress={onReplay}
            accessibilityRole="button"
            accessibilityLabel="Ouvir a referência de novo"
            className="mt-1 flex-row items-center gap-1.5 self-start rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5">
            <Icon name="repeat" size={14} color={palette.cyan[300]} />
            <Text className="font-label text-xs text-cyan-300">Ouvir de novo ({replaysLeft}x)</Text>
          </PressableScale>
        ) : (
          <Text className="font-body text-xs text-mist-400">{STATUS[phase]}</Text>
        )}
      </View>
    </View>
  );
}
