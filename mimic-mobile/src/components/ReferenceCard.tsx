import { Text, View } from 'react-native';

import type { SoundEffect } from '../game/modifiers';
import type { Pack } from '../game/packs';
import type { ReferenceSound } from '../game/sounds';
import type { Phase } from '../game/types';
import { gradients, palette } from '../theme/tokens';
import { Gradient } from './Gradient';
import { Icon, IconName } from './Icon';
import { PressableScale } from './PressableScale';

const STATUS: Record<Phase, string> = {
  handoff: 'Toca sozinho quando o jogador estiver pronto',
  listening: 'Tocando agora…',
  ready: 'Repetição já usada',
  recording: 'Referência encerrada',
  analyzing: 'Referência encerrada',
  result: 'Referência encerrada',
  wheel: 'Referência encerrada',
  finished: 'Referência encerrada',
};

const PLAYING_WITH: Record<SoundEffect, string> = {
  echo: 'Tocando com eco…',
  distortion: 'Tocando distorcido…',
  fast: 'Tocando acelerado…',
  telephone: 'Tocando como numa ligação…',
};

interface Props {
  sound: ReferenceSound;
  /** Pack do som (título e ícone). */
  pack: Pick<Pack, 'title' | 'icon'>;
  phase: Phase;
  replaysLeft: number;
  /** A roleta tirou a repetição deste turno. */
  replayBlocked: boolean;
  /** Sabotagem de som da roleta aplicada à referência. */
  effect: SoundEffect | null;
  onReplay: () => void;
}

/** O som que deve ser imitado, com o botão da repetição permitida. */
export function ReferenceCard({ sound, pack, phase, replaysLeft, replayBlocked, effect, onReplay }: Props) {
  const seconds = (sound.durationMs / 1000).toFixed(1).replace('.', ',');
  const canReplay = phase === 'ready' && replaysLeft > 0;

  return (
    <View className="flex-row items-center gap-4 rounded-3xl border border-white/5 bg-night-800/70 p-4">
      <Gradient
        colors={gradients.listen}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="h-14 w-14 items-center justify-center overflow-hidden rounded-2xl">
        <Icon name={pack.icon as IconName} size={26} color={palette.mist[50]} />
      </Gradient>
      <View className="flex-1 gap-0.5">
        <Text className="font-label text-[11px] uppercase tracking-[2px] text-cyan-400" numberOfLines={1}>
          {pack.title} · {seconds} s
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
          <Text className="font-body text-xs text-mist-400">
            {phase === 'listening' && effect
              ? PLAYING_WITH[effect]
              : phase === 'ready' && replayBlocked
                ? 'Sem repetição nesta vez (roleta)'
                : STATUS[phase]}
          </Text>
        )}
      </View>
    </View>
  );
}
