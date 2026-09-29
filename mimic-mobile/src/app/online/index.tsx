import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { prepareMic } from '../../audio/mic';
import { Backdrop } from '../../components/Backdrop';
import { GradientButton } from '../../components/Buttons';
import { Gradient } from '../../components/Gradient';
import { Icon, IconName } from '../../components/Icon';
import { PressableScale } from '../../components/PressableScale';
import { RoomError } from '../../online/api';
import { onlineConfigured } from '../../online/firebase';
import { normalizeCode } from '../../online/room';
import { useOnline } from '../../store/online';
import { gradients, palette } from '../../theme/tokens';

const NAME_KEY = 'mimic.online.name';

const JOIN_ERROR: Record<string, string> = {
  missing: 'Sala não encontrada. Confira o código com quem criou.',
  started: 'Essa partida já começou. Peça para o anfitrião voltar ao lobby.',
  full: 'A sala está cheia (máximo de 6 jogadores).',
  unavailable: 'Não foi possível criar a sala agora. Tente de novo.',
};

function describe(error: unknown): string {
  if (error instanceof RoomError) return JOIN_ERROR[error.reason] ?? JOIN_ERROR.unavailable;
  return 'Sem conexão com o servidor. Verifique a internet e tente de novo.';
}

export default function OnlineEntryScreen() {
  const insets = useSafeAreaInsets();
  const create = useOnline((s) => s.create);
  const join = useOnline((s) => s.join);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(NAME_KEY)
      .then((saved) => saved && setName(saved))
      .catch(() => {});
  }, []);

  const configured = onlineConfigured();
  const playerName = name.trim() || 'Jogador';

  async function go(kind: 'create' | 'join') {
    setError(null);
    setBusy(kind);
    try {
      if (!(await prepareMic())) {
        setError('O jogo precisa do microfone para gravar as imitações. Libere o acesso e tente de novo.');
        return;
      }
      AsyncStorage.setItem(NAME_KEY, playerName).catch(() => {});
      if (kind === 'create') await create(playerName);
      else await join(code, playerName);
      router.replace('/online/room');
    } catch (e) {
      setError(describe(e));
    } finally {
      setBusy(null);
    }
  }

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
              <Text className="font-label text-[11px] uppercase tracking-[3px] text-mist-400">Com amigos</Text>
              <Text className="font-heading text-xl text-mist-50">Jogar online</Text>
            </View>
          </View>

          <Animated.View entering={FadeInDown.duration(300)}>
            <View className="gap-2">
              <Text className="font-display text-3xl leading-9 text-mist-50">Cada um no seu celular.</Text>
              <Text className="font-body text-sm leading-5 text-mist-400">
                Todos ouvem o mesmo som e imitam ao mesmo tempo. Depois, as imitações são apresentadas uma a uma, com
                reações ao vivo.
              </Text>
            </View>
          </Animated.View>

          {!configured ? (
            <View className="gap-3 rounded-3xl border border-amber-400/30 bg-amber-400/10 p-5">
              <View className="flex-row items-center gap-2">
                <Icon name="construct" size={18} color={palette.amber[400]} />
                <Text className="font-heading text-base text-mist-50">Falta ligar o servidor</Text>
              </View>
              <Text className="font-body text-sm leading-5 text-mist-200">
                O modo online usa um projeto Firebase (gratuito). Assim que ele for criado e configurado, é só gerar o
                app de novo que esta tela libera as salas.
              </Text>
            </View>
          ) : (
            <>
              <View className="gap-2">
                <Text className="px-1 font-label text-[11px] uppercase tracking-[3px] text-mist-500">Seu nome</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Como os amigos vão te ver"
                  placeholderTextColor={palette.mist[500]}
                  selectionColor={palette.violet[400]}
                  maxLength={16}
                  className="h-14 min-w-0 rounded-2xl border border-white/10 bg-night-800 px-4 font-label text-base text-mist-50 web:outline-none"
                />
              </View>

              <Option
                icon="add-circle"
                colors={gradients.primary}
                title="Criar uma sala"
                text="Você escolhe os packs e começa a partida quando todos entrarem."
              />
              <GradientButton
                label={busy === 'create' ? 'Criando a sala…' : 'Criar sala'}
                icon="arrow-forward"
                onPress={() => go('create')}
                disabled={busy !== null}
              />

              <View className="flex-row items-center gap-3 px-1">
                <View className="h-px flex-1 bg-white/10" />
                <Text className="font-label text-xs uppercase tracking-[2px] text-mist-500">ou</Text>
                <View className="h-px flex-1 bg-white/10" />
              </View>

              <Option
                icon="enter"
                colors={gradients.listen}
                title="Entrar numa sala"
                text="Digite o código de 4 letras que o anfitrião mandou."
              />
              <View className="flex-row gap-3">
                <TextInput
                  value={code}
                  onChangeText={(t) => setCode(normalizeCode(t))}
                  placeholder="ABCD"
                  placeholderTextColor={palette.mist[500]}
                  selectionColor={palette.cyan[400]}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={4}
                  accessibilityLabel="Código da sala"
                  className="h-14 min-w-0 flex-1 rounded-2xl border border-cyan-400/30 bg-night-800 text-center font-display text-2xl tracking-[8px] text-mist-50 web:outline-none"
                />
                <PressableScale
                  onPress={() => go('join')}
                  disabled={code.length !== 4 || busy !== null}
                  accessibilityRole="button"
                  accessibilityLabel="Entrar na sala"
                  className={`h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-cyan-500/20 px-5 ${code.length !== 4 || busy ? 'opacity-40' : ''}`}>
                  <Text className="font-heading text-base text-cyan-300">
                    {busy === 'join' ? 'Entrando…' : 'Entrar'}
                  </Text>
                </PressableScale>
              </View>

              {error && (
                <Animated.View entering={FadeInDown.duration(250)}>
                  <View className="flex-row items-start gap-2 rounded-2xl bg-coral-400/10 p-4">
                    <Icon name="alert-circle" size={18} color={palette.coral[400]} />
                    <Text className="flex-1 font-body text-sm leading-5 text-mist-50">{error}</Text>
                  </View>
                </Animated.View>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Option({
  icon,
  colors,
  title,
  text,
}: {
  icon: IconName;
  colors: readonly [string, string, ...string[]];
  title: string;
  text: string;
}) {
  return (
    <View className="flex-row items-center gap-4 px-1">
      <Gradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="h-11 w-11 items-center justify-center overflow-hidden rounded-2xl">
        <Icon name={icon} size={22} color={palette.mist[50]} />
      </Gradient>
      <View className="flex-1">
        <Text className="font-heading text-base text-mist-50">{title}</Text>
        <Text className="font-body text-xs leading-4 text-mist-400">{text}</Text>
      </View>
    </View>
  );
}
