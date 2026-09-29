import { resample } from '../dsp/resample';

/** Taxa das imitações enviadas pela rede: voz inteligível e ~77 KB (base64) para 3,6 s. */
export const CLIP_NET_RATE = 16000;
/** Maior ganho aplicado para deixar a imitação audível (evita estourar o chiado de uma gravação muda). */
const MAX_GAIN = 8;
const TARGET_PEAK = 0.9;

const MU = 255;

function muEncode(x: number): number {
  const s = Math.max(-1, Math.min(1, x));
  const y = (Math.sign(s) * Math.log1p(MU * Math.abs(s))) / Math.log1p(MU);
  return Math.round(((y + 1) / 2) * 255);
}

function muDecode(byte: number): number {
  const y = (byte / 255) * 2 - 1;
  return (Math.sign(y) * ((1 + MU) ** Math.abs(y) - 1)) / MU;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function toBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += ALPHABET[(n >> 18) & 63] + ALPHABET[(n >> 12) & 63];
    out += i + 1 < bytes.length ? ALPHABET[(n >> 6) & 63] : '=';
    out += i + 2 < bytes.length ? ALPHABET[n & 63] : '=';
  }
  return out;
}

export function fromBase64(text: string): Uint8Array {
  const clean = text.replace(/=+$/, '');
  const bytes = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let bits = 0;
  let value = 0;
  let j = 0;
  for (const ch of clean) {
    value = (value << 6) | ALPHABET.indexOf(ch);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[j++] = (value >> bits) & 255;
    }
  }
  return bytes;
}

/**
 * Prepara a gravação de uma imitação para ir à sala: 16 kHz, volume ajustado (pico em 0,9, ganho até 8×)
 * e μ-law de 8 bits em base64.
 */
export function encodeClip(samples: Float32Array, sampleRate: number): string {
  const x = resample(samples, sampleRate, CLIP_NET_RATE);
  let peak = 0;
  for (let i = 0; i < x.length; i++) peak = Math.max(peak, Math.abs(x[i]));
  const gain = peak > 0 ? Math.min(MAX_GAIN, TARGET_PEAK / peak) : 1;
  const bytes = new Uint8Array(x.length);
  for (let i = 0; i < x.length; i++) bytes[i] = muEncode(x[i] * gain);
  return toBase64(bytes);
}

/** Volta a imitação da sala para PCM (a 16 kHz) para tocar na apresentação. */
export function decodeClip(data: string): Float32Array<ArrayBuffer> {
  const bytes = fromBase64(data);
  const out = new Float32Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) out[i] = muDecode(bytes[i]);
  return out;
}
