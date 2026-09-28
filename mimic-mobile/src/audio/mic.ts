import { Platform } from 'react-native';
import { AudioManager, AudioRecorder, RecorderAdapterNode } from 'react-native-audio-api';

import { engine } from './engine';
import { concatChunks, Recording } from './recording';

/** Taxa pedida ao gravador (suficiente para voz e mais leve para o DSP); o aparelho pode usar outra. */
const SAMPLE_RATE = 22050;

let recorder: AudioRecorder | null = null;
let adapter: RecorderAdapterNode | null = null;
let chunks: Float32Array[] = [];
let sampleRate = SAMPLE_RATE;
/** Início e parada rodam em fila: parar antes de o microfone terminar de abrir é seguro. */
let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(op: () => Promise<T>): Promise<T> {
  const next = queue.then(op, op);
  queue = next.catch(() => {});
  return next;
}

/**
 * Prepara o áudio para gravar: no iOS usa a sessão "tocar e gravar" pelo alto-falante; pede a
 * permissão do microfone (Android: RECORD_AUDIO). Devolve se a permissão foi concedida.
 */
export async function prepareMic(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    AudioManager.setAudioSessionOptions({
      iosCategory: 'playAndRecord',
      iosMode: 'default',
      iosOptions: ['defaultToSpeaker', 'allowBluetoothA2DP'],
    });
  }
  return (await AudioManager.requestRecordingPermissions()) === 'Granted';
}

async function start(): Promise<void> {
  await engine.resume();
  recorder ??= new AudioRecorder();
  chunks = [];
  sampleRate = SAMPLE_RATE;
  recorder.onAudioReady({ sampleRate: SAMPLE_RATE, bufferLength: 1024, channelCount: 1 }, ({ buffer, numFrames }) => {
    sampleRate = buffer.sampleRate;
    chunks.push(buffer.getChannelData(0).slice(0, numFrames));
  });
  // Liga o microfone ao analisador do motor para as barras reagirem à voz (o ramo é mudo).
  adapter = engine.context.createRecorderAdapter();
  recorder.connect(adapter);
  adapter.connect(engine.analyser);
  const result = await recorder.start();
  if (result.status === 'error') throw new Error(result.message);
}

export function startRecording(): Promise<void> {
  return enqueue(start);
}

async function stop(): Promise<Recording> {
  if (recorder?.isRecording()) await recorder.stop();
  recorder?.clearOnAudioReady();
  recorder?.disconnect();
  adapter?.disconnect();
  adapter = null;
  const recording = { samples: concatChunks(chunks), sampleRate };
  chunks = [];
  return recording;
}

/** Para a gravação e devolve o PCM capturado (vazio se o microfone não chegou a abrir). */
export function stopRecording(): Promise<Recording> {
  return enqueue(stop);
}
