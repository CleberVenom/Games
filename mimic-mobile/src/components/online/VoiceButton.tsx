import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOut } from 'react-native-reanimated';

import { micOpen, mutedByOther } from '../../online/voice';
import { useOnline } from '../../store/online';
import { useVoice, useVoiceAllowed, voiceActions } from '../../store/voice';
import { glow, palette, withAlpha } from '../../theme/tokens';
import { Icon, IconName } from '../Icon';
import { PressableScale } from '../PressableScale';
import { LiveDot } from './LiveDot';

type VoiceLook = 'paused' | 'connecting' | 'open' | 'muted' | 'host' | 'denied' | 'error';

const LOOK: Record<VoiceLook, { icon: IconName; color: string; label: string; toast: string }> = {
  paused: {
    icon: 'mic-off',
    color: palette.mist[500],
    label: 'Voz pausada durante os sons',
    toast: 'Voz pausada durante os sons 🤫',
  },
  connecting: { icon: 'mic', color: palette.mint[400], label: 'Conectando a voz', toast: 'Conectando a voz…' },
  open: {
    icon: 'mic',
    color: palette.mint[400],
    label: 'Microfone aberto. Toque para mutar',
    toast: 'Microfone aberto: a sala te ouve',
  },
  muted: { icon: 'mic-off', color: palette.mist[200], label: 'Microfone mudo. Toque para falar', toast: 'Microfone mudo' },
  host: {
    icon: 'mic-off',
    color: palette.amber[400],
    label: 'O anfitrião mutou você. Toque para falar',
    toast: 'O anfitrião mutou o seu microfone',
  },
  denied: {
    icon: 'mic-off',
    color: palette.coral[400],
    label: 'Sem acesso ao microfone. Toque para tentar de novo',
    toast: 'Sem microfone: você só ouve a sala',
  },
  error: {
    icon: 'cloud-offline',
    color: palette.coral[400],
    label: 'Voz sem conexão. Toque para tentar de novo',
    toast: 'Voz sem conexão. Toque para tentar de novo',
  },
};

/**
 * Botão do chat de voz, fixo no canto de cima da sala (também sobre a roleta e o pódio). Mostra se o meu
 * microfone está aberto, brilha quando eu falo e fica pausado durante a imitação e a apresentação.
 */
export function VoiceButton({ top }: { top: number }) {
  const me = useOnline((s) => s.session?.uid ?? '');
  const allowed = useVoiceAllowed();
  const status = useVoice((s) => s.status);
  const mic = useVoice((s) => s.mics[me]);
  const speaking = useVoice((s) => Boolean(s.speaking[me]));
  const open = micOpen(me, mic);

  const view: VoiceLook = !allowed
    ? 'paused'
    : status === 'error'
      ? 'error'
      : status === 'connecting'
        ? 'connecting'
        : status === 'denied'
          ? 'denied'
          : open
            ? 'open'
            : mutedByOther(me, mic)
              ? 'host'
              : 'muted';
  const look = LOOK[view];
  const live = view === 'open' && speaking;

  const press = () => {
    if (view === 'open' || view === 'muted' || view === 'host') voiceActions.toggleMine();
    else if (view === 'error' || view === 'denied') voiceActions.retry();
  };

  return (
    <>
      <View pointerEvents="box-none" style={{ position: 'absolute', top, right: 20 }}>
        <PressableScale
          onPress={press}
          disabled={view === 'paused' || view === 'connecting'}
          accessibilityRole="button"
          accessibilityLabel={look.label}
          accessibilityState={{ disabled: view === 'paused' || view === 'connecting' }}
          className="h-11 w-11 items-center justify-center rounded-2xl border"
          style={{
            borderColor: withAlpha(look.color, view === 'paused' ? 0.2 : 0.45),
            backgroundColor: withAlpha(look.color, view === 'open' ? 0.18 : 0.08),
            boxShadow: live ? glow(palette.mint[400], 18, 0.8, 0) : undefined,
            opacity: view === 'paused' ? 0.7 : 1,
          }}>
          <Icon name={look.icon} size={20} color={look.color} />
          {view === 'connecting' && (
            <View className="absolute -right-1 -top-1">
              <LiveDot color={palette.mint[400]} />
            </View>
          )}
          {view === 'paused' && (
            <View className="absolute -bottom-1 -right-1 h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-night-950">
              <Icon name="pause" size={10} color={palette.mist[400]} />
            </View>
          )}
        </PressableScale>
      </View>
      <VoiceToast key={view} text={look.toast} top={top + 52} />
    </>
  );
}

/** Aviso curto embaixo do botão quando a voz muda de estado (some sozinho). */
function VoiceToast({ text, top }: { text: string; top: number }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 2600);
    return () => clearTimeout(timer);
  }, []);
  if (!visible) return null;
  return (
    <Animated.View
      pointerEvents="none"
      entering={FadeInUp.duration(220)}
      exiting={FadeOut.duration(200)}
      style={{ position: 'absolute', top, right: 20, maxWidth: 260 }}>
      <View
        accessibilityLiveRegion="polite"
        className="rounded-2xl border border-white/10 bg-night-800 px-3.5 py-2.5"
        style={{ boxShadow: '0px 12px 28px rgba(14, 2, 20, 0.6)' }}>
        <Text className="font-label text-xs text-mist-50">{text}</Text>
      </View>
    </Animated.View>
  );
}
