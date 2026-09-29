import { dropSignal, joinVoice, leaveVoice, sendSignal, VoiceSignal, watchSignals, watchVoicePeers } from './api';
import { rtc } from './rtc';
import type { RtcCandidate, RtcPeer, RtcStream } from './rtcTypes';
import { callsFirst, voiceSessionId } from './voice';

export type VoiceStatus = 'connecting' | 'on' | 'denied' | 'error';
export type LinkState = 'connecting' | 'connected' | 'failed';

export interface MeshEvents {
  status: (status: VoiceStatus) => void;
  /** Situação da ligação com cada jogador. */
  links: (links: Record<string, LinkState>) => void;
  /** Volume de cada um (0 a 1), inclusive o meu. */
  levels: (levels: Record<string, number>) => void;
}

interface Link {
  uid: string;
  session: string;
  peer: RtcPeer;
  remoteSet: boolean;
  pending: RtcCandidate[];
  stopAudio: () => void;
}

/** Tentativas de refazer uma ligação que falhou, por pessoa e sessão. */
const MAX_RETRIES = 2;

/**
 * Uma entrada na voz da sala: abre o microfone, liga direto com cada jogador que também está na voz (malha:
 * cada celular fala com todos) e mede quem está falando. `stop()` desliga tudo e solta o microfone — a sala
 * cria uma malha nova sempre que a voz volta (depois dos sons).
 */
export class VoiceMesh {
  private readonly session = voiceSessionId();
  private mic: RtcStream | null = null;
  private micOn = true;
  private readonly links = new Map<string, Link>();
  private readonly retries = new Map<string, number>();
  private readonly offs: (() => void)[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private callAudio = false;
  private stopped = false;

  constructor(
    private readonly code: string,
    private readonly me: string,
    private readonly events: MeshEvents,
  ) {}

  async start(micOn: boolean): Promise<void> {
    this.micOn = micOn;
    this.events.status('connecting');
    try {
      this.mic = await rtc.openMic();
    } catch {
      this.mic = null; // sem microfone: entra só ouvindo
    }
    if (this.stopped) return this.releaseMic();
    this.applyMic();
    rtc.startCallAudio();
    this.callAudio = true;
    try {
      this.offs.push(
        watchSignals(this.code, this.me, (id, signal) => {
          dropSignal(this.code, this.me, id).catch(() => {});
          this.onSignal(signal).catch(() => this.closeLink(signal.from));
        }),
      );
      await joinVoice(this.code, this.me, this.session);
      if (this.stopped) return void leaveVoice(this.code, this.me, this.session).catch(() => {});
      this.offs.push(watchVoicePeers(this.code, (peers) => this.reconcile(peers)));
      this.events.status(this.mic ? 'on' : 'denied');
      this.timer = setInterval(() => this.measure().catch(() => {}), 300);
    } catch {
      if (!this.stopped) this.events.status('error');
    }
  }

  setMicOn(on: boolean) {
    this.micOn = on;
    this.applyMic();
  }

  stop() {
    if (this.stopped) return;
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    this.offs.forEach((off) => off());
    for (const uid of [...this.links.keys()]) this.closeLink(uid);
    this.releaseMic();
    if (this.callAudio) rtc.stopCallAudio();
    leaveVoice(this.code, this.me, this.session).catch(() => {});
  }

  private applyMic() {
    this.mic?.getAudioTracks().forEach((t) => (t.enabled = this.micOn));
  }

  private releaseMic() {
    this.mic?.getTracks().forEach((t) => t.stop());
    this.mic = null;
  }

  /** Liga com quem entrou na voz, desliga de quem saiu (ou voltou com outra sessão). */
  private reconcile(peers: Record<string, string>) {
    if (this.stopped) return;
    for (const [uid, session] of Object.entries(peers)) {
      if (uid === this.me) continue;
      const link = this.links.get(uid);
      if (link?.session === session) continue;
      if (link) this.closeLink(uid);
      if (callsFirst(this.me, uid)) this.call(uid, session).catch(() => this.closeLink(uid));
    }
    for (const uid of [...this.links.keys()]) if (!(uid in peers)) this.closeLink(uid);
  }

  private send(to: string, toSession: string, signal: Pick<VoiceSignal, 'kind' | 'sdp' | 'candidate'>) {
    const full: VoiceSignal = { ...signal, from: this.me, fromSession: this.session, toSession };
    sendSignal(this.code, to, full).catch(() => {});
  }

  private createLink(uid: string, session: string): Link {
    const peer = rtc.createPeer();
    const link: Link = { uid, session, peer, remoteSet: false, pending: [], stopAudio: () => {} };
    const track = this.mic?.getAudioTracks()[0];
    if (track && this.mic) peer.addTrack(track, this.mic);
    else peer.addTransceiver('audio', { direction: 'recvonly' });
    peer.addEventListener('icecandidate', ({ candidate }) => {
      if (!candidate || this.links.get(uid) !== link) return;
      const { candidate: c, sdpMid, sdpMLineIndex } = candidate;
      this.send(uid, session, { kind: 'ice', candidate: JSON.stringify({ candidate: c, sdpMid, sdpMLineIndex }) });
    });
    peer.addEventListener('track', ({ streams }) => {
      if (!streams[0] || this.links.get(uid) !== link) return;
      link.stopAudio();
      link.stopAudio = rtc.playRemote(streams[0]);
    });
    peer.addEventListener('connectionstatechange', () => {
      if (this.links.get(uid) !== link) return;
      this.emitLinks();
      if (link.peer.connectionState === 'failed') this.retry(link);
    });
    this.links.set(uid, link);
    this.emitLinks();
    return link;
  }

  private async call(uid: string, session: string) {
    const link = this.createLink(uid, session);
    const offer = await link.peer.createOffer();
    await link.peer.setLocalDescription(offer);
    this.send(uid, session, { kind: 'offer', sdp: offer.sdp });
  }

  /** Quem começou a ligação tenta de novo quando ela falha (a outra ponta espera uma oferta nova). */
  private retry(link: Link) {
    if (!callsFirst(this.me, link.uid)) return;
    const key = `${link.uid}:${link.session}`;
    const count = this.retries.get(key) ?? 0;
    if (count >= MAX_RETRIES) return;
    this.retries.set(key, count + 1);
    setTimeout(() => {
      if (this.stopped || this.links.get(link.uid) !== link) return;
      this.closeLink(link.uid);
      this.call(link.uid, link.session).catch(() => this.closeLink(link.uid));
    }, 1500);
  }

  private async onSignal(signal: VoiceSignal) {
    if (this.stopped || signal.toSession !== this.session) return; // recado para uma sessão antiga
    if (signal.kind === 'offer') {
      if (this.links.has(signal.from)) this.closeLink(signal.from);
      const link = this.createLink(signal.from, signal.fromSession);
      await link.peer.setRemoteDescription({ type: 'offer', sdp: signal.sdp ?? '' });
      await this.remoteReady(link);
      const answer = await link.peer.createAnswer();
      await link.peer.setLocalDescription(answer);
      this.send(signal.from, signal.fromSession, { kind: 'answer', sdp: answer.sdp });
      return;
    }
    const link = this.links.get(signal.from);
    if (!link || link.session !== signal.fromSession) return;
    if (signal.kind === 'answer') {
      await link.peer.setRemoteDescription({ type: 'answer', sdp: signal.sdp ?? '' });
      await this.remoteReady(link);
    } else if (signal.candidate) {
      const candidate = JSON.parse(signal.candidate) as RtcCandidate;
      if (link.remoteSet) await link.peer.addIceCandidate(candidate);
      else link.pending.push(candidate);
    }
  }

  /** Candidatos que chegaram antes da descrição remota entram agora. */
  private async remoteReady(link: Link) {
    link.remoteSet = true;
    const pending = link.pending.splice(0);
    for (const candidate of pending) await link.peer.addIceCandidate(candidate).catch(() => {});
  }

  private closeLink(uid: string) {
    const link = this.links.get(uid);
    if (!link) return;
    this.links.delete(uid);
    link.stopAudio();
    link.peer.close();
    this.emitLinks();
  }

  private emitLinks() {
    const states: Record<string, LinkState> = {};
    for (const [uid, link] of this.links) {
      const s = link.peer.connectionState;
      states[uid] = s === 'connected' ? 'connected' : s === 'failed' ? 'failed' : 'connecting';
    }
    this.events.links(states);
  }

  /** Lê o volume de cada ligação nas estatísticas do WebRTC (o meu vem do microfone enviado). */
  private async measure() {
    const levels: Record<string, number> = {};
    let mine = 0;
    for (const [uid, link] of [...this.links]) {
      const stats = await link.peer.getStats();
      stats.forEach((r) => {
        const audio = r.kind === 'audio' || r.mediaType === 'audio';
        if (!audio || typeof r.audioLevel !== 'number') return;
        if (r.type === 'inbound-rtp') levels[uid] = r.audioLevel;
        else if (r.type === 'media-source') mine = Math.max(mine, r.audioLevel);
      });
    }
    if (this.stopped) return;
    levels[this.me] = this.micOn && this.mic ? mine : 0;
    this.events.levels(levels);
  }
}
