import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { prepareMic } from '../audio/mic';
import { Avatar } from '../components/Avatar';
import { Backdrop } from '../components/Backdrop';
import { GradientButton } from '../components/Buttons';
import { Gradient } from '../components/Gradient';
import { Icon, IconName } from '../components/Icon';
import { LogoMark } from '../components/LogoMark';
import { PackPicker } from '../components/PackPicker';
import { PressableScale } from '../components/PressableScale';
import { REPLAYS_PER_TURN, roundsFor } from '../game/match';
import { poolFrom } from '../game/packs';
import { MAX_PLAYERS, MIN_PLAYERS, PLAYER_COLORS, PlayerColor } from '../game/types';
import { allPacks, useLibrary } from '../store/library';
import { useMatch } from '../store/match';
import { gradients, palette } from '../theme/tokens';

interface Draft {
  key: number;
  name: string;
  color: PlayerColor;
}

/** Próxima cor livre depois de `from`, na ordem da paleta. */
function nextFreeColor(from: PlayerColor, taken: Set<PlayerColor>): PlayerColor {
  const start = PLAYER_COLORS.indexOf(from);
  for (let k = 1; k <= PLAYER_COLORS.length; k++) {
    const c = PLAYER_COLORS[(start + k) % PLAYER_COLORS.length];
    if (!taken.has(c)) return c;
  }
  return from;
}

export default function LobbyScreen() {
  const insets = useSafeAreaInsets();
  const start = useMatch((s) => s.start);
  const nextKey = useRef(MIN_PLAYERS);
  const [players, setPlayers] = useState<Draft[]>(() =>
    PLAYER_COLORS.slice(0, MIN_PLAYERS).map((color, key) => ({ key, name: '', color })),
  );

  const add = () =>
    setPlayers((ps) => {
      if (ps.length >= MAX_PLAYERS) return ps;
      const color = nextFreeColor(PLAYER_COLORS[PLAYER_COLORS.length - 1], new Set(ps.map((p) => p.color)));
      return [...ps, { key: nextKey.current++, name: '', color }];
    });
  const remove = (key: number) => setPlayers((ps) => ps.filter((p) => p.key !== key));
  const rename = (key: number, name: string) =>
    setPlayers((ps) => ps.map((p) => (p.key === key ? { ...p, name } : p)));
  const recolor = (key: number) =>
    setPlayers((ps) => {
      const taken = new Set(ps.filter((p) => p.key !== key).map((p) => p.color));
      return ps.map((p) => (p.key === key ? { ...p, color: nextFreeColor(p.color, taken) } : p));
    });

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
      players.map(({ name, color }) => ({ name, color })),
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
              <Text className="font-display text-4xl tracking-tight text-mist-50">Mimic Mobile</Text>
              <Text className="max-w-[300px] text-center font-body text-base leading-6 text-mist-400">
                Ouça o som, imite com a sua voz e deixe a matemática dar a nota.
              </Text>
            </View>
          </View>

          <View
            className="gap-3 rounded-4xl border border-white/5 bg-night-850/80 p-5"
            style={{ boxShadow: '0px 24px 48px rgba(4, 5, 15, 0.55)' }}>
            <View className="mb-1 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Icon name="people" size={18} color={palette.violet[300]} />
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
                    onPress={() => recolor(p.key)}
                    accessibilityRole="button"
                    accessibilityLabel={`Trocar a cor do jogador ${i + 1}`}>
                    <Avatar label={p.name || String(i + 1)} color={p.color} size={44} />
                  </PressableScale>
                  <TextInput
                    value={p.name}
                    onChangeText={(name) => rename(p.key, name)}
                    placeholder={`Jogador ${i + 1}`}
                    placeholderTextColor={palette.mist[500]}
                    selectionColor={palette.violet[400]}
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
                className="h-14 flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-violet-400/40 bg-violet-500/5">
                <Icon name="person-add-outline" size={18} color={palette.violet[300]} />
                <Text className="font-label text-sm text-violet-300">Adicionar jogador</Text>
              </PressableScale>
            )}

            <Text className="px-1 font-body text-xs text-mist-500">Toque no avatar para trocar a cor.</Text>
          </View>

          <View className="gap-3">
            <View className="flex-row items-center justify-between px-1">
              <View className="flex-row items-center gap-2">
                <Icon name="albums" size={18} color={palette.violet[300]} />
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
        </ScrollView>

        <View className="gap-2 px-5 pt-3" style={{ paddingBottom: insets.bottom + 16 }}>
          <Text className="text-center font-ui text-xs text-mist-400">
            {pool.length === 0
              ? 'Escolha pelo menos um pack de sons'
              : `${players.length} jogadores · ${roundsFor(players.length)} rodadas · ${pool.length} sons`}
          </Text>
          <GradientButton
            label={checkingMic ? 'Verificando o microfone…' : 'Começar partida'}
            icon="arrow-forward"
            onPress={begin}
            disabled={checkingMic || pool.length === 0}
          />
        </View>
      </KeyboardAvoidingView>
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
