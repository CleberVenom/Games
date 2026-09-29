import { useEffect } from 'react';
import { create } from 'zustand';

import { setMic, watchMics } from '../online/api';
import { MicState, micOpen, SPEAKING_LEVEL, voiceAllowed } from '../online/voice';
import { LinkState, VoiceMesh, VoiceStatus } from '../online/voiceMesh';
import { useOnline } from './online';

interface VoiceState {
  /** Situação da minha voz enquanto ela está liberada (fora dos sons). */
  status: VoiceStatus;
  mics: Record<string, MicState>;
  /** Quem está falando agora (inclusive eu). */
  speaking: Record<string, boolean>;
  links: Record<string, LinkState>;
  /** Muda para reconectar a voz depois de um erro. */
  attempt: number;
}

export const useVoice = create<VoiceState>(() => ({
  status: 'connecting',
  mics: {},
  speaking: {},
  links: {},
  attempt: 0,
}));

let mesh: VoiceMesh | null = null;

function sameSpeaking(a: Record<string, boolean>, b: Record<string, boolean>): boolean {
  const ka = Object.keys(a).filter((k) => a[k]);
  const kb = Object.keys(b).filter((k) => b[k]);
  return ka.length === kb.length && ka.every((k) => b[k]);
}

/** A voz está liberada agora (fora da imitação e da apresentação)? */
export function useVoiceAllowed(): boolean {
  const session = useOnline((s) => s.session);
  const closed = useOnline((s) => s.closed);
  const meta = useOnline((s) => s.meta);
  const round = useOnline((s) => s.round);
  return Boolean(session) && !closed && voiceAllowed(meta, round);
}

/**
 * Liga o chat de voz da sala: entra na voz quando ela está liberada e sai (soltando o microfone) quando
 * a rodada de sons começa. Fica montado na tela da sala.
 */
export function useVoiceChat() {
  const session = useOnline((s) => s.session);
  const allowed = useVoiceAllowed();
  const attempt = useVoice((s) => s.attempt);
  const code = session?.code;
  const me = session?.uid;
  const myMic = useVoice((s) => (me ? s.mics[me] : undefined));

  useEffect(() => {
    if (!code) return;
    const off = watchMics(code, (mics) => useVoice.setState({ mics }));
    return () => {
      off();
      useVoice.setState({ mics: {} });
    };
  }, [code]);

  useEffect(() => {
    if (!code || !me || !allowed) return;
    const current = new VoiceMesh(code, me, {
      status: (status) => useVoice.setState({ status }),
      links: (links) => useVoice.setState({ links }),
      levels: (levels) => {
        const speaking = Object.fromEntries(Object.entries(levels).map(([uid, l]) => [uid, l >= SPEAKING_LEVEL]));
        if (!sameSpeaking(speaking, useVoice.getState().speaking)) useVoice.setState({ speaking });
      },
    });
    mesh = current;
    current.start(micOpen(me, useVoice.getState().mics[me]));
    return () => {
      current.stop();
      if (mesh === current) mesh = null;
      useVoice.setState({ status: 'connecting', speaking: {}, links: {} });
    };
  }, [code, me, allowed, attempt]);

  useEffect(() => {
    if (me) mesh?.setMicOn(micOpen(me, myMic));
  }, [me, myMic]);
}

export const voiceActions = {
  /** Liga ou desliga o meu microfone. */
  toggleMine() {
    const { session } = useOnline.getState();
    if (!session) return;
    const open = micOpen(session.uid, useVoice.getState().mics[session.uid]);
    setMic(session.code, session.uid, session.uid, !open).catch(() => {});
  },
  /** Anfitrião mutando alguém (ligar de volta, só a própria pessoa). */
  mute(target: string) {
    const { session } = useOnline.getState();
    if (!session) return;
    setMic(session.code, session.uid, target, false).catch(() => {});
  },
  retry() {
    useVoice.setState((s) => ({ attempt: s.attempt + 1 }));
  },
};
