import type { AudioContext, AudioNode } from 'react-native-audio-api';

import type { SoundEffect } from '../game/modifiers';

export interface EffectChain {
  /** Nó onde a fonte deve ser ligada. */
  input: AudioNode;
  /** Nós criados para o efeito (desligados ao terminar). */
  nodes: AudioNode[];
  playbackRate: number;
  /** Quanto o efeito continua soando depois que a fonte acaba (eco). */
  tailMs: number;
}

/** Curva de saturação suave (tanh) para o WaveShaperNode, normalizada para ±1. */
function driveCurve(drive: number): Float32Array {
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.tanh(drive * x) / Math.tanh(drive);
  }
  return curve;
}

/**
 * Monta a sabotagem de som da roleta entre a fonte e `output`:
 * - eco: atraso de 0,22 s com realimentação;
 * - distorção: saturação forte (WaveShaper) com volume compensado;
 * - acelerado: 1,6× mais rápido (e mais agudo);
 * - telefone: só a faixa de 500 Hz a 2,5 kHz, levemente saturada.
 */
export function buildEffect(ctx: AudioContext, effect: SoundEffect | null, output: AudioNode): EffectChain {
  switch (effect) {
    case 'echo': {
      const input = ctx.createGain();
      const delay = ctx.createDelay(1);
      delay.delayTime.value = 0.22;
      const feedback = ctx.createGain();
      feedback.gain.value = 0.5;
      const wet = ctx.createGain();
      wet.gain.value = 0.7;
      input.connect(output);
      input.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(wet);
      wet.connect(output);
      return { input, nodes: [input, delay, feedback, wet], playbackRate: 1, tailMs: 1200 };
    }
    case 'distortion': {
      const shaper = ctx.createWaveShaper();
      shaper.curve = driveCurve(18);
      shaper.oversample = '4x';
      const level = ctx.createGain();
      level.gain.value = 0.45;
      shaper.connect(level);
      level.connect(output);
      return { input: shaper, nodes: [shaper, level], playbackRate: 1, tailMs: 0 };
    }
    case 'telephone': {
      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 500;
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 2500;
      const shaper = ctx.createWaveShaper();
      shaper.curve = driveCurve(3);
      highpass.connect(lowpass);
      lowpass.connect(shaper);
      shaper.connect(output);
      return { input: highpass, nodes: [highpass, lowpass, shaper], playbackRate: 1, tailMs: 0 };
    }
    case 'fast':
      return { input: output, nodes: [], playbackRate: 1.6, tailMs: 0 };
    default:
      return { input: output, nodes: [], playbackRate: 1, tailMs: 0 };
  }
}
