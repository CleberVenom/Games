import { useEffect, useRef } from 'react';
import { Alert, Platform } from 'react-native';

import type { MatchEvent } from '../game/match';
import type { Phase } from '../game/types';
import { engine } from './engine';
import { startRecording, stopRecording } from './mic';
import { provisionalScore, Recording } from './recording';

/** Tempo mínimo da tela "Analisando…" (o DSP do Passo 3 é rápido; a pausa dá suspense). */
const ANALYSIS_MS = 1400;

function warn(message: string) {
  if (Platform.OS === 'web') window.alert(message);
  else Alert.alert('Microfone', message);
}

/**
 * Liga as fases do turno ao áudio real:
 * - handoff: pré-carrega a referência (toca sem atraso quando o jogador confirmar);
 * - listening: toca a referência e avança quando ela termina;
 * - recording: grava o microfone até o jogador tocar em parar ou a janela acabar;
 * - analyzing: calcula a nota da gravação.
 */
export function useAudioTurn(
  phase: Phase,
  soundId: string,
  referenceMs: number,
  recordingMs: number,
  dispatch: (event: MatchEvent) => void,
) {
  const recording = useRef<Promise<Recording> | null>(null);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const after = (ms: number, event: MatchEvent) => {
      timer = setTimeout(() => active && dispatch(event), ms);
    };

    if (phase === 'handoff') {
      engine.load(soundId).catch(() => {});
    } else if (phase === 'listening') {
      // Rede de segurança: se o fim da reprodução não for notificado, avança mesmo assim.
      after(referenceMs + 1500, { type: 'referenceEnded' });
      engine
        .play(soundId)
        .catch(() => warn('Não foi possível tocar o som de referência.'))
        .finally(() => active && dispatch({ type: 'referenceEnded' }));
    } else if (phase === 'recording') {
      startRecording().then(
        () => after(recordingMs, { type: 'recordingEnded' }),
        () => {
          warn('Não foi possível usar o microfone. Verifique a permissão nas configurações.');
          if (active) dispatch({ type: 'recordingEnded' });
        },
      );
    } else if (phase === 'analyzing') {
      const pending = recording.current ?? Promise.resolve(null);
      Promise.all([pending, new Promise((r) => setTimeout(r, ANALYSIS_MS))]).then(([rec]) => {
        if (active) dispatch({ type: 'scored', score: provisionalScore(rec) });
      });
    }

    // Também roda ao sair da partida: não deixa som tocando nem microfone aberto.
    return () => {
      active = false;
      clearTimeout(timer);
      if (phase === 'listening') engine.stop();
      if (phase === 'recording') recording.current = stopRecording();
    };
  }, [phase, soundId, referenceMs, recordingMs, dispatch]);
}
