/**
 * O pedaço do WebRTC que a voz usa, igual no celular (react-native-webrtc) e no navegador. Cada plataforma
 * entrega um `RtcPlatform` (`rtc.ts` / `rtc.web.ts`); a malha de conexões (`voiceMesh.ts`) só fala com isto.
 */

export interface RtcDescription {
  type: 'offer' | 'answer';
  sdp: string;
}

export interface RtcCandidate {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
}

export interface RtcTrack {
  enabled: boolean;
  stop(): void;
}

export interface RtcStream {
  getAudioTracks(): RtcTrack[];
  getTracks(): RtcTrack[];
}

/** Relatório de estatísticas (um Map no celular e no navegador). */
export interface RtcStats {
  forEach(fn: (report: Record<string, unknown>) => void): void;
}

export interface RtcPeer {
  connectionState: string;
  addTrack(track: RtcTrack, stream: RtcStream): unknown;
  addTransceiver(kind: 'audio', init: { direction: 'recvonly' }): unknown;
  createOffer(): Promise<RtcDescription>;
  createAnswer(): Promise<RtcDescription>;
  setLocalDescription(description: RtcDescription): Promise<void>;
  setRemoteDescription(description: RtcDescription): Promise<void>;
  addIceCandidate(candidate: RtcCandidate): Promise<void>;
  getStats(): Promise<RtcStats>;
  close(): void;
  addEventListener(type: 'icecandidate', listener: (event: { candidate: RtcCandidate | null }) => void): void;
  addEventListener(type: 'track', listener: (event: { streams: RtcStream[] }) => void): void;
  addEventListener(type: 'connectionstatechange', listener: () => void): void;
}

export interface RtcPlatform {
  createPeer(): RtcPeer;
  /** Abre o microfone para a voz (com cancelamento de eco). */
  openMic(): Promise<RtcStream>;
  /** Toca a voz de outra pessoa; devolve a função que para. */
  playRemote(stream: RtcStream): () => void;
  /** Modo "chamada" do celular, com a voz no alto-falante (e fone/Bluetooth quando conectados). */
  startCallAudio(): void;
  stopCallAudio(): void;
}

/** Servidores STUN gratuitos para os celulares se acharem pela internet (sem servidor de retransmissão). */
export const ICE_SERVERS = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }];
