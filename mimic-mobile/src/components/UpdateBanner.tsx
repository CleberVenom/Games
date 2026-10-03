import { Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { formatWhen, UpdateView } from '../updates/updateView';
import { glow, gradients, palette, withAlpha } from '../theme/tokens';
import { Gradient } from './Gradient';
import { Icon, IconName } from './Icon';
import { LiveDot } from './online/LiveDot';
import { PressableScale } from './PressableScale';

interface Props {
  view: UpdateView;
  /** Andamento do download, de 0 a 1. */
  progress: number;
  publishedAt: Date | null;
  onUpdate: () => void;
}

function look(view: Exclude<UpdateView, 'none'>, publishedAt: Date | null, progress: number) {
  switch (view) {
    case 'available':
      return {
        icon: 'sparkles' as IconName,
        title: 'Nova versão disponível',
        text: publishedAt ? `Publicada em ${formatWhen(publishedAt)}. Leva poucos segundos.` : 'Leva poucos segundos.',
        action: 'Atualizar',
      };
    case 'downloading':
      return {
        icon: 'cloud-download' as IconName,
        title: 'Baixando a nova versão…',
        text: `${Math.round(progress * 100)}% · o jogo reinicia sozinho no fim`,
        action: null,
      };
    case 'ready':
      return {
        icon: 'refresh' as IconName,
        title: 'Pronto! Reiniciando…',
        text: 'Se o jogo não reiniciar sozinho, toque em Reiniciar.',
        action: 'Reiniciar',
      };
    case 'error':
      return {
        icon: 'cloud-offline' as IconName,
        title: 'Não deu para baixar',
        text: 'Confira a internet e tente de novo.',
        action: 'Tentar de novo',
      };
  }
}

/** Aviso de versão nova na tela inicial: um toque baixa a atualização e reinicia o jogo. */
export function UpdateBanner({ view, progress, publishedAt, onUpdate }: Props) {
  if (view === 'none') return null;
  const { icon, title, text, action } = look(view, publishedAt, progress);
  const accent = view === 'error' ? palette.coral[400] : palette.fuchsia[400];
  return (
    <Animated.View entering={FadeInDown.duration(300)}>
      <View
        accessibilityLiveRegion="polite"
        className="gap-3 rounded-3xl border p-4"
        style={{
          borderColor: withAlpha(accent, 0.35),
          backgroundColor: withAlpha(accent, view === 'error' ? 0.08 : 0.12),
          boxShadow: glow(accent, 32, 0.25, 8),
        }}>
        <View className="flex-row items-center gap-3">
          <Gradient
            colors={gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="h-11 w-11 items-center justify-center overflow-hidden rounded-2xl">
            <Icon name={icon} size={20} color={palette.mist[50]} />
          </Gradient>
          <View className="flex-1 gap-0.5">
            <View className="flex-row items-center gap-2">
              <Text className="font-heading text-base text-mist-50">{title}</Text>
              {view === 'downloading' && <LiveDot color={palette.mint[400]} />}
            </View>
            <Text className="font-body text-xs leading-4 text-mist-400">{text}</Text>
          </View>
        </View>
        {action && (
          <PressableScale
            onPress={onUpdate}
            accessibilityRole="button"
            accessibilityLabel={action}
            className="h-11 flex-row items-center justify-center gap-2 rounded-2xl"
            style={{ backgroundColor: accent }}>
            <Icon name={view === 'available' ? 'download' : 'refresh'} size={16} color={palette.night[950]} />
            <Text className="font-label text-sm text-night-950">{action}</Text>
          </PressableScale>
        )}
        {view === 'downloading' && (
          <View className="h-2 overflow-hidden rounded-full bg-white/10">
            <View
              className="h-2 rounded-full"
              style={{ width: `${Math.max(4, Math.round(progress * 100))}%`, backgroundColor: palette.mint[400] }}
            />
          </View>
        )}
      </View>
    </Animated.View>
  );
}
