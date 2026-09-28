import { Asset } from 'expo-asset';
import {
  AnalyserNode,
  AudioBuffer,
  AudioBufferSourceNode,
  AudioContext,
  GainNode,
} from 'react-native-audio-api';

import { SOUND_FILES } from './soundFiles';

interface Playing {
  source: AudioBufferSourceNode;
  done: () => void;
}

/**
 * Motor de áudio (Web Audio nativo via react-native-audio-api: Oboe no Android, AVAudioEngine no iOS).
 *
 *   referência ──► alto-falante
 *        └──────► analisador ──► ganho 0 ──► saída   (o analisador precisa estar no grafo)
 *   microfone ──► analisador                           (ligado por mic.ts / mic.web.ts)
 *
 * Um único AnalyserNode (FFT) alimenta as barras, tanto na referência quanto na gravação; o ramo
 * mudo impede que a voz gravada saia no alto-falante.
 */
class AudioEngine {
  private nodes: { ctx: AudioContext; analyser: AnalyserNode } | null = null;
  private buffers = new Map<string, Promise<AudioBuffer>>();
  private playing: Playing | null = null;

  private graph() {
    if (!this.nodes) {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.minDecibels = -85;
      analyser.maxDecibels = -20;
      analyser.smoothingTimeConstant = 0.55;
      const mute: GainNode = ctx.createGain();
      mute.gain.value = 0;
      analyser.connect(mute);
      mute.connect(ctx.destination);
      this.nodes = { ctx, analyser };
    }
    return this.nodes;
  }

  get context(): AudioContext {
    return this.graph().ctx;
  }

  get analyser(): AnalyserNode {
    return this.graph().analyser;
  }

  /** No navegador o áudio só roda após um gesto do usuário; no celular garante que não está suspenso. */
  async resume(): Promise<void> {
    if (this.context.state !== 'running') await this.context.resume();
  }

  /** Decodifica (uma vez) o arquivo de um som. Chamado antes da vez do jogador para tocar sem atraso. */
  load(id: string): Promise<AudioBuffer> {
    let pending = this.buffers.get(id);
    if (!pending) {
      pending = (async () => {
        const asset = Asset.fromModule(SOUND_FILES[id]);
        if (!asset.localUri) await asset.downloadAsync();
        return this.context.decodeAudioData(asset.localUri ?? asset.uri);
      })();
      pending.catch(() => this.buffers.delete(id));
      this.buffers.set(id, pending);
    }
    return pending;
  }

  /** Toca a referência; resolve quando ela termina ou é interrompida por `stop()`. */
  async play(id: string): Promise<void> {
    const buffer = await this.load(id);
    await this.resume();
    this.stop();
    const ctx = this.context;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.connect(this.analyser);
    return new Promise<void>((resolve) => {
      const playing: Playing = {
        source,
        done: () => {
          if (this.playing === playing) this.playing = null;
          resolve();
        },
      };
      source.onEnded = () => playing.done();
      this.playing = playing;
      source.start();
    });
  }

  stop(): void {
    const playing = this.playing;
    if (!playing) return;
    this.playing = null;
    playing.source.onEnded = null;
    playing.source.stop();
    playing.done();
  }
}

export const engine = new AudioEngine();
