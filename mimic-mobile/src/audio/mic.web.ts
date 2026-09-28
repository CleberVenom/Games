import { engine } from './engine';
import { concatChunks, Recording } from './recording';

/**
 * Versão web do microfone (getUserMedia), para jogar e testar no navegador. Usa o mesmo analisador do
 * motor — na web o react-native-audio-api embrulha o Web Audio do navegador (`.context` / `.node`).
 */

const CONSTRAINTS: MediaStreamConstraints = {
  audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
};

let stream: MediaStream | null = null;
let source: MediaStreamAudioSourceNode | null = null;
let processor: ScriptProcessorNode | null = null;
let chunks: Float32Array[] = [];

/** Início e parada rodam em fila: parar antes de o microfone terminar de abrir é seguro. */
let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(op: () => Promise<T>): Promise<T> {
  const next = queue.then(op, op);
  queue = next.catch(() => {});
  return next;
}

function browserContext(): AudioContext {
  return (engine.context as unknown as { context: AudioContext }).context;
}

export async function prepareMic(): Promise<boolean> {
  try {
    const probe = await navigator.mediaDevices.getUserMedia(CONSTRAINTS);
    probe.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}

async function start(): Promise<void> {
  await engine.resume();
  const ctx = browserContext();
  chunks = [];
  stream = await navigator.mediaDevices.getUserMedia(CONSTRAINTS);
  source = ctx.createMediaStreamSource(stream);
  processor = ctx.createScriptProcessor(2048, 1, 1);
  processor.onaudioprocess = (e) => chunks.push(e.inputBuffer.getChannelData(0).slice());
  source.connect((engine.analyser as unknown as { node: AudioNode }).node);
  source.connect(processor);
  processor.connect(ctx.destination); // saída silenciosa; só mantém o processador ativo
}

export function startRecording(): Promise<void> {
  return enqueue(start);
}

async function stop(): Promise<Recording> {
  processor?.disconnect();
  source?.disconnect();
  stream?.getTracks().forEach((t) => t.stop());
  processor = source = stream = null;
  const recording = { samples: concatChunks(chunks), sampleRate: browserContext().sampleRate };
  chunks = [];
  return recording;
}

/** Para a gravação e devolve o PCM capturado (vazio se o microfone não chegou a abrir). */
export function stopRecording(): Promise<Recording> {
  return enqueue(stop);
}
