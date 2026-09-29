import { extractFeatures, Features } from '../dsp/features';
import { scoreImitation } from '../dsp/score';
import type { TurnScore } from '../game/types';
import { engine } from './engine';
import type { Recording } from './recording';
import { referenceProfile } from './spectrum';

const references = new Map<string, Promise<Features>>();
const profiles = new Map<string, Promise<number[]>>();

/** Decodifica e analisa (uma vez) o som de referência. Chamado antes da vez do jogador. */
export function prepareReference(id: string): Promise<Features> {
  let pending = references.get(id);
  if (!pending) {
    pending = engine.load(id).then((buffer) => extractFeatures(buffer.getChannelData(0), buffer.sampleRate));
    pending.catch(() => references.delete(id));
    references.set(id, pending);
  }
  return pending;
}

/** Silhueta fixa (média das barras) do som original, na escala das barras ao vivo. */
export function prepareProfile(id: string, bars: number): Promise<number[]> {
  const key = `${id}:${bars}`;
  let pending = profiles.get(key);
  if (!pending) {
    pending = engine.load(id).then((buffer) => referenceProfile(buffer.getChannelData(0), buffer.sampleRate, bars));
    pending.catch(() => profiles.delete(key));
    profiles.set(key, pending);
  }
  return pending;
}

/** Nota da imitação gravada contra a referência — tudo calculado no aparelho. */
export async function scoreTurn(soundId: string, recording: Recording | null): Promise<TurnScore> {
  const reference = await prepareReference(soundId);
  const imitation = recording
    ? extractFeatures(recording.samples, recording.sampleRate)
    : extractFeatures(new Float32Array(0), 16000);
  return scoreImitation(reference, imitation);
}
