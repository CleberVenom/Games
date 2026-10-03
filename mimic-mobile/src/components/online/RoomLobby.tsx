import { useState } from 'react';
import { Platform, Share, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ROUNDS } from '../../game/match';
import { poolFrom } from '../../game/packs';
import { MAX_ROOM_PLAYERS, MIN_PLAYERS } from '../../game/types';
import type { RoomPlayer } from '../../online/room';
import { useRoomPacks } from '../../online/roomPacks';
import { micOpen, mutedByOther } from '../../online/voice';
import { allPacks, useLibrary } from '../../store/library';
import { useOnline } from '../../store/online';
import { useVoice, useVoiceAllowed, voiceActions } from '../../store/voice';
import { palette } from '../../theme/tokens';
import { AvatarSheet } from '../AvatarSheet';
import { GradientButton } from '../Buttons';
import { Icon } from '../Icon';
import { PackPicker } from '../PackPicker';
import { PressableScale } from '../PressableScale';
import { LiveDot } from './LiveDot';
import { VoiceAvatar } from './VoiceAvatar';

interface Props {
  code: string;
  me: string;
  host: string;
  ids: string[];
  players: Record<string, RoomPlayer>;
  onStart: (pool: string[]) => void;
  starting: boolean;
}

async function invite(code: string) {
  const message = `Bora jogar Imitashow? Abra o app, toque em "Jogar online" e entre na sala ${code}.`;
  try {
    await Share.share({ message });
  } catch {
    if (Platform.OS === 'web') window.alert(message);
  }
}

/** Sala antes de começar: código para convidar, quem já entrou e, para o anfitrião, os packs e o botão de começar. */
export function RoomLobby({ code, me, host, ids, players, onStart, starting }: Props) {
  const isHost = me === host;
  const selected = new Set(useLibrary((s) => s.selected));
  const toggle = useLibrary((s) => s.toggle);
  const custom = useLibrary((s) => s.custom);
  // Os packs criados (ou baixados) neste celular sobem ao começar e os convidados baixam sozinhos.
  const packs = allPacks(custom);
  const pool = poolFrom(packs, selected);
  const mine = custom.filter((p) => selected.has(p.id)).length;
  const sending = useRoomPacks((s) => s.sending);
  const sent = useRoomPacks((s) => `${Math.min(s.done + 1, s.total)}/${s.total}`);
  const online = ids.filter((uid) => players[uid]?.online).length;
  const voice = useVoiceAllowed();
  const mics = useVoice((s) => s.mics);
  const speaking = useVoice((s) => s.speaking);
  const pickAvatar = useOnline((s) => s.pickAvatar);
  const [choosing, setChoosing] = useState(false);
  /** Mascotes dos outros jogadores → nome deles (ficam bloqueados no carrossel). */
  const takenBy = Object.fromEntries(ids.filter((uid) => uid !== me).map((uid) => [players[uid].avatar, players[uid].name]));

  return (
    <View className="gap-6">
      <Animated.View entering={FadeInDown.duration(300)}>
        <View
          className="items-center gap-3 rounded-4xl border border-white/5 bg-night-850/80 px-5 py-6"
          style={{ boxShadow: '0px 24px 48px rgba(14, 2, 20, 0.55)' }}>
          <Text className="font-label text-[11px] uppercase tracking-[3px] text-mist-400">Código da sala</Text>
          <Text
            accessibilityLabel={`Código ${code.split('').join(' ')}`}
            className="font-display text-6xl tracking-[14px] text-mist-50">
            {code}
          </Text>
          <PressableScale
            onPress={() => invite(code)}
            accessibilityRole="button"
            className="h-11 flex-row items-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-500/15 px-4">
            <Icon name="share-social" size={16} color={palette.cyan[300]} />
            <Text className="font-label text-sm text-cyan-300">Convidar amigos</Text>
          </PressableScale>
        </View>
      </Animated.View>

      <View className="gap-3">
        <View className="flex-row items-center justify-between px-1">
          <View className="flex-row items-center gap-2">
            <Icon name="people" size={18} color={palette.fuchsia[300]} />
            <Text className="font-heading text-lg text-mist-50">Na sala</Text>
          </View>
          <Text className="font-label text-sm text-mist-400">{ids.length}/{MAX_ROOM_PLAYERS}</Text>
        </View>
        {me in players && (
          <Text className="-mt-1 px-1 font-body text-xs text-mist-400">Toque no seu mascote para trocar. Cada um tem o seu.</Text>
        )}
        {ids.map((uid) => {
          const p = players[uid];
          const talking = voice && p.online;
          const open = micOpen(uid, mics[uid]);
          return (
            <Animated.View key={uid} entering={FadeInDown.duration(250)}>
              <View className="flex-row items-center gap-3 rounded-2xl border border-white/5 bg-night-800 p-2 pr-4">
                {uid === me ? (
                  <PressableScale
                    onPress={() => setChoosing(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Escolher outro mascote">
                    <VoiceAvatar
                      avatar={p.avatar}
                      size={44}
                      active
                      speaking={talking && Boolean(speaking[uid])}
                      muted={talking && !open}
                    />
                    <View className="absolute -bottom-1 -right-1 h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-night-700">
                      <Icon name="swap-horizontal" size={11} color={palette.mist[200]} />
                    </View>
                  </PressableScale>
                ) : (
                  <VoiceAvatar
                    avatar={p.avatar}
                    size={44}
                    speaking={talking && Boolean(speaking[uid])}
                    muted={talking && !open}
                  />
                )}
                <View className="flex-1">
                  <Text className="font-label text-base text-mist-50" numberOfLines={1}>
                    {p.name}
                    {uid === me ? ' (você)' : ''}
                  </Text>
                  <Text className="font-body text-xs text-mist-400">
                    {uid === host ? 'Anfitrião' : 'Convidado'}
                    {talking && !open ? (mutedByOther(uid, mics[uid]) ? ' · mutado pelo anfitrião' : ' · mudo') : ''}
                  </Text>
                </View>
                {uid === host && <Icon name="star" size={16} color={palette.amber[400]} />}
                {talking && isHost && uid !== me && open && (
                  <PressableScale
                    onPress={() => voiceActions.mute(uid)}
                    accessibilityRole="button"
                    accessibilityLabel={`Mutar ${p.name}`}
                    className="h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                    <Icon name="mic" size={18} color={palette.mint[400]} />
                  </PressableScale>
                )}
                <View
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: p.online ? palette.mint[400] : palette.mist[500] }}
                />
              </View>
            </Animated.View>
          );
        })}
      </View>

      {isHost ? (
        <View className="gap-3">
          <View className="flex-row items-center justify-between px-1">
            <View className="flex-row items-center gap-2">
              <Icon name="albums" size={18} color={palette.fuchsia[300]} />
              <Text className="font-heading text-lg text-mist-50">Packs da partida</Text>
            </View>
            <Text className="font-label text-sm text-mist-400">{pool.length} sons</Text>
          </View>
          <PackPicker packs={packs} selected={selected} onToggle={toggle} editable={false} />
          <Text className="px-1 text-center font-ui text-xs text-mist-400">
            {online < MIN_PLAYERS
              ? 'Chame pelo menos mais 1 amigo para começar'
              : pool.length === 0
                ? 'Escolha pelo menos um pack de sons'
                : `${online} jogadores · ${ROUNDS} rodadas · ${pool.length} sons`}
            {mine > 0 && online >= MIN_PLAYERS && pool.length > 0 && '\nSeus packs vão para os celulares de todos ao começar'}
          </Text>
          <GradientButton
            label={sending ? `Enviando seus packs… ${sent}` : starting ? 'Começando…' : 'Começar partida'}
            icon="play"
            onPress={() => onStart(pool)}
            disabled={starting || online < MIN_PLAYERS || pool.length === 0}
          />
        </View>
      ) : (
        <View className="flex-row items-center gap-3 rounded-3xl border border-white/5 bg-white/5 p-5">
          <LiveDot color={palette.fuchsia[400]} />
          <Text className="flex-1 font-ui text-sm text-mist-200">
            Aguardando {players[host]?.name ?? 'o anfitrião'} escolher os packs e começar…
          </Text>
        </View>
      )}
      <AvatarSheet
        visible={choosing}
        who={players[me]?.name ?? ''}
        current={players[me]?.avatar ?? 'polvo'}
        takenBy={takenBy}
        onPick={pickAvatar}
        onClose={() => setChoosing(false)}
      />
    </View>
  );
}
