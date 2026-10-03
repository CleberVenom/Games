import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Backdrop } from '../../components/Backdrop';
import { GradientButton } from '../../components/Buttons';
import { Gradient } from '../../components/Gradient';
import { Icon, IconName } from '../../components/Icon';
import { LiveDot } from '../../components/online/LiveDot';
import { PressableScale } from '../../components/PressableScale';
import { ProgressBar } from '../../components/ProgressBar';
import { normalizePackCode, PACK_CODE_LENGTH } from '../../online/packShare';
import { downloadSharedPack, fetchSharedPack, ShareError, SharedPackInfo } from '../../online/sharedPacks';
import { allPacks, useLibrary } from '../../store/library';
import { gradients, palette } from '../../theme/tokens';

type Step =
  | { kind: 'input' }
  | { kind: 'searching' }
  | { kind: 'found'; info: SharedPackInfo; have: boolean }
  | { kind: 'downloading'; info: SharedPackInfo; done: number }
  | { kind: 'done'; info: SharedPackInfo }
  | { kind: 'error'; message: string };

const ERRORS: Record<ShareError['reason'], string> = {
  missing: 'Código não encontrado. Confira as letras com quem compartilhou.',
  incomplete: 'Esse pack não terminou de ser enviado. Peça para quem compartilhou tentar de novo.',
  unavailable: 'Não foi possível baixar agora. Tente de novo.',
};

function describe(error: unknown): string {
  if (error instanceof ShareError) return ERRORS[error.reason];
  return 'Sem conexão com o servidor. Verifique a internet e tente de novo.';
}

const totalSeconds = (info: SharedPackInfo) =>
  Math.round(info.sounds.reduce((n, s) => n + s.durationMs, 0) / 1000);

/** Baixa um pack que um amigo compartilhou (código de 5 letras gerado no editor de pack dele). */
export default function DownloadPackScreen() {
  const insets = useSafeAreaInsets();
  const savePack = useLibrary((s) => s.savePack);
  const [code, setCode] = useState('');
  const [step, setStep] = useState<Step>({ kind: 'input' });
  const ready = code.length === PACK_CODE_LENGTH;
  const busy = step.kind === 'searching' || step.kind === 'downloading';

  async function search() {
    setStep({ kind: 'searching' });
    try {
      const info = await fetchSharedPack(code);
      const local = new Set(allPacks(useLibrary.getState().custom).flatMap((p) => p.sounds.map((s) => s.id)));
      setStep({ kind: 'found', info, have: info.sounds.every((s) => local.has(s.id)) });
    } catch (e) {
      setStep({ kind: 'error', message: describe(e) });
    }
  }

  async function download(info: SharedPackInfo) {
    setStep({ kind: 'downloading', info, done: 0 });
    try {
      const pack = await downloadSharedPack(info, (done) => setStep({ kind: 'downloading', info, done }));
      await savePack(pack);
      setStep({ kind: 'done', info });
    } catch (e) {
      setStep({ kind: 'error', message: describe(e) });
    }
  }

  const info = 'info' in step ? step.info : null;

  return (
    <View className="flex-1 bg-night-950">
      <Backdrop />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="gap-6 px-5"
          contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }}>
          <View className="flex-row items-center gap-3">
            <PressableScale
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              className="h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
              <Icon name="chevron-back" size={20} color={palette.mist[200]} />
            </PressableScale>
            <View>
              <Text className="font-label text-[11px] uppercase tracking-[3px] text-mist-400">Packs de amigos</Text>
              <Text className="font-heading text-xl text-mist-50">Baixar pack</Text>
            </View>
          </View>

          <Animated.View entering={FadeInDown.duration(300)}>
            <View className="gap-2">
              <Text className="font-display text-3xl leading-9 text-mist-50">Os sons do seu amigo, aqui.</Text>
              <Text className="font-body text-sm leading-5 text-mist-400">
                Quem criou o pack toca em Compartilhar no editor do pack e manda o código de 5 letras. O pack fica no
                seu celular para jogar quando quiser.
              </Text>
            </View>
          </Animated.View>

          <View className="flex-row gap-3">
            <TextInput
              value={code}
              onChangeText={(t) => {
                setCode(normalizePackCode(t));
                if (!busy) setStep({ kind: 'input' });
              }}
              placeholder="ABCDE"
              placeholderTextColor={palette.mist[500]}
              selectionColor={palette.cyan[400]}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!busy}
              maxLength={PACK_CODE_LENGTH}
              accessibilityLabel="Código do pack"
              className="h-14 min-w-0 flex-1 rounded-2xl border border-cyan-400/30 bg-night-800 text-center font-display text-2xl tracking-[8px] text-mist-50 web:outline-none"
            />
            <PressableScale
              onPress={search}
              disabled={!ready || busy}
              accessibilityRole="button"
              accessibilityLabel="Procurar pack"
              className={`h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-cyan-500/20 px-5 ${!ready || busy ? 'opacity-40' : ''}`}>
              <Text className="font-heading text-base text-cyan-300">
                {step.kind === 'searching' ? 'Procurando…' : 'Procurar'}
              </Text>
            </PressableScale>
          </View>

          {step.kind === 'error' && (
            <Animated.View entering={FadeInDown.duration(250)}>
              <View className="flex-row items-start gap-2 rounded-2xl bg-coral-400/10 p-4">
                <Icon name="alert-circle" size={18} color={palette.coral[400]} />
                <Text className="flex-1 font-body text-sm leading-5 text-mist-50">{step.message}</Text>
              </View>
            </Animated.View>
          )}

          {info && (
            <Animated.View entering={FadeInDown.duration(300)}>
              <View
                className="gap-4 rounded-4xl border border-white/5 bg-night-850/80 p-5"
                style={{ boxShadow: '0px 24px 48px rgba(14, 2, 20, 0.55)' }}>
                <View className="flex-row items-center gap-3">
                  <Gradient
                    colors={gradients.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="h-14 w-14 items-center justify-center overflow-hidden rounded-2xl">
                    <Icon name={info.icon as IconName} size={26} color={palette.mist[50]} />
                  </Gradient>
                  <View className="min-w-0 flex-1">
                    <Text className="font-heading text-lg text-mist-50" numberOfLines={2}>
                      {info.title}
                    </Text>
                    <Text className="font-body text-xs text-mist-400">
                      {info.sounds.length} {info.sounds.length === 1 ? 'som' : 'sons'} · {totalSeconds(info)} s no total
                    </Text>
                  </View>
                </View>

                <View className="flex-row flex-wrap gap-2">
                  {info.sounds.slice(0, 8).map((s) => (
                    <View key={s.id} className="rounded-full border border-white/5 bg-white/5 px-3 py-1">
                      <Text className="font-label text-xs text-mist-200" numberOfLines={1}>
                        {s.title}
                      </Text>
                    </View>
                  ))}
                  {info.sounds.length > 8 && (
                    <View className="rounded-full px-2 py-1">
                      <Text className="font-label text-xs text-mist-500">+{info.sounds.length - 8}</Text>
                    </View>
                  )}
                </View>

                {step.kind === 'found' &&
                  (step.have ? (
                    <Status icon="checkmark-circle" color={palette.mint[400]} text="Esse pack já está no seu celular." />
                  ) : !info.complete ? (
                    <Status icon="hourglass" color={palette.amber[400]} text={ERRORS.incomplete} />
                  ) : (
                    <GradientButton label="Baixar pack" icon="cloud-download" onPress={() => download(info)} />
                  ))}

                {step.kind === 'downloading' && (
                  <View className="gap-3">
                    <View className="flex-row items-center gap-2">
                      <LiveDot color={palette.cyan[400]} />
                      <Text className="font-label text-sm text-mist-200">
                        Baixando {Math.min(step.done + 1, info.sounds.length)} de {info.sounds.length} sons…
                      </Text>
                    </View>
                    <ProgressBar value={step.done / info.sounds.length} />
                  </View>
                )}

                {step.kind === 'done' && (
                  <Status
                    icon="checkmark-circle"
                    color={palette.mint[400]}
                    text="Pronto! O pack está nos seus packs e já vem marcado para a próxima partida."
                  />
                )}
              </View>
            </Animated.View>
          )}

          {step.kind === 'done' && (
            <GradientButton label="Voltar ao início" icon="home" onPress={() => router.back()} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Status({ icon, color, text }: { icon: IconName; color: string; text: string }) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-white/5 bg-white/5 p-4">
      <Icon name={icon} size={20} color={color} />
      <Text className="flex-1 font-body text-sm leading-5 text-mist-50">{text}</Text>
    </View>
  );
}
