import { useEffect, useRef } from 'react';
import { Alert, Platform } from 'react-native';

import type { MatchEvent } from '../game/match';
import type { SoundEffect } from '../game/modifiers';
import type { Phase } from '../game/types';
import { prepareReference, scoreTurn } from './analysis';
import { engine } from './engine';
import { startRecording, stopRecording } from './mic';
import type { Recording } from './recording';

/** Eventos que o áudio do turno dispara (servem à partida local e à vez de cada celular no online). */
export type AudioTurnEvent = Extract<MatchEvent, { type: 'referenceEnded' | 'recordingEnded' | 'scored' }>;

/** Tempo mínimo da tela "Analisando…" (o DSP leva poucas dezenas de ms; a pausa dá suspense). */
const ANALYSIS_MS = 1400;

function warn(message: string) {
  if (Platform.OS === 'web') window.alert(message);
  else Alert.alert('Microfone', message);
}

/**
 * Liga as fases do turno ao áudio real:
 * - handoff: pré-carrega e analisa a referência (toca sem atraso e a nota sai mais rápido);
 * - listening: toca a referência (com a sabotagem de som da roleta) e avança quando ela termina;
 * - recording: grava o microfone até o jogador tocar em parar ou a janela acabar;
 * - analyzing: compara a gravação com a referência (src/dsp) e dá a nota.
 */
export function useAudioTurn(
  phase: Phase,
  soundId: string,
  referenceMs: number,
  recordingMs: number,
  effect: SoundEffect | null,
  dispatch: (event: AudioTurnEvent) => void,
  /** Recebe a gravação antes da nota (o modo online envia a imitação para a sala). */
  onRecorded?: (recording: Recording | null) => void,
) {
  const recording = useRef<Promise<Recording> | null>(null);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const after = (ms: number, event: AudioTurnEvent) => {
      timer = setTimeout(() => active && dispatch(event), ms);
    };

    if (phase === 'handoff') {
      prepareReference(soundId).catch(() => {});
    } else if (phase === 'listening') {
      // Rede de segurança: se o fim da reprodução não for notificado, avança mesmo assim.
      after(referenceMs + 2500, { type: 'referenceEnded' });
      engine
        .play(soundId, effect)
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
      const score = (recording.current ?? Promise.resolve(null)).then((rec) => {
        onRecorded?.(rec);
        return scoreTurn(soundId, rec);
      });
      Promise.all([score, new Promise((r) => setTimeout(r, ANALYSIS_MS))]).then(
        ([result]) => active && dispatch({ type: 'scored', score: result }),
        () => {
          warn('Não foi possível analisar a imitação.');
          if (active) dispatch({ type: 'scored', score: { total: 0, pitch: 0, rhythm: 0 } });
        },
      );
    }

    // Também roda ao sair da partida: não deixa som tocando nem microfone aberto.
    return () => {
      active = false;
      clearTimeout(timer);
      if (phase === 'listening') engine.stop();
      if (phase === 'recording') recording.current = stopRecording();
    };
  }, [phase, soundId, referenceMs, recordingMs, effect, dispatch, onRecorded]);
}
