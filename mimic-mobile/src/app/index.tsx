import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { prepareMic } from '../audio/mic';
import { randomFreeAvatar } from '../avatars/avatars';
import { Avatar } from '../components/Avatar';
import { AvatarSheet } from '../components/AvatarSheet';
import { Backdrop } from '../components/Backdrop';
import { GradientButton } from '../components/Buttons';
import { Gradient } from '../components/Gradient';
import { Icon, IconName } from '../components/Icon';
import { LogoMark } from '../components/LogoMark';
import { PackPicker } from '../components/PackPicker';
import { PressableScale } from '../components/PressableScale';
import { UpdateBanner } from '../components/UpdateBanner';
import { REPLAYS_PER_TURN, ROUNDS } from '../game/match';
import { poolFrom } from '../game/packs';
import { AvatarId, MAX_PLAYERS, MIN_PLAYERS } from '../game/types';
import { allPacks, useLibrary } from '../store/library';
import { useMatch } from '../store/match';
import { gradients, palette } from '../theme/tokens';
import { appVersionLabel, installUpdate, useAppUpdate } from '../updates/useAppUpdate';

interface Draft {
  key: number;
  name: string;
  avatar: AvatarId;
}

export default function LobbyScreen() {
  const insets = useSafeAreaInsets();
  const start = useMatch((s) => s.start);
  const update = useAppUpdate();
  const nextKey = useRef(MIN_PLAYERS);
  const [players, setPlayers] = useState<Draft[]>(() => {
    const taken: AvatarId[] = [];
    return Array.from({ length: MIN_PLAYERS }, (_, key) => {
      const avatar = randomFreeAvatar(taken) ?? 'polvo';
      taken.push(avatar);
      return { key, name: '', avatar };
    });
  });
  /** Jogador cujo mascote está sendo escolhido (folha aberta). */
  const [choosing, setChoosing] = useState<number | null>(null);

  const add = () =>
    setPlayers((ps) => {
      if (ps.length >= MAX_PLAYERS) return ps;
      const avatar = randomFreeAvatar(ps.map((p) => p.avatar)) ?? 'polvo';
      return [...ps, { key: nextKey.current++, name: '', avatar }];
    });
  const remove = (key: number) => setPlayers((ps) => ps.filter((p) => p.key !== key));
  const rename = (key: number, name: string) =>
    setPlayers((ps) => ps.map((p) => (p.key === key ? { ...p, name } : p)));
  const pickAvatar = (key: number, avatar: AvatarId) =>
    setPlayers((ps) => (ps.some((p) => p.key !== key && p.avatar === avatar) ? ps : ps.map((p) => (p.key === key ? { ...p, avatar } : p))));
  const chosen = players.find((p) => p.key === choosing);
  const chosenIndex = players.findIndex((p) => p.key === choosing);
  const takenBy = Object.fromEntries(
    players.filter((p) => p.key !== choosing).map((p) => [p.avatar, p.name.trim() || `Jogador ${players.indexOf(p) + 1}`]),
  );

  const custom = useLibrary((s) => s.custom);
  const selectedIds = useLibrary((s) => s.selected);
  const toggle = useLibrary((s) => s.toggle);
  const packs = allPacks(custom);
  const selected = new Set(selectedIds);
  const pool = poolFrom(packs, selected);

  const [checkingMic, setCheckingMic] = useState(false);
  const begin = async () => {
    if (pool.length === 0) return;
    setCheckingMic(true);
    const granted = await prepareMic();
    setCheckingMic(false);
    if (!granted) {
      const message = 'O jogo precisa do microfone para gravar as imitações. Libere o acesso e tente de novo.';
      if (Platform.OS === 'web') window.alert(message);
      else
        Alert.alert('Microfone bloqueado', message, [
          { text: 'Agora não', style: 'cancel' },
          { text: 'Abrir configurações', onPress: () => Linking.openSettings() },
        ]);
      return;
    }
    start(
      players.map(({ name, avatar }) => ({ name, avatar })),
      pool,
    );
    router.push('/game');
  };

  return (
    <View className="flex-1 bg-night-950">
      <Backdrop />
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="gap-8 px-5 pb-6"
          contentContainerStyle={{ paddingTop: insets.top + 40 }}>
          <View className="items-center gap-5">
            <LogoMark />
            <View className="items-center gap-2">
              <Text className="font-display text-4xl tracking-tight text-mist-50">Imitashow</Text>
              <Text className="max-w-[300px] text-center font-body text-base leading-6 text-mist-400">
                Ouça o som, imite com a sua voz e deixe a matemática dar a nota.
              </Text>
            </View>
          </View>

          <UpdateBanner
            view={update.view}
            progress={update.progress}
            publishedAt={update.publishedAt}
            onUpdate={() => installUpdate(update.pending)}
          />

          <PressableScale
            onPress={() => router.push('/online')}
            accessibilityRole="button"
            accessibilityLabel="Jogar online com amigos"
            className="flex-row items-center gap-4 rounded-3xl border border-cyan-400/25 bg-cyan-500/10 p-4">
            <Gradient
              colors={gradients.listen}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="h-12 w-12 items-center justify-center overflow-hidden rounded-2xl">
              <Icon name="globe" size={24} color={palette.mist[50]} />
            </Gradient>
            <View className="flex-1">
              <Text className="font-heading text-base text-mist-50">Jogar online com amigos</Text>
              <Text className="font-body text-xs leading-4 text-mist-400">
                Cada um no seu celular, com código de sala e reações ao vivo
              </Text>
            </View>
            <Icon name="chevron-forward" size={20} color={palette.cyan[300]} />
          </PressableScale>

          <Text className="-mb-4 px-1 font-label text-[11px] uppercase tracking-[3px] text-mist-500">
            Ou no mesmo celular, passando a vez
          </Text>

          <View
            className="gap-3 rounded-4xl border border-white/5 bg-night-850/80 p-5"
            style={{ boxShadow: '0px 24px 48px rgba(14, 2, 20, 0.55)' }}>
            <View className="mb-1 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Icon name="people" size={18} color={palette.fuchsia[300]} />
                <Text className="font-heading text-lg text-mist-50">Jogadores</Text>
              </View>
              <Text className="font-label text-sm text-mist-400">
                {players.length}/{MAX_PLAYERS}
              </Text>
            </View>

            {players.map((p, i) => (
              <Animated.View
                key={p.key}
                entering={FadeInDown.duration(250)}
                exiting={FadeOut.duration(150)}
                layout={LinearTransition.duration(200)}>
                <View className="flex-row items-center gap-3 rounded-2xl border border-white/5 bg-night-800 py-2 pl-2 pr-2">
                  <PressableScale
                    onPress={() => setChoosing(p.key)}
                    accessibilityRole="button"
                    accessibilityLabel={`Escolher o mascote do jogador ${i + 1}`}>
                    <Avatar avatar={p.avatar} size={44} />
                    <View className="absolute -bottom-1 -right-1 h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-night-700">
                      <Icon name="swap-horizontal" size={11} color={palette.mist[200]} />
                    </View>
                  </PressableScale>
                  <TextInput
                    value={p.name}
                    onChangeText={(name) => rename(p.key, name)}
                    placeholder={`Jogador ${i + 1}`}
                    placeholderTextColor={palette.mist[500]}
                    selectionColor={palette.fuchsia[400]}
                    maxLength={16}
                    returnKeyType="done"
                    className="h-11 min-w-0 flex-1 font-label text-base text-mist-50 web:outline-none"
                  />
                  {players.length > MIN_PLAYERS && (
                    <PressableScale
                      onPress={() => remove(p.key)}
                      accessibilityRole="button"
                      accessibilityLabel={`Remover jogador ${i + 1}`}
                      className="h-10 w-10 items-center justify-center rounded-xl bg-white/5">
                      <Icon name="trash-outline" size={18} color={palette.mist[400]} />
                    </PressableScale>
                  )}
                </View>
              </Animated.View>
            ))}

            {players.length < MAX_PLAYERS && (
              <PressableScale
                onPress={add}
                accessibilityRole="button"
                className="h-14 flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-fuchsia-400/40 bg-fuchsia-500/5">
                <Icon name="person-add-outline" size={18} color={palette.fuchsia[300]} />
                <Text className="font-label text-sm text-fuchsia-300">Adicionar jogador</Text>
              </PressableScale>
            )}

            <Text className="px-1 font-body text-xs text-mist-500">Toque no mascote para escolher outro. Cada um tem o seu.</Text>
          </View>

          <View className="gap-3">
            <View className="flex-row items-center justify-between px-1">
              <View className="flex-row items-center gap-2">
                <Icon name="albums" size={18} color={palette.fuchsia[300]} />
                <Text className="font-heading text-lg text-mist-50">Packs de sons</Text>
              </View>
              <Text className="font-label text-sm text-mist-400">
                {pool.length} {pool.length === 1 ? 'som' : 'sons'}
              </Text>
            </View>
            <PackPicker packs={packs} selected={selected} onToggle={toggle} />
          </View>

          <View className="gap-3">
            <Text className="px-1 font-label text-[11px] uppercase tracking-[3px] text-mist-500">Como jogar</Text>
            <View className="flex-row gap-3">
              <Step icon="ear" title="Ouça" text={`Toca 1x, com ${REPLAYS_PER_TURN} repetição`} colors={gradients.listen} />
              <Step icon="mic" title="Imite" text="Uma única chance" colors={gradients.record} />
              <Step icon="trophy" title="Pontue" text="Nota de 0 a 100" colors={gradients.primary} />
            </View>
          </View>

          <Text className="text-center font-body text-[11px] text-mist-500">{appVersionLabel()}</Text>
        </ScrollView>

        <View className="gap-2 px-5 pt-3" style={{ paddingBottom: insets.bottom + 16 }}>
          <Text className="text-center font-ui text-xs text-mist-400">
            {pool.length === 0
              ? 'Escolha pelo menos um pack de sons'
              : `${players.length} jogadores · ${ROUNDS} rodadas · ${pool.length} sons`}
          </Text>
          <GradientButton
            label={checkingMic ? 'Verificando o microfone…' : 'Começar partida'}
            icon="arrow-forward"
            onPress={begin}
            disabled={checkingMic || pool.length === 0}
          />
        </View>
      </KeyboardAvoidingView>
      <AvatarSheet
        visible={chosen !== undefined}
        who={chosen ? chosen.name.trim() || `Jogador ${chosenIndex + 1}` : ''}
        current={chosen?.avatar ?? 'polvo'}
        takenBy={takenBy}
        onPick={(avatar) => {
          if (choosing !== null) pickAvatar(choosing, avatar);
        }}
        onClose={() => setChoosing(null)}
      />
    </View>
  );
}

interface StepProps {
  icon: IconName;
  title: string;
  text: string;
  colors: readonly [string, string, ...string[]];
}

function Step({ icon, title, text, colors }: StepProps) {
  return (
    <View className="flex-1 gap-3 rounded-3xl border border-white/5 bg-white/5 p-4">
      <Gradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="h-9 w-9 items-center justify-center overflow-hidden rounded-xl">
        <Icon name={icon} size={18} color={palette.mist[50]} />
      </Gradient>
      <View className="gap-0.5">
        <Text className="font-heading text-sm text-mist-50">{title}</Text>
        <Text className="font-body text-xs leading-4 text-mist-400">{text}</Text>
      </View>
    </View>
  );
}
