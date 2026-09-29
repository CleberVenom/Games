import { Redirect, router } from 'expo-router';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import { Alert, BackHandler, Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Backdrop } from '../../components/Backdrop';
import { GradientButton } from '../../components/Buttons';
import { Icon } from '../../components/Icon';
import { ImitateView } from '../../components/online/ImitateView';
import { PlayerStatus, PlayerStrip } from '../../components/online/PlayerStrip';
import { PresentView } from '../../components/online/PresentView';
import { RoomLobby } from '../../components/online/RoomLobby';
import { RoundResults } from '../../components/online/RoundResults';
import { Podium } from '../../components/Podium';
import { PressableScale } from '../../components/PressableScale';
import { WheelOverlay } from '../../components/WheelOverlay';
import { isLastRound, playerOrder } from '../../online/room';
import { hostActions, useHostDriver } from '../../online/useHost';
import { useOnline } from '../../store/online';
import { palette } from '../../theme/tokens';

export default function OnlineRoomScreen() {
  const session = useOnline((s) => s.session);
  const closed = useOnline((s) => s.closed);
  if (!session && !closed) return <Redirect href="/online" />;
  return <Room />;
}

function Room() {
  const insets = useSafeAreaInsets();
  const session = useOnline((s) => s.session);
  const meta = useOnline((s) => s.meta);
  const players = useOnline((s) => s.players);
  const round = useOnline((s) => s.round);
  const scores = useOnline((s) => s.scores);
  const reactions = useOnline((s) => s.reactions);
  const closed = useOnline((s) => s.closed);
  const leave = useOnline((s) => s.leave);
  const [busy, setBusy] = useState(false);
  useHostDriver();

  const me = session?.uid ?? '';
  const isHost = Boolean(meta && meta.host === me);
  const ids = playerOrder(players);
  const hostName = meta ? (players[meta.host]?.name ?? 'o anfitrião') : 'o anfitrião';

  const exit = useCallback(() => {
    const go = () => {
      leave();
      router.dismissTo('/');
    };
    const message = isHost ? 'A sala será encerrada para todos.' : 'Você sai da sala e do placar.';
    if (Platform.OS === 'web') {
      if (window.confirm(`Sair da sala? ${message}`)) go();
      return;
    }
    Alert.alert('Sair da sala?', message, [
      { text: 'Continuar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: go },
    ]);
  }, [isHost, leave]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      exit();
      return true;
    });
    return () => sub.remove();
  }, [exit]);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  if (closed || !session) {
    return (
      <Centered insets={insets}>
        <Icon name="exit" size={36} color={palette.mist[400]} />
        <Text className="text-center font-heading text-xl text-mist-50">A sala foi encerrada</Text>
        <Text className="text-center font-body text-sm text-mist-400">O anfitrião saiu ou encerrou a partida.</Text>
        <GradientButton
          label="Voltar ao início"
          icon="home"
          onPress={() => {
            leave();
            router.dismissTo('/');
          }}
        />
      </Centered>
    );
  }

  if (!meta) {
    return (
      <Centered insets={insets}>
        <Text className="font-ui text-sm text-mist-400">Conectando à sala…</Text>
      </Centered>
    );
  }

  if (meta.status === 'finished') {
    return (
      <View className="flex-1 bg-night-950">
        <Podium
          players={ids.map((uid) => ({ id: uid, ...players[uid], best: players[uid].best ?? null }))}
          rounds={meta.totalRounds}
          insets={insets}
          onRematch={isHost ? () => run(hostActions.backToLobby) : undefined}
          onNewGame={exit}
          newGameLabel="Sair da sala"
        />
      </View>
    );
  }

  const statusOf = (uid: string): PlayerStatus =>
    !players[uid]?.online ? 'offline' : scores[uid] ? 'done' : round?.phase === 'imitating' ? 'waiting' : 'none';
  const playing = meta.status === 'playing' && round;

  return (
    <View className="flex-1 bg-night-950">
      <Backdrop />
      <View className="flex-1" style={{ paddingTop: insets.top + 8 }}>
        <View className="flex-row items-center px-5 pb-3">
          <View className="w-24 items-start">
            <PressableScale
              onPress={exit}
              accessibilityRole="button"
              accessibilityLabel="Sair da sala"
              className="h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
              <Icon name="close" size={20} color={palette.mist[200]} />
            </PressableScale>
          </View>
          <View className="flex-1 items-center">
            <Text className="font-label text-[11px] uppercase tracking-[3px] text-mist-400">
              {playing ? `Rodada ${round.number} de ${meta.totalRounds}` : 'Sala online'}
            </Text>
            <Text className="font-heading text-base text-mist-50">{session.code}</Text>
          </View>
          <View className="w-24 items-end">
            {isHost && <Text className="font-label text-[11px] uppercase tracking-[2px] text-amber-400">Anfitrião</Text>}
          </View>
        </View>

        {playing && <PlayerStrip ids={ids} players={players} me={me} status={statusOf} showScore />}

        <ScrollView
          className="flex-1"
          contentContainerClassName="grow gap-4 px-5 pt-4"
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          keyboardShouldPersistTaps="handled">
          {!playing ? (
            <RoomLobby
              code={session.code}
              me={me}
              host={meta.host}
              ids={ids}
              players={players}
              starting={busy}
              onStart={(pool) => run(() => hostActions.start(pool))}
            />
          ) : round.phase === 'imitating' ? (
            <ImitateView key={round.number} session={session} round={round} players={players} ids={ids} scores={scores} />
          ) : round.phase === 'presenting' ? (
            <PresentView
              key={`${round.number}:${round.presenting}`}
              session={session} round={round} players={players} scores={scores} reactions={reactions} />
          ) : (
            <RoundResults
              me={me}
              roundNumber={round.number}
              totalRounds={meta.totalRounds}
              players={players}
              scores={scores}
              reactions={reactions}
              hostName={hostName}
              action={
                isHost && round.phase === 'results'
                  ? isLastRound(meta, round)
                    ? { label: 'Ver o pódio', icon: 'trophy', onPress: () => run(hostActions.finish) }
                    : { label: 'Girar a roleta', icon: 'sync', onPress: () => run(hostActions.spin) }
                  : undefined
              }
            />
          )}
        </ScrollView>
      </View>

      {playing && round.phase === 'wheel' && round.nextModifier && (
        <WheelOverlay
          modifier={round.nextModifier}
          heading="Efeito para todos na próxima rodada"
          insets={insets}
          action={isHost ? { label: 'Próxima rodada', onPress: () => run(hostActions.next) } : undefined}
          waitingText={`Aguardando ${hostName} começar a próxima rodada…`}
        />
      )}
    </View>
  );
}

function Centered({ insets, children }: { insets: { top: number; bottom: number }; children: ReactNode }) {
  return (
    <View className="flex-1 bg-night-950">
      <Backdrop />
      <View className="flex-1 items-center justify-center gap-4 px-8" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
        {children}
      </View>
    </View>
  );
}
