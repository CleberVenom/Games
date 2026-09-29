import { ICE_SERVERS, RtcPeer, RtcPlatform, RtcStream } from './rtcTypes';

/** WebRTC do navegador (para jogar e testar na web); a voz recebida toca num elemento <audio>. */
export const rtc: RtcPlatform = {
  createPeer: () => new RTCPeerConnection({ iceServers: ICE_SERVERS }) as unknown as RtcPeer,
  openMic: async () =>
    (await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    })) as unknown as RtcStream,
  playRemote: (stream) => {
    const audio = new Audio();
    audio.autoplay = true;
    audio.srcObject = stream as unknown as MediaStream;
    audio.play().catch(() => {});
    return () => {
      audio.pause();
      audio.srcObject = null;
    };
  },
  startCallAudio: () => {},
  stopCallAudio: () => {},
};
