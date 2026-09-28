import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, GestureResponderEvent, Platform, StyleSheet, Text, View } from 'react-native';

import { findLesson } from '../content/lessons';
import { getSong } from '../content/songs';
import { chartForKit, kitForLesson, kitForSong, lessonChart, songChart } from '../game/charts';
import { Difficulty, DIFFICULTY_LABEL, Piece } from '../game/types';
import { GameController, GameSetup, Phase } from '../play/controller';
import { Highway, HighwayLayout, KICK_ZONE_H } from '../play/Highway';
import { Hud } from '../play/Hud';
import { useLastResult } from '../store/lastResult';
import { getProfile, useProfile } from '../store/profile';
import { Button, H1, P } from '../ui/components';
import { lockLandscape, lockPortrait } from '../ui/orientation';
import { colors } from '../ui/theme';

type Params = { mode: 'lesson' | 'song'; id: string; difficulty?: Difficulty };

interface Built {
  setup: GameSetup;
  title: string;
}

function build(params: Params): Built | null {
  const profile = getProfile();
  if (params.mode === 'lesson') {
    const found = findLesson(params.id);
    if (!found) return null;
    const chart = lessonChart(found.lesson);
    const kit = kitForLesson(profile, found.lesson.id, chart);
    return {
      title: found.lesson.title,
      setup: { kit, chart: chartForKit(chart, kit), canFail: false, settings: profile.settings, backingTrack: null, audioOffset: 0 },
    };
  }
  const song = getSong(params.id);
  if (!song) return null;
  const difficulty = params.difficulty ?? 'facil';
  const kit = kitForSong(profile);
  return {
    title: `${song.title} · ${DIFFICULTY_LABEL[difficulty]}`,
    setup: {
      kit,
      chart: chartForKit(songChart(song, difficulty), kit),
      canFail: difficulty !== 'facil',
      settings: profile.settings,
      backingTrack: song.backingTrack,
      audioOffset: song.audioOffset ?? 0,
    },
  };
}

/** Teclas para jogar no navegador/teclado: A S D F G H J K = pistas, Espaço = bumbo. */
const KEYS = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k'];

function Game({ params, onRestart }: { params: Params; onRestart: () => void }) {
  const built = useMemo(() => build(params), [params]);
  const [phase, setPhase] = useState<Phase>('loading');
  const [layout, setLayout] = useState<HighwayLayout | null>(null);
  const field = useRef<View>(null);
  /** Posição da pista na janela (para converter pageX/pageY dos toques). */
  const origin = useRef({ x: 0, y: 0 });

  const controller = useMemo(() => {
    if (!built) return null;
    return new GameController(built.setup, {
      onPhase: setPhase,
      onFinish: (results, meanOffsetMs) => {
        const reward = useProfile.getState().record({ mode: params.mode, id: params.id, difficulty: params.difficulty, results });
        useLastResult.getState().set({ mode: params.mode, id: params.id, difficulty: params.difficulty, title: built.title, results, reward, meanOffsetMs });
        router.replace('/results');
      },
    });
  }, [built, params]);

  useEffect(() => {
    if (!controller) return;
    controller.load();
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') controller.pause();
    });
    return () => {
      sub.remove();
      controller.dispose();
    };
  }, [controller]);

  const lanes = controller?.handLanes ?? [];

  const hitAt = useCallback(
    (x: number, y: number) => {
      if (!controller || !layout) return;
      let piece: Piece;
      if (y >= layout.height - KICK_ZONE_H) piece = 'kick';
      else piece = lanes[Math.max(0, Math.min(lanes.length - 1, Math.floor((x / layout.width) * lanes.length)))];
      controller.hit(piece);
    },
    [controller, layout, lanes],
  );

  useEffect(() => {
    if (Platform.OS !== 'web' || !controller) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === 'Escape') return void controller.pause();
      if (e.key === ' ') {
        e.preventDefault();
        return controller.hit('kick');
      }
      const lane = KEYS.indexOf(e.key.toLowerCase());
      if (lane >= 0 && lane < lanes.length) controller.hit(lanes[lane]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [controller, lanes]);

  if (!built || !controller) {
    return (
      <View style={styles.center}>
        <H1>Não encontrado</H1>
        <Button title="Voltar" onPress={() => router.back()} />
      </View>
    );
  }

  const touchProps =
    Platform.OS === 'web'
      ? { onPointerDown: (e: { nativeEvent: { offsetX: number; offsetY: number } }) => hitAt(e.nativeEvent.offsetX, e.nativeEvent.offsetY) }
      : {
          // pageX/pageY são confiáveis com vários dedos (locationX pode vir relativo a outro alvo).
          onTouchStart: (e: GestureResponderEvent) => {
            for (const t of e.nativeEvent.changedTouches) hitAt(t.pageX - origin.current.x, t.pageY - origin.current.y);
          },
        };

  const { kit, chart } = built.setup;
  return (
    <View style={styles.root}>
      <StatusBar hidden />
      <View
        ref={field}
        style={styles.field}
        onLayout={(e) => {
          setLayout({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });
          field.current?.measureInWindow((x, y) => (origin.current = { x, y }));
        }}
      >
        {layout && (
          <Highway
            layout={layout}
            lanes={lanes}
            hand={controller.hand}
            kick={controller.kick}
            songTime={controller.songTime}
            flashes={controller.flashes}
            lookahead={controller.lookahead}
            bpm={chart.bpm}
            beatsPerBar={chart.beatsPerBar}
            doublePedal={kit.doublePedal}
            kitColor={kit.color}
          />
        )}
        <View style={StyleSheet.absoluteFill} collapsable={false} {...touchProps} />
        <Hud title={built.title} onPause={() => controller.pause()} onEnergy={() => controller.activateEnergy()} />
      </View>

      {phase === 'loading' && (
        <View style={styles.overlay}>
          <ActivityIndicator color={colors.accent} size="large" />
          <P muted style={{ marginTop: 12 }}>
            Afinando a bateria…
          </P>
        </View>
      )}
      {phase === 'ready' && (
        <View style={styles.overlay}>
          <H1 style={{ textAlign: 'center' }}>{built.title}</H1>
          <P muted style={{ textAlign: 'center', marginBottom: 16 }}>
            {kit.name} · {chart.bpm} BPM · {chart.notes.length} notas{'\n'}
            Toque na pista quando a nota cruzar a linha. Bumbo = faixa de baixo.
            {Platform.OS === 'web' ? '\nTeclado: A S D F G H J K nas pistas, Espaço no bumbo.' : ''}
          </P>
          <Button title="▶ Começar" onPress={() => controller.start()} style={{ minWidth: 220 }} />
          <Button title="Sair" variant="ghost" onPress={() => router.back()} style={{ marginTop: 4 }} />
        </View>
      )}
      {phase === 'paused' && (
        <View style={styles.overlay}>
          <H1>Pausado</H1>
          <Button title="Continuar" onPress={() => controller.resume()} style={{ minWidth: 220 }} />
          <Button title="Reiniciar" variant="secondary" onPress={onRestart} style={{ minWidth: 220, marginTop: 8 }} />
          <Button title="Sair" variant="ghost" onPress={() => router.back()} style={{ marginTop: 8 }} />
        </View>
      )}
      {phase === 'error' && (
        <View style={styles.overlay}>
          <H1>Não foi possível carregar o áudio</H1>
          <Button title="Sair" onPress={() => router.back()} />
        </View>
      )}
    </View>
  );
}

export default function Play() {
  const raw = useLocalSearchParams<Params>();
  const params = useMemo<Params>(
    () => ({ mode: raw.mode === 'song' ? 'song' : 'lesson', id: String(raw.id), difficulty: raw.difficulty as Difficulty | undefined }),
    [raw.mode, raw.id, raw.difficulty],
  );
  const [round, setRound] = useState(0);

  useEffect(() => {
    lockLandscape();
    return () => {
      lockPortrait();
    };
  }, []);

  return <Game key={round} params={params} onRestart={() => setRound((r) => r + 1)} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  field: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0B0B14E6', alignItems: 'center', justifyContent: 'center', padding: 24 },
});
