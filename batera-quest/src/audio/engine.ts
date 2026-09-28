import { Asset } from 'expo-asset';
import { Platform } from 'react-native';
import {
  AudioBuffer,
  AudioBufferSourceNode,
  AudioContext,
  AudioManager,
  GainNode,
} from 'react-native-audio-api';

import { Kit, SampleKey, STICK_SAMPLES } from '../content/kits';
import { Piece } from '../game/types';
import { SAMPLE_FILES } from './samples';

interface Voice {
  src: AudioBufferSourceNode;
  gain: GainNode;
}

/**
 * Motor de áudio de baixa latência (Web Audio via react-native-audio-api: Oboe no Android,
 * AVAudioEngine no iOS). O relógio `currentTime` do contexto é a referência de tempo do jogo.
 */
class DrumEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<SampleKey, AudioBuffer>();
  private pending = new Map<SampleKey, Promise<AudioBuffer>>();
  private roundRobin = new Map<string, number>();
  private openHat: Voice | null = null;
  /** Fontes agendadas (contagem, metrônomo, guia, playback) — canceladas em stopScheduled(). */
  private scheduled: { src: AudioBufferSourceNode; end: number }[] = [];
  private backing: AudioBufferSourceNode | null = null;

  get context(): AudioContext {
    if (!this.ctx) {
      if (Platform.OS === 'ios') {
        // Toca mesmo com a chave de silêncio ligada, como um instrumento.
        AudioManager.setAudioSessionOptions({ iosCategory: 'playback', iosMode: 'default', iosOptions: [] });
      }
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  now(): number {
    return this.context.currentTime;
  }

  /** No navegador o áudio só inicia após um gesto do usuário; no celular garante que não está suspenso. */
  async resume(): Promise<void> {
    if (this.context.state !== 'running') await this.context.resume();
  }

  async suspend(): Promise<void> {
    if (this.ctx && this.ctx.state === 'running') await this.ctx.suspend();
  }

  private async decodeModule(mod: number): Promise<AudioBuffer> {
    const asset = Asset.fromModule(mod);
    if (!asset.localUri) await asset.downloadAsync();
    return this.context.decodeAudioData(asset.localUri ?? asset.uri);
  }

  private loadSample(key: SampleKey): Promise<AudioBuffer> {
    const ready = this.buffers.get(key);
    if (ready) return Promise.resolve(ready);
    let p = this.pending.get(key);
    if (!p) {
      p = this.decodeModule(SAMPLE_FILES[key]).then((buf) => {
        this.buffers.set(key, buf);
        this.pending.delete(key);
        return buf;
      });
      this.pending.set(key, p);
    }
    return p;
  }

  async loadKit(kit: Kit): Promise<void> {
    const keys = new Set<SampleKey>([...Object.values(kit.sounds).flat(), ...kit.hihatOpen, ...STICK_SAMPLES]);
    await Promise.all(Array.from(keys, (k) => this.loadSample(k)));
  }

  /** Decodifica um áudio licenciado (playback) a partir de um require(). */
  loadTrack(mod: number): Promise<AudioBuffer> {
    return this.decodeModule(mod);
  }

  private pick(keys: SampleKey[], rrKey: string): AudioBuffer | undefined {
    if (keys.length === 0) return undefined;
    const i = (this.roundRobin.get(rrKey) ?? 0) % keys.length;
    this.roundRobin.set(rrKey, i + 1);
    return this.buffers.get(keys[i]);
  }

  private voice(buffer: AudioBuffer, when: number, volume: number): Voice {
    const ctx = this.context;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain);
    gain.connect(this.master!);
    src.start(when);
    return { src, gain };
  }

  /** Fecha o chimbal aberto que ainda está soando (como o pé fechando o chimbal). */
  private chokeHat(when: number) {
    if (!this.openHat) return;
    const { src, gain } = this.openHat;
    gain.gain.setTargetAtTime(0, when, 0.015);
    try {
      src.stop(when + 0.12);
    } catch {
      // já parado
    }
    this.openHat = null;
  }

  /**
   * Toca uma peça do kit. `when` em segundos do relógio de áudio (padrão: agora).
   * `track` = true registra a fonte para ser cancelada ao sair/reiniciar (notas agendadas).
   */
  play(kit: Kit, piece: Piece, opts: { when?: number; open?: boolean; volume?: number; track?: boolean } = {}) {
    const when = Math.max(opts.when ?? 0, this.context.currentTime);
    const open = piece === 'hihat' && opts.open;
    const keys = open ? kit.hihatOpen : kit.sounds[piece] ?? [];
    const buffer = this.pick(keys, `${kit.id}:${piece}:${open ? 'o' : 'c'}`);
    if (!buffer) return;
    if (piece === 'hihat') this.chokeHat(when);
    const v = this.voice(buffer, when, (kit.gain[piece] ?? 1) * (opts.volume ?? 1));
    if (open) this.openHat = v;
    if (opts.track) this.track(v.src, when + buffer.duration);
  }

  /** Clique de baqueta (contagem e metrônomo). */
  stick(when: number, accent: boolean) {
    const buffer = this.pick(STICK_SAMPLES, 'stick');
    if (!buffer) return;
    const v = this.voice(buffer, when, accent ? 0.9 : 0.55);
    this.track(v.src, when + buffer.duration);
  }

  /** Toca o playback licenciado alinhado para que o seu início caia em `trackStart` (relógio de áudio). */
  playTrack(buffer: AudioBuffer, trackStart: number) {
    this.stopTrack();
    const ctx = this.context;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.master!);
    const when = Math.max(trackStart, ctx.currentTime);
    src.start(when, when - trackStart);
    this.backing = src;
  }

  stopTrack() {
    if (!this.backing) return;
    try {
      this.backing.stop();
    } catch {
      // já parado
    }
    this.backing = null;
  }

  private track(src: AudioBufferSourceNode, end: number) {
    if (this.scheduled.length > 64) {
      const now = this.context.currentTime;
      this.scheduled = this.scheduled.filter((s) => s.end > now);
    }
    this.scheduled.push({ src, end });
  }

  /** Cancela tudo que foi agendado (ao sair, reiniciar ou falhar). */
  stopScheduled() {
    const now = this.ctx?.currentTime ?? 0;
    for (const { src, end } of this.scheduled) {
      if (end <= now) continue;
      try {
        src.stop();
      } catch {
        // já parado
      }
    }
    this.scheduled = [];
    this.stopTrack();
    this.chokeHat(now);
  }
}

export const engine = new DrumEngine();
