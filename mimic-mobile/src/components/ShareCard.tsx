import { useState } from 'react';
import { Platform, Share, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { needsReshare } from '../online/packShare';
import { sharePack } from '../online/sharedPacks';
import { CustomPack, useLibrary } from '../store/library';
import { palette, withAlpha } from '../theme/tokens';
import { Icon } from './Icon';
import { LiveDot } from './online/LiveDot';
import { PressableScale } from './PressableScale';
import { ProgressBar } from './ProgressBar';

type Sending = { done: number; total: number } | 'error' | null;

async function sendCode(title: string, code: string) {
  const message = `Baixe o pack "${title}" no Imitashow: Início → Baixar pack de amigo → código ${code}`;
  try {
    await Share.share({ message });
  } catch {
    if (Platform.OS === 'web') window.alert(message);
  }
}

/** Editor: envia o pack salvo para o Firebase e mostra o código para os amigos baixarem. */
export function ShareCard({ pack, dirty }: { pack: CustomPack; dirty: boolean }) {
  const savePack = useLibrary((s) => s.savePack);
  const [sending, setSending] = useState<Sending>(null);
  const code = !dirty && pack.share && !needsReshare(pack) ? pack.share.code : null;

  async function share() {
    setSending({ done: 0, total: pack.sounds.length });
    try {
      const next = await sharePack(pack, (done, total) => setSending({ done, total }));
      await savePack({ ...pack, share: { code: next, soundIds: pack.sounds.map((s) => s.id) } });
      setSending(null);
    } catch {
      setSending('error');
    }
  }

  const button = (label: string, onPress: () => void) => (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      className="h-12 flex-row items-center justify-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-500/15">
      <Icon name="share-social" size={18} color={palette.cyan[300]} />
      <Text className="font-label text-sm text-cyan-300">{label}</Text>
    </PressableScale>
  );

  return (
    <View
      className="gap-4 rounded-3xl border p-5"
      style={{ borderColor: withAlpha(palette.cyan[400], 0.18), backgroundColor: withAlpha(palette.cyan[400], 0.05) }}>
      <View className="flex-row items-center gap-3">
        <View
          className="h-11 w-11 items-center justify-center rounded-2xl"
          style={{ backgroundColor: withAlpha(palette.cyan[400], 0.15) }}>
          <Icon name="people" size={20} color={palette.cyan[300]} />
        </View>
        <View className="flex-1">
          <Text className="font-label text-[11px] uppercase tracking-[2px] text-cyan-300">Compartilhar com amigos</Text>
          <Text className="font-heading text-base text-mist-50">
            {code ? (pack.from ? 'Código deste pack' : 'Pack compartilhado') : 'Seus amigos ouvem e jogam'}
          </Text>
        </View>
      </View>

      {dirty ? (
        <Text className="font-body text-sm leading-5 text-mist-400">
          Salve as alterações para compartilhar o pack. Se ele já tinha um código, o pack novo ganha outro.
        </Text>
      ) : sending === 'error' ? (
        <Animated.View entering={FadeIn.duration(200)} className="gap-3">
          <Text className="font-body text-sm leading-5 text-coral-400">
            Não deu para enviar os sons. Confira a internet e tente de novo.
          </Text>
          {button('Tentar de novo', share)}
        </Animated.View>
      ) : sending ? (
        <Animated.View entering={FadeIn.duration(200)} className="gap-3">
          <View className="flex-row items-center gap-2">
            <LiveDot color={palette.cyan[400]} />
            <Text className="font-label text-sm text-mist-200">
              Enviando {Math.min(sending.done + 1, sending.total)} de {sending.total} sons…
            </Text>
          </View>
          <ProgressBar value={sending.done / sending.total} />
        </Animated.View>
      ) : code ? (
        <Animated.View entering={FadeIn.duration(250)} className="gap-3">
          <View className="items-center gap-1 rounded-2xl border border-white/5 bg-night-900/60 py-4">
            <Text
              accessibilityLabel={`Código ${code.split('').join(' ')}`}
              className="font-display text-4xl tracking-[10px] text-mist-50">
              {code}
            </Text>
            <Text className="font-body text-xs text-mist-400">Início → Baixar pack de amigo</Text>
          </View>
          {button('Enviar código', () => sendCode(pack.title, code))}
          <Text className="text-center font-body text-xs leading-4 text-mist-500">
            Nas salas online o pack vai sozinho para todos. Mudou o pack? Salve e compartilhe de novo.
          </Text>
        </Animated.View>
      ) : (
        <View className="gap-3">
          <Text className="font-body text-sm leading-5 text-mist-400">
            Gera um código: os amigos baixam o pack em Início → Baixar pack de amigo. Nas salas online ele vai sozinho
            para todos quando a partida começa.
          </Text>
          {button('Compartilhar pack', share)}
        </View>
      )}
    </View>
  );
}
