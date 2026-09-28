"""Gera os samples de bateria usados pelo app a partir das fontes CC0 originais.

Fontes (ambas Creative Commons 0 / dominio publico):
  * Sonic Pi samples (gravacoes de freesound.org por menegass e Zajo):
      https://github.com/sonic-pi-net/sonic-pi/tree/dev/etc/samples  (arquivos drum_*.flac)
  * VCSL - Versilian Community Sample Library:
      https://github.com/sgossner/VCSL

Uso:
  pip install numpy scipy soundfile
  python3 scripts/build-samples.py --sonicpi <pasta com drum_*.flac> --vcsl <clone do VCSL>

Processamento: mono, corte do silencio inicial (ataque alinhado para o timing do jogo),
corte da cauda com fade-out, normalizacao em -1 dBFS, WAV 16-bit 44.1 kHz.
"""
import argparse
import soundfile as sf, numpy as np, os
from scipy.signal import resample_poly
ap = argparse.ArgumentParser()
ap.add_argument('--sonicpi', required=True)
ap.add_argument('--vcsl', required=True)
ap.add_argument('--out', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'sounds'))
args = ap.parse_args()
OUT = os.path.abspath(args.out)
SPI = args.sonicpi
V = args.vcsl
HH = f'{V}/Idiophones/Struck Idiophones/Hi-Hat Cymbal'
C1 = f'{V}/Idiophones/Struck Idiophones/Suspended Cymbal 1'
C2 = f'{V}/Idiophones/Struck Idiophones/Suspended Cymbal 2'
SN = f'{V}/Membranophones/Struck Membranophones/Snare Drum, Modern 1'
T1 = f'{V}/Membranophones/Struck Membranophones/Tom 1/Stick'
T2 = f'{V}/Membranophones/Struck Membranophones/Tom 2/Stick'

def load(path, semitones=0.0):
    d, sr = sf.read(path, always_2d=True)
    m = d.mean(axis=1)
    assert sr == 44100
    if semitones:
        # repitch like a sampler: resample by 2^(st/12) (changes duration too)
        ratio = 2 ** (semitones / 12)
        up, down = 1000, int(round(1000 * ratio))
        m = resample_poly(m, up, down)
    return m, sr

def process(src, dst, max_dur, semitones=0.0, gate_db=-55, fade_ms=60):
    m, sr = load(src, semitones)
    peak = np.abs(m).max()
    env = np.abs(m)
    thr = peak * 10 ** (-30 / 20)
    onset = max(0, np.argmax(env > thr) - int(0.001 * sr))
    m = m[onset:]
    tail_thr = peak * 10 ** (gate_db / 20)
    idx = np.where(np.abs(m) > tail_thr)[0]
    end = min(len(m), idx[-1] + 1 if len(idx) else len(m), int(max_dur * sr))
    m = m[:end].copy()
    f = min(int(fade_ms / 1000 * sr), len(m) // 3)
    m[-f:] *= np.linspace(1, 0, f) ** 2
    m = m / np.abs(m).max() * 10 ** (-1 / 20)  # normalize to -1 dBFS
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    sf.write(dst, m.astype(np.float32), sr, subtype='PCM_16')
    print(f'{dst.replace(OUT + "/", ""):32s} {len(m) / sr:5.2f}s  {os.path.getsize(dst) // 1024}KB')

# --- Set "acustico": Sonic Pi / freesound (menegass, Zajo) CC0
A = f'{OUT}/acustico'
process(f'{SPI}/drum_bass_hard.flac', f'{A}/kick_1.wav', 0.7)
process(f'{SPI}/drum_snare_hard.flac', f'{A}/snare_1.wav', 0.45)
process(f'{SPI}/drum_cymbal_closed.flac', f'{A}/hihat_1.wav', 0.25)
process(f'{SPI}/drum_cymbal_open.flac', f'{A}/hihat_open_1.wav', 1.8)
process(f'{SPI}/drum_tom_hi_hard.flac', f'{A}/tom1_1.wav', 0.75)
process(f'{SPI}/drum_tom_lo_hard.flac', f'{A}/floor_1.wav', 1.0)
process(f'{SPI}/drum_cymbal_hard.flac', f'{A}/crash_1.wav', 1.65)

# --- Set "estudio": VCSL (Versilian Studios) CC0, multi round-robin
S = f'{OUT}/estudio'
process(f'{SN}/Snare2_HitSN_v9_rr1_Mid.wav', f'{S}/snare_1.wav', 0.6)
process(f'{SN}/Snare2_HitSN_v9_rr2_Mid.wav', f'{S}/snare_2.wav', 0.6)
process(f'{HH}/HiHat_HitC_v4_rr1_Mid.wav', f'{S}/hihat_1.wav', 0.4)
process(f'{HH}/HiHat_HitC_v4_rr2_Mid.wav', f'{S}/hihat_2.wav', 0.4)
process(f'{HH}/HiHat_HitO_rr1_Mid.wav', f'{S}/hihat_open_1.wav', 2.0)
process(f'{T1}/TomH_HitS_v4_rr1_Mid.wav', f'{S}/tom1_1.wav', 1.0)
process(f'{T1}/TomH_HitS_v4_rr2_Mid.wav', f'{S}/tom1_2.wav', 1.0)
process(f'{T1}/TomH_HitS_v4_rr1_Mid.wav', f'{S}/tom2_1.wav', 1.1, semitones=-3)
process(f'{T1}/TomH_HitS_v4_rr2_Mid.wav', f'{S}/tom2_2.wav', 1.1, semitones=-3)
process(f'{T2}/TomL_HitS_v4_rr1_Mid.wav', f'{S}/floor_1.wav', 1.2)
process(f'{T2}/TomL_HitS_v4_rr2_Mid.wav', f'{S}/floor_2.wav', 1.2)
process(f'{C1}/susCymb1_hit_stick_f1.wav', f'{S}/crash_1.wav', 3.0, fade_ms=400)
process(f'{C2}/susCymb2_hit_stick_mp1.wav', f'{S}/ride_1.wav', 1.6, fade_ms=300)

# --- Set "metal": tighter kick + repitched real cymbals/toms
M = f'{OUT}/metal'
process(f'{SPI}/drum_heavy_kick.flac', f'{M}/kick_1.wav', 0.3)

# --- Count-in / metronome: real stick click (cross-stick on snare rim)
process(f'{SN}/Snare2_stick_v1_rr1_Mid.wav', f'{OUT}/comum/stick_1.wav', 0.25)
process(f'{SN}/Snare2_stick_v1_rr2_Mid.wav', f'{OUT}/comum/stick_2.wav', 0.25)
