import {
  AnalyserNode,
  AudioBuffer,
  AudioBufferSourceNode,
  AudioContext,
  GainNode,
} from 'react-native-audio-api';

import type { SoundEffect } from '../game/modifiers';
import { buildEffect } from './effects';
import { resolveSource } from './sources';
import { ANALYSER } from './spectrum';

interface Playing {
  source: AudioBufferSourceNode;
  done: () => void;
}

/**
 * Motor de áudio (Web Audio nativo via react-native-audio-api: Oboe no Android, AVAudioEngine no iOS).
 *
 *   referência ──► [sabotagem da roleta] ──► alto-falante
 *                                     └──────► analisador ──► ganho 0 ──► saída   (o analisador precisa estar no grafo)
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
      analyser.fftSize = ANALYSER.fftSize;
      analyser.minDecibels = ANALYSER.minDecibels;
      analyser.maxDecibels = ANALYSER.maxDecibels;
      analyser.smoothingTimeConstant = ANALYSER.smoothing;
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
      pending = resolveSource(id).then((source) => this.context.decodeAudioData(source));
      pending.catch(() => this.buffers.delete(id));
      this.buffers.set(id, pending);
    }
    return pending;
  }

  /** Decodifica um áudio qualquer (arquivo importado no editor de packs). */
  decode(source: string | ArrayBuffer): Promise<AudioBuffer> {
    return this.context.decodeAudioData(source);
  }

  /**
   * Toca a referência (com a sabotagem de som da roleta, se houver); resolve quando ela termina —
   * incluindo a cauda do eco — ou é interrompida por `stop()`.
   */
  async play(id: string, effect: SoundEffect | null = null): Promise<void> {
    const buffer = await this.load(id);
    await this.resume();
    this.stop();
    const ctx = this.context;
    const output = ctx.createGain();
    output.connect(ctx.destination);
    output.connect(this.analyser);
    const chain = buildEffect(ctx, effect, output);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = chain.playbackRate;
    source.connect(chain.input);
    return new Promise<void>((resolve) => {
      let tail: ReturnType<typeof setTimeout> | undefined;
      const playing: Playing = {
        source,
        done: () => {
          clearTimeout(tail);
          if (this.playing === playing) this.playing = null;
          source.disconnect();
          chain.nodes.forEach((n) => n.disconnect());
          output.disconnect();
          resolve();
        },
      };
      source.onEnded = () => {
        tail = setTimeout(playing.done, chain.tailMs);
      };
      this.playing = playing;
      source.start();
    });
  }

  stop(): void {
    const playing = this.playing;
    if (!playing) return;
    this.playing = null;
    playing.source.onEnded = null;
    try {
      playing.source.stop();
    } catch {
      // Já tinha terminado (estava só na cauda do eco).
    }
    playing.done();
  }
}

export const engine = new AudioEngine();
