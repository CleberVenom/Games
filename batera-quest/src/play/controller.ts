import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { makeMutable, SharedValue, withTiming } from 'react-native-reanimated';

import { SongClock } from '../audio/clock';
import { engine } from '../audio/engine';
import { Kit } from '../content/kits';
import { Settings } from '../game/progression';
import { GameSession, HIT, MISSED, PENDING, SessionResults } from '../game/session';
import { Chart, Piece } from '../game/types';
import { INITIAL_HUD, useHud } from './hud';

export type Phase = 'loading' | 'ready' | 'playing' | 'paused' | 'finished' | 'error';

export interface GameSetup {
  kit: Kit;
  chart: Chart;
  canFail: boolean;
  settings: Settings;
  backingTrack: number | null;
  audioOffset: number;
}

/** Notas separadas em "mãos" (gemas nas pistas) e bumbo (barras), no formato lido pelos worklets. */
export interface NoteTrack {
  times: SharedValue<number[]>;
  lanes: SharedValue<number[]>;
  open: SharedValue<number[]>;
  status: SharedValue<number[]>;
  base: SharedValue<number>;
}

const COUNT_IN_BEATS = 4;
const GUIDE_VOLUME = 0.35;
const SCHEDULE_AHEAD = 0.2;
/** Quanto tempo uma nota fica visível depois da linha antes de sair da janela. */
const TAIL_SECONDS = 0.45;

export class GameController {
  readonly session: GameSession;
  readonly handLanes: Piece[];
  readonly hand: NoteTrack;
  readonly kick: NoteTrack;
  readonly songTime = makeMutable(-10);
  /** Brilho de cada pista ao tocar (índice = pista; a última é o bumbo). */
  readonly flashes: SharedValue<number>[];
  readonly lookahead: number;

  private phase: Phase = 'loading';
  private clock: SongClock | null = null;
  private startAt = 0;
  private offset: number;
  private raf: number | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextClickBeat = -COUNT_IN_BEATS;
  private nextGuide = 0;
  private handBase = 0;
  private kickBase = 0;
  private sentHandBase = 0;
  private sentKickBase = 0;
  private handTimes: number[] = [];
  private kickTimes: number[] = [];
  private isKick: Uint8Array;
  private poolIndex: Int32Array;
  private deltas: number[] = [];
  private lastHudProgress = 0;
  private judgementId = 0;
  private backing: Awaited<ReturnType<typeof engine.loadTrack>> | null = null;

  constructor(
    private readonly setup: GameSetup,
    private readonly listeners: {
      onPhase: (p: Phase) => void;
      onFinish: (results: SessionResults, meanOffsetMs: number) => void;
    },
  ) {
    const { chart, kit, settings } = setup;
    this.session = new GameSession(chart.notes, setup.canFail);
    this.handLanes = kit.pieces.filter((p) => p !== 'kick');
    this.offset = settings.offsetMs / 1000;
    this.lookahead = 1.7 / settings.noteSpeed;

    const hand = { times: [] as number[], lanes: [] as number[], open: [] as number[] };
    const kick = { times: [] as number[], lanes: [] as number[], open: [] as number[] };
    this.isKick = new Uint8Array(chart.notes.length);
    this.poolIndex = new Int32Array(chart.notes.length);
    chart.notes.forEach((n, i) => {
      const target = n.piece === 'kick' ? kick : hand;
      this.isKick[i] = n.piece === 'kick' ? 1 : 0;
      this.poolIndex[i] = target.times.length;
      target.times.push(n.time);
      target.lanes.push(n.piece === 'kick' ? 0 : this.handLanes.indexOf(n.piece));
      target.open.push(n.open ? 1 : 0);
    });
    this.handTimes = hand.times;
    this.kickTimes = kick.times;
    const track = (t: typeof hand): NoteTrack => ({
      times: makeMutable(t.times),
      lanes: makeMutable(t.lanes),
      open: makeMutable(t.open),
      status: makeMutable(t.times.map(() => PENDING)),
      base: makeMutable(0),
    });
    this.hand = track(hand);
    this.kick = track(kick);
    this.flashes = Array.from({ length: this.handLanes.length + 1 }, () => makeMutable(0));
    useHud.setState(INITIAL_HUD);
  }

  get currentPhase(): Phase {
    return this.phase;
  }

  private setPhase(p: Phase) {
    this.phase = p;
    this.listeners.onPhase(p);
  }

  async load() {
    try {
      await engine.loadKit(this.setup.kit);
      if (this.setup.backingTrack !== null) this.backing = await engine.loadTrack(this.setup.backingTrack);
      this.setPhase('ready');
    } catch (e) {
      console.warn('Falha ao carregar áudio', e);
      this.setPhase('error');
    }
  }

  /** Tempo da música já compensado pela latência configurada. */
  private now(): number {
    return (this.clock?.now() ?? -10) - this.offset;
  }

  private get secPerBeat(): number {
    return 60 / this.setup.chart.bpm;
  }

  async start() {
    await engine.resume();
    engine.stopScheduled();
    const countIn = COUNT_IN_BEATS * this.secPerBeat;
    const preRoll = Math.max(countIn, this.lookahead + 0.6);
    this.startAt = engine.now() + preRoll;
    this.nextClickBeat = -COUNT_IN_BEATS;
    this.nextGuide = 0;
    this.clock = new SongClock(() => engine.now(), this.startAt);
    if (this.backing) engine.playTrack(this.backing, this.startAt - this.setup.audioOffset);
    this.setPhase('playing');
    this.schedule();
    this.timer = setInterval(() => this.schedule(), 30);
    this.raf = requestAnimationFrame(this.frame);
  }

  /** Agenda contagem, metrônomo e faixa-guia um pouco à frente do relógio de áudio. */
  private schedule() {
    if (this.phase !== 'playing') return;
    const horizon = engine.now() + SCHEDULE_AHEAD;
    const { chart, kit, settings } = this.setup;
    const spb = this.secPerBeat;
    const lastBeat = Math.ceil(chart.duration / spb);
    const metronome = settings.metronome && !this.backing;
    while (this.startAt + this.nextClickBeat * spb < horizon && this.nextClickBeat < lastBeat) {
      const beat = this.nextClickBeat++;
      if (beat < 0 || metronome) engine.stick(this.startAt + beat * spb, beat < 0 || beat % chart.beatsPerBar === 0);
    }
    if (settings.guide) {
      const notes = chart.notes;
      while (this.nextGuide < notes.length && this.startAt + notes[this.nextGuide].time < horizon) {
        const n = notes[this.nextGuide++];
        engine.play(kit, n.piece, { when: this.startAt + n.time, open: n.open, volume: GUIDE_VOLUME, track: true });
      }
    }
  }

  private frame = () => {
    if (this.phase !== 'playing' || !this.clock) return;
    this.clock.sync();
    const t = this.now();
    this.songTime.value = t;

    while (this.handBase < this.handTimes.length && this.handTimes[this.handBase] < t - TAIL_SECONDS) this.handBase++;
    while (this.kickBase < this.kickTimes.length && this.kickTimes[this.kickBase] < t - TAIL_SECONDS) this.kickBase++;
    if (this.sentHandBase !== this.handBase) this.hand.base.value = this.sentHandBase = this.handBase;
    if (this.sentKickBase !== this.kickBase) this.kick.base.value = this.sentKickBase = this.kickBase;

    const missed = this.session.update(t);
    for (const i of missed) this.setStatus(i, MISSED);
    if (missed.length) this.pushHud('miss');

    const hud = useHud.getState();
    const countIn = t < 0 ? Math.min(COUNT_IN_BEATS, Math.ceil(-t / this.secPerBeat)) : null;
    if (countIn !== hud.countIn) useHud.setState({ countIn });
    if (Math.abs(t - this.lastHudProgress) > 0.2) {
      this.lastHudProgress = t;
      this.pushHud(null);
    }

    const done = this.session.resolved === this.session.notes.length && t > this.setup.chart.duration + 0.8;
    if (this.session.failed || done) {
      this.finish();
      return;
    }
    this.raf = requestAnimationFrame(this.frame);
  };

  private pushHud(kind: 'perfect' | 'great' | 'good' | 'miss' | null) {
    const s = this.session;
    const t = this.now();
    useHud.setState({
      score: s.score,
      combo: s.combo,
      multiplier: s.multiplier * (s.isEnergyActive(t) ? 2 : 1),
      rock: s.rock,
      energy: s.energyAt(t),
      energyActive: s.isEnergyActive(t),
      canActivate: s.canActivateEnergy(t),
      progress: Math.max(0, Math.min(1, t / this.setup.chart.duration)),
      ...(kind ? { judgement: { kind, id: ++this.judgementId } } : {}),
    });
  }

  private setStatus(noteIndex: number, status: number) {
    const idx = this.poolIndex[noteIndex];
    const track = this.isKick[noteIndex] ? this.kick : this.hand;
    track.status.modify((arr) => {
      'worklet';
      arr[idx] = status;
      return arr;
    });
  }

  /** Toque em uma peça (pista). */
  hit(piece: Piece) {
    if (this.phase !== 'playing' && this.phase !== 'ready') return;
    const lane = piece === 'kick' ? this.handLanes.length : this.handLanes.indexOf(piece);
    if (lane < 0) return;
    const r = this.phase === 'playing' ? this.session.hit(piece, this.now()) : null;
    const open = r ? this.session.notes[r.noteIndex].open : false;
    engine.play(this.setup.kit, piece, { open });

    const flash = this.flashes[lane];
    flash.value = 1;
    flash.value = withTiming(0, { duration: 220 });
    if (this.setup.settings.haptics && Platform.OS !== 'web') {
      Haptics.impactAsync(piece === 'kick' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    if (r) {
      this.setStatus(r.noteIndex, HIT);
      this.deltas.push(r.delta);
      this.pushHud(r.judgement);
    }
  }

  activateEnergy() {
    if (this.phase === 'playing' && this.session.activateEnergy(this.now())) this.pushHud(null);
  }

  async pause() {
    if (this.phase !== 'playing') return;
    this.stopLoops();
    this.clock?.pause();
    await engine.suspend();
    this.setPhase('paused');
  }

  async resume() {
    if (this.phase !== 'paused') return;
    await engine.resume();
    this.clock?.resume();
    this.setPhase('playing');
    this.timer = setInterval(() => this.schedule(), 30);
    this.raf = requestAnimationFrame(this.frame);
  }

  private stopLoops() {
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    if (this.timer !== null) clearInterval(this.timer);
    this.raf = null;
    this.timer = null;
  }

  private finish() {
    this.stopLoops();
    this.pushHud(null);
    if (this.session.failed) engine.stopScheduled();
    else engine.stopTrack();
    this.setPhase('finished');
    const mean = this.deltas.length ? this.deltas.reduce((a, b) => a + b, 0) / this.deltas.length : 0;
    this.listeners.onFinish(this.session.results(), Math.round(mean * 1000));
  }

  /** Para tudo (sair da tela). */
  async dispose() {
    this.stopLoops();
    this.phase = 'finished';
    engine.stopScheduled();
    await engine.resume().catch(() => {});
  }
}
