import InCallManager from 'react-native-incall-manager';
import { mediaDevices, RTCPeerConnection } from 'react-native-webrtc';

import { ICE_SERVERS, RtcPeer, RtcPlatform, RtcStream } from './rtcTypes';

/** WebRTC no celular: react-native-webrtc; a voz recebida toca sozinha, e o InCallManager escolhe a saída. */
export const rtc: RtcPlatform = {
  createPeer: () => new RTCPeerConnection({ iceServers: ICE_SERVERS }) as unknown as RtcPeer,
  // No celular o WebRTC já liga cancelamento de eco, redução de ruído e ganho automático por padrão.
  openMic: async () => (await mediaDevices.getUserMedia({ audio: true, video: false })) as unknown as RtcStream,
  playRemote: () => () => {},
  // 'video' manda a voz para o alto-falante (e não para o fone de ligação), sem o sensor de proximidade.
  startCallAudio: () => InCallManager.start({ media: 'video' }),
  stopCallAudio: () => InCallManager.stop(),
};
