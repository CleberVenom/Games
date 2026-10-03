import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { deleteAudio, readPickedFile, saveAudio } from '../../audio/customAudio';
import { engine } from '../../audio/engine';
import { ClipProblem, importReport, PROBLEM_NOTICE, SkippedFile } from '../../audio/importReport';
import { prepareMic, startRecording, stopRecording } from '../../audio/mic';
import { useVisualizer } from '../../audio/useVisualizerLevels';
import { BAR_COUNT, Bars } from '../../components/AudioVisualizer';
import { Backdrop } from '../../components/Backdrop';
import { GradientButton } from '../../components/Buttons';
import { Gradient } from '../../components/Gradient';
import { hapticImpact } from '../../components/haptics';
import { Icon, IconName } from '../../components/Icon';
import { LiveDot } from '../../components/online/LiveDot';
import { PressableScale } from '../../components/PressableScale';
import { ProgressBar } from '../../components/ProgressBar';
import { ShareCard } from '../../components/ShareCard';
import { CLIP_RATE, encodeWav, MAX_CLIP_SECONDS, MIN_CLIP_SECONDS, prepareClip, secondsText } from '../../dsp/clip';
import { CustomSound, newId, useLibrary } from '../../store/library';
import { glow, gradients, palette, withAlpha } from '../../theme/tokens';

const ICONS: IconName[] = ['mic', 'happy', 'flame', 'planet', 'game-controller', 'musical-notes', 'skull', 'heart', 'star', 'paw'];

type Mode = 'idle' | 'recording' | 'processing';

function notify(title: string, message: string) {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}

function confirm(title: string, message: string, action: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onYes();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: action, style: 'destructive', onPress: onYes },
  ]);
}

/** "meu_audio-final.mp3" → "meu audio final". */
function titleFromFile(name: string): string {
  return name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 40) || 'Som importado';
}

const seconds = (ms: number) => `${(ms / 1000).toFixed(1).replace('.', ',')} s`;

/** Editor de pack criado no app: nome, ícone e sons gravados pelo microfone ou importados. */
export default function PackEditorScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const existing = useLibrary((s) => s.custom.find((p) => p.id === id));
  const savePack = useLibrary((s) => s.savePack);
  const deletePack = useLibrary((s) => s.deletePack);

  const [packId] = useState(() => existing?.id ?? newId('pack'));
  const [title, setTitle] = useState(existing?.title ?? '');
  const [icon, setIcon] = useState(existing?.icon ?? 'mic');
  const [sounds, setSounds] = useState<CustomSound[]>(existing?.sounds ?? []);
  const [mode, setMode] = useState<Mode>('idle');
  const [playing, setPlaying] = useState<string | null>(null);
  /** Andamento da importação de vários arquivos de uma vez. */
  const [importing, setImporting] = useState<{ done: number; total: number; name: string } | null>(null);
  /** Sons gravados/importados nesta edição (o áudio é apagado se o jogador descartar). */
  const created = useRef<string[]>([]);
  /** O jogador descartou ou saiu da tela: a importação em andamento para e não deixa áudio solto. */
  const leaving = useRef(false);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const viz = useVisualizer(mode === 'recording' ? 'recording' : 'idle', BAR_COUNT);

  const saved = existing?.sounds ?? [];
  const dirty =
    title !== (existing?.title ?? '') ||
    icon !== (existing?.icon ?? 'mic') ||
    sounds.length !== saved.length ||
    sounds.some((s, i) => s.id !== saved[i]?.id || s.title !== saved[i]?.title);

  useEffect(
    () => () => {
      leaving.current = true;
      clearTimeout(stopTimer.current);
      engine.stop();
    },
    [],
  );

  /** Corta o silêncio, ajusta o volume e guarda o som; devolve o motivo se ele não entrar. */
  async function addClip(samples: Float32Array, rate: number, soundTitle: string): Promise<ClipProblem | null> {
    const clip = prepareClip(samples, rate);
    if (!clip) return 'silent';
    if (clip.length / CLIP_RATE < MIN_CLIP_SECONDS) return 'short';
    const soundId = newId('sound');
    await saveAudio(soundId, encodeWav(clip, CLIP_RATE));
    if (leaving.current) {
      await deleteAudio(soundId).catch(() => {});
      return null;
    }
    created.current.push(soundId);
    setSounds((list) => [...list, { id: soundId, title: soundTitle, durationMs: Math.round((clip.length / CLIP_RATE) * 1000) }]);
    return null;
  }

  async function finishRecording() {
    clearTimeout(stopTimer.current);
    setMode('processing');
    const rec = await stopRecording();
    const problem = await addClip(rec.samples, rec.sampleRate, `Som ${sounds.length + 1}`);
    setMode('idle');
    if (problem) notify(PROBLEM_NOTICE[problem].title, PROBLEM_NOTICE[problem].message);
  }

  async function record() {
    if (!(await prepareMic())) {
      notify('Microfone bloqueado', 'Libere o microfone nas configurações para gravar sons.');
      return;
    }
    engine.stop();
    hapticImpact();
    setMode('recording');
    try {
      await startRecording();
      stopTimer.current = setTimeout(finishRecording, MAX_CLIP_SECONDS * 1000);
    } catch {
      setMode('idle');
      notify('Microfone', 'Não foi possível começar a gravar.');
    }
  }

  async function importFile(asset: DocumentPicker.DocumentPickerAsset): Promise<ClipProblem | null> {
    try {
      const buffer = await engine.decode(await readPickedFile(asset));
      const mono = new Float32Array(buffer.length);
      for (let c = 0; c < buffer.numberOfChannels; c++) {
        const data = buffer.getChannelData(c);
        for (let i = 0; i < mono.length; i++) mono[i] += data[i] / buffer.numberOfChannels;
      }
      return await addClip(mono, buffer.sampleRate, titleFromFile(asset.name));
    } catch {
      return 'unsupported';
    }
  }

  async function importAudio() {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      multiple: true,
      // No Android cada arquivo é lido depois, em segundo plano: copiar dezenas de sons do Drive na volta do
      // seletor travaria a tela até o fim.
      copyToCacheDirectory: Platform.OS !== 'android',
    });
    if (result.canceled) return;
    const files = result.assets;
    setMode('processing');
    const skipped: SkippedFile[] = [];
    for (const [i, asset] of files.entries()) {
      if (leaving.current) return;
      setImporting({ done: i, total: files.length, name: asset.name });
      const problem = await importFile(asset);
      if (problem) skipped.push({ name: asset.name, problem });
    }
    setImporting(null);
    setMode('idle');
    const report = importReport(files.length, skipped);
    if (report) notify(report.title, report.message);
  }

  function preview(soundId: string) {
    if (playing === soundId) {
      engine.stop();
      return;
    }
    setPlaying(soundId);
    engine
      .play(soundId)
      .catch(() => {})
      .finally(() => setPlaying((p) => (p === soundId ? null : p)));
  }

  function removeSound(soundId: string) {
    setSounds((list) => list.filter((s) => s.id !== soundId));
    if (created.current.includes(soundId)) {
      created.current = created.current.filter((x) => x !== soundId);
      deleteAudio(soundId).catch(() => {});
    }
  }

  async function discardCreated() {
    leaving.current = true;
    await Promise.all(created.current.map((x) => deleteAudio(x).catch(() => {})));
    created.current = [];
  }

  function close() {
    if (mode === 'recording') stopRecording().catch(() => {});
    if (!dirty) return router.back();
    confirm('Descartar alterações?', 'Os sons novos deste pack serão apagados.', 'Descartar', async () => {
      await discardCreated();
      router.back();
    });
  }

  async function save() {
    // O código de compartilhamento vale para os sons de quando foi gerado: mudou o pack, compartilha de novo.
    await savePack({
      id: packId,
      title: title.trim() || 'Meu pack',
      icon,
      sounds,
      from: existing?.from,
      share: dirty ? undefined : existing?.share,
    });
    created.current = [];
    router.back();
  }

  function removePack() {
    confirm('Apagar pack?', `"${existing?.title}" e todos os sons dele serão apagados do aparelho.`, 'Apagar', async () => {
      await discardCreated();
      await deletePack(packId);
      router.back();
    });
  }

  const busy = mode !== 'idle';
  const batch = importing && importing.total > 1 ? importing : null;

  return (
    <View className="flex-1 bg-night-950">
      <Backdrop />
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View className="flex-row items-center px-5 pb-3" style={{ paddingTop: insets.top + 8 }}>
          <View className="w-24 items-start">
            <PressableScale
              onPress={close}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              className="h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
              <Icon name="chevron-back" size={20} color={palette.mist[200]} />
            </PressableScale>
          </View>
          <View className="flex-1 items-center">
            <Text className="font-label text-[11px] uppercase tracking-[3px] text-mist-400">Editor de pack</Text>
            <Text className="font-heading text-base text-mist-50">{existing ? 'Editar pack' : 'Novo pack'}</Text>
          </View>
          <View className="w-24 items-end">
            {existing && (
              <PressableScale
                onPress={removePack}
                accessibilityRole="button"
                accessibilityLabel="Apagar pack"
                className="h-11 w-11 items-center justify-center rounded-2xl border border-coral-400/30 bg-coral-400/10">
                <Icon name="trash-outline" size={18} color={palette.coral[400]} />
              </PressableScale>
            )}
          </View>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-6 px-5 pb-6">
          <View className="gap-4 rounded-4xl border border-white/5 bg-night-850/80 p-5">
            <View className="flex-row items-center gap-3 rounded-2xl border border-white/5 bg-night-800 p-2">
              <Gradient
                colors={gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="h-11 w-11 items-center justify-center overflow-hidden rounded-xl">
                <Icon name={icon as IconName} size={22} color={palette.mist[50]} />
              </Gradient>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Nome do pack (ex.: Memes da firma)"
                placeholderTextColor={palette.mist[500]}
                selectionColor={palette.fuchsia[400]}
                maxLength={28}
                className="h-11 min-w-0 flex-1 font-label text-base text-mist-50 web:outline-none"
              />
            </View>
            <View className="gap-2">
              <Text className="px-1 font-label text-[11px] uppercase tracking-[2px] text-mist-500">Ícone</Text>
              <View className="flex-row flex-wrap gap-2">
                {ICONS.map((name) => {
                  const on = name === icon;
                  return (
                    <PressableScale
                      key={name}
                      onPress={() => setIcon(name)}
                      accessibilityRole="button"
                      accessibilityLabel={`Ícone ${name}`}
                      className="h-11 w-11 items-center justify-center rounded-xl border"
                      style={{
                        borderColor: on ? withAlpha(palette.fuchsia[400], 0.8) : 'rgba(255, 255, 255, 0.06)',
                        backgroundColor: on ? withAlpha(palette.fuchsia[500], 0.2) : 'rgba(255, 255, 255, 0.04)',
                      }}>
                      <Icon name={name} size={20} color={on ? palette.fuchsia[300] : palette.mist[400]} />
                    </PressableScale>
                  );
                })}
              </View>
            </View>
          </View>

          {existing && <ShareCard pack={existing} dirty={dirty} />}

          <View className="gap-3">
            <View className="flex-row items-center justify-between px-1">
              <Text className="font-label text-[11px] uppercase tracking-[2px] text-mist-500">Sons do pack</Text>
              <Text className="font-label text-xs text-mist-400">
                {sounds.length} {sounds.length === 1 ? 'som' : 'sons'}
              </Text>
            </View>

            {sounds.length === 0 && mode === 'idle' && (
              <View className="items-center gap-3 rounded-3xl border border-dashed border-white/10 px-6 py-8">
                <Icon name="albums" size={30} color={palette.mist[500]} />
                <Text className="text-center font-label text-sm text-mist-200">Nenhum som ainda</Text>
                <Text className="text-center font-body text-xs leading-5 text-mist-400">
                  Grave com o microfone ou importe áudios (MP3, WAV, M4A, OGG): dá para escolher vários de uma vez. Cada
                  som fica com{' '}
                  {secondsText(MIN_CLIP_SECONDS)} a {MAX_CLIP_SECONDS} s: o silêncio é cortado e o volume é ajustado sozinho.
                </Text>
              </View>
            )}

            {sounds.map((s) => (
              <Animated.View key={s.id} entering={FadeInDown.duration(250)} exiting={FadeOut.duration(150)} layout={LinearTransition.duration(200)}>
                <View className="flex-row items-center gap-3 rounded-2xl border border-white/5 bg-night-800 py-2 pl-2 pr-2">
                  <PressableScale
                    onPress={() => preview(s.id)}
                    accessibilityRole="button"
                    accessibilityLabel={playing === s.id ? `Parar ${s.title}` : `Ouvir ${s.title}`}
                    className="h-11 w-11 items-center justify-center rounded-xl"
                    style={{ backgroundColor: withAlpha(palette.cyan[400], playing === s.id ? 0.25 : 0.12) }}>
                    <Icon name={playing === s.id ? 'stop' : 'play'} size={18} color={palette.cyan[300]} />
                  </PressableScale>
                  <View className="min-w-0 flex-1">
                    <TextInput
                      value={s.title}
                      onChangeText={(t) => setSounds((list) => list.map((x) => (x.id === s.id ? { ...x, title: t } : x)))}
                      maxLength={40}
                      selectionColor={palette.fuchsia[400]}
                      className="h-7 font-label text-sm text-mist-50 web:outline-none"
                      // No Android o TextInput ganha o padding do tema do sistema, que num campo de 28 px sobra
                      // menos que a linha de texto e corta a parte de cima das letras.
                      style={{ paddingVertical: 0, includeFontPadding: false, textAlignVertical: 'center' }}
                    />
                    <Text className="font-body text-xs text-mist-500">{seconds(s.durationMs)}</Text>
                  </View>
                  <PressableScale
                    onPress={() => removeSound(s.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remover ${s.title}`}
                    className="h-10 w-10 items-center justify-center rounded-xl bg-white/5">
                    <Icon name="trash-outline" size={17} color={palette.mist[400]} />
                  </PressableScale>
                </View>
              </Animated.View>
            ))}

            {mode === 'idle' ? (
              <View className="flex-row gap-3">
                <PressableScale
                  onPress={record}
                  accessibilityRole="button"
                  className="flex-1"
                  style={{ borderRadius: 20, boxShadow: glow(palette.tangerine[400], 24, 0.35, 8) }}>
                  <Gradient
                    colors={gradients.record}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="h-14 flex-row items-center justify-center gap-2 overflow-hidden rounded-[20px]">
                    <Icon name="mic" size={20} color={palette.mist[50]} />
                    <Text className="font-heading text-base text-mist-50">Gravar</Text>
                  </Gradient>
                </PressableScale>
                <PressableScale
                  onPress={importAudio}
                  accessibilityRole="button"
                  className="h-14 flex-1 flex-row items-center justify-center gap-2 rounded-[20px] border border-white/10 bg-white/5">
                  <Icon name="cloud-upload" size={20} color={palette.mist[200]} />
                  <Text className="font-label text-base text-mist-200">Importar áudio</Text>
                </PressableScale>
              </View>
            ) : batch ? null : (
              <View
                className="gap-4 rounded-3xl border p-4"
                style={{
                  borderColor: withAlpha(palette.tangerine[400], 0.35),
                  backgroundColor: withAlpha(palette.tangerine[400], 0.08),
                }}>
                <View className="flex-row items-center justify-between">
                  <Text className="font-label text-sm text-mist-50">
                    {mode === 'recording' ? 'Gravando…' : 'Preparando o som…'}
                  </Text>
                  <Text className="font-body text-xs text-mist-400">máx. {MAX_CLIP_SECONDS} s</Text>
                </View>
                <View className="h-20">
                  <Bars mode={mode === 'recording' ? 'recording' : 'analyzing'} viz={viz} />
                </View>
                {mode === 'recording' && (
                  <PressableScale
                    onPress={finishRecording}
                    accessibilityRole="button"
                    className="h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-white/10">
                    <Icon name="stop-circle" size={20} color={palette.tangerine[300]} />
                    <Text className="font-label text-sm text-mist-50">Parar e salvar o som</Text>
                  </PressableScale>
                )}
              </View>
            )}
          </View>
        </ScrollView>

        <View className="gap-3 px-5 pt-3" style={{ paddingBottom: insets.bottom + 16 }}>
          {/* Fica no rodapé: com dezenas de arquivos a lista cresce e um painel no fim dela sairia da tela. */}
          {batch && (
            <Animated.View entering={FadeInDown.duration(200)} exiting={FadeOut.duration(150)}>
              <View
                className="gap-3 rounded-3xl border p-4"
                style={{
                  borderColor: withAlpha(palette.tangerine[400], 0.35),
                  backgroundColor: withAlpha(palette.tangerine[400], 0.08),
                }}>
                <View className="flex-row items-center gap-2">
                  <LiveDot color={palette.tangerine[400]} />
                  <Text className="font-label text-sm text-mist-50">
                    Importando {batch.done + 1} de {batch.total}…
                  </Text>
                  <Text numberOfLines={1} className="min-w-0 flex-1 text-right font-body text-xs text-mist-400">
                    {batch.name}
                  </Text>
                </View>
                <ProgressBar value={batch.done / batch.total} />
              </View>
            </Animated.View>
          )}
          <GradientButton
            label={sounds.length === 0 ? 'Adicione pelo menos 1 som' : 'Salvar pack'}
            icon="checkmark"
            onPress={save}
            disabled={busy || sounds.length === 0}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
