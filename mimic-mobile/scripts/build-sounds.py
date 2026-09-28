"""Gera os sons de referência do jogo.

Saída:
  assets/sounds/<id>.wav       mono, 16 bits, 22,05 kHz, recortado e com volume normalizado
  assets/sounds/manifest.json  duração de cada som (lida por src/game/sounds.ts)
  assets/sounds/CREDITS.md     origem e licença de cada arquivo
  src/audio/soundFiles.ts      mapa id → require() dos arquivos (gerado)

Todas as gravações vêm de repositórios no GitHub, em commits fixos, e são CC0 ou domínio público.
Os sons marcados como "sintetizado" são gerados aqui mesmo (código original deste projeto, CC0).

Packs pessoais (packs-pessoais/<pack>/pack.json + áudios, uso privado — veja packs-pessoais/README.md)
viram assets/sounds/pessoais/<pack>/*.wav e src/audio/personalPacks.ts.

Uso: pip install numpy imageio-ffmpeg && python3 scripts/build-sounds.py
     --so-pessoais   só (re)processa os packs pessoais
     --sem-pessoais  gera o app sem nenhum pack pessoal (ex.: versão para a loja)
"""
import json
import re
import subprocess
import sys
import unicodedata
import urllib.parse
import urllib.request
import wave
from pathlib import Path

import imageio_ffmpeg
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "sounds"
CACHE = Path(__file__).resolve().parent / ".cache"
SR = 22050

REPOS = {
    "esc50": ("karolpiczak/ESC-50", "33c8ce9eb2cf0b1c2f8bcf322eb349b6be34dbb6"),
    "sonicpi": ("sonic-pi-net/sonic-pi", "008e53c05fa247b674b042737dde3acd981d32d1"),
    "vcsl": ("sgossner/VCSL", "c1ea7bcc3c7309650ab0da9d15c9cd1fbc4a4c7e"),
    "animal": ("DJWoodZ/Animal-Sounds", "0fd2848e54f6278c47ed7592e7ff90488e3a6e87"),
    "learn": ("Courtside-live01/learntoread", "0baca75e483d1991498d3b884a0d912db86abb26"),
    "lav": ("lavenderdotpet/CC0-Public-Domain-Sounds", "f2b6264f9ab89fabc266914c3654685d68c5a39b"),
}


def fsd(sound_id: int, name: str, author: str) -> str:
    return f'"{name}" de {author} ([freesound {sound_id}](https://freesound.org/s/{sound_id}/))'


# id, fonte, créditos, licença e ajustes (start/end em segundos na fonte; max = duração máxima).
SOUNDS = [
    # Animais
    dict(id="dog-bark", src=("esc50", "audio/2-118964-A-0.wav"), credit=fsd(118964, "Dog Bark 4", "esperri") + ", via ESC-50", license="CC0"),
    dict(id="cat-meow", src=("lav", "Micro Pack - Cat Meows/Cat Meows - Food Time 3.wav"), credit='"Cat Meows" de Ben Burnes, via CC0-Public-Domain-Sounds', license="CC0"),
    dict(id="rooster", src=("esc50", "audio/3-149189-A-1.wav"), credit=fsd(149189, "rooster cock-a-doodle-doo", "videog") + ", via ESC-50", license="CC0"),
    dict(id="cow-moo", src=("animal", "src/sounds/cow-moo.ogg"), credit='"cow-moo" de DJ WoodZ (derivado de "Cow moos" de josephsardin)', license="CC0"),
    dict(id="pig-oink", src=("animal", "src/sounds/pig-oink.ogg"), credit='"pig-oink" de DJ WoodZ', license="CC0"),
    dict(id="sheep-baa", src=("animal", "src/sounds/sheep-baa.ogg"), credit='"sheep-baa" de DJ WoodZ', license="CC0"),
    dict(id="hen-cluck", src=("animal", "src/sounds/chicken-cluck.ogg"), credit='"chicken-cluck" de DJ WoodZ', license="CC0"),
    dict(id="crow", src=("sonicpi", "etc/samples/misc_crow.flac"), credit=fsd(54973, "crow", "davidworksonline") + ", via Sonic Pi", license="CC0"),
    dict(id="lion-roar", src=("learn", "animals/clips/lion.mp3"), credit='"Lion raring-sound1TamilNadu178.ogg" de த*உழவன் (Wikimedia Commons)', license="Domínio público", max=1.6),
    dict(id="horse-neigh", src=("learn", "animals/clips/horse.mp3"), credit='"Wiehern.ogg" de Hü. (Wikimedia Commons)', license="Domínio público"),
    # Pessoas
    dict(id="evil-laugh", src=("esc50", "audio/4-167571-A-26.wav"), credit=fsd(167571, "evil-laugh", "dlovere") + ", via ESC-50", license="CC0"),
    dict(id="sneeze", src=("esc50", "audio/4-167642-A-21.wav"), credit=fsd(167642, "Sneeze 01", "SoundCollectah") + ", via ESC-50", license="CC0"),
    dict(id="snore", src=("esc50", "audio/3-151557-B-28.wav"), credit=fsd(151557, "Snoring", "Erik Pritzens") + ", via ESC-50", license="CC0", max=2.0),
    dict(id="baby-cry", src=("esc50", "audio/3-152007-A-20.wav"), credit=fsd(152007, "babys crying", "winsx87") + ", via ESC-50", license="CC0", max=2.4),
    dict(id="burp", src=("sonicpi", "etc/samples/misc_burp.flac"), credit=fsd(222022, "burp", "anas76") + ", via Sonic Pi", license="CC0"),
    # Memes e zoeira
    dict(id="sad-trombone", synth="sad_trombone", credit="Sintetizado (melodia tradicional)", license="CC0"),
    dict(id="rimshot", synth="rimshot", credit="Montado com samples de bateria do Sonic Pi (freesound, CC0)", license="CC0"),
    dict(id="record-scratch", src=("sonicpi", "etc/samples/vinyl_backspin.flac"), credit=fsd(182316, "vinyl backspin", "il112") + ", via Sonic Pi", license="CC0"),
    dict(id="air-horn", synth="air_horn", credit="Sintetizado", license="CC0"),
    dict(id="gas-truck", synth="gas_truck", credit="Sintetizado — Für Elise, de Beethoven (obra em domínio público)", license="CC0"),
    dict(id="old-phone", synth="old_phone", credit="Sintetizado — Gran Vals, de Francisco Tárrega (obra em domínio público)", license="CC0"),
    dict(id="dun-dun-dun", synth="dun_dun_dun", credit="Sintetizado", license="CC0"),
    dict(id="flawless-victory", src=("lav", "kenney_voiceoverfighter/Audio/flawless_victory.ogg"), credit='"Voiceover Pack: Fighter" de Kenney', license="CC0"),
    dict(id="fire-in-the-hole", src=("lav", "kenney_voiceoverpack/Male/war_fire_in_the_hole.ogg"), credit='"Voiceover Pack" de Kenney', license="CC0"),
    dict(id="game-over", src=("lav", "kenney_voiceoverfighter/Audio/game_over.ogg"), credit='"Voiceover Pack: Fighter" de Kenney', license="CC0"),
    dict(id="crickets", src=("esc50", "audio/3-134802-A-13.wav"), credit=fsd(134802, "barrage of crickets chirping", "ianjuby") + ", via ESC-50", license="CC0", max=2.5),
    dict(id="dramatic-boom", synth="boom", credit="Sintetizado", license="CC0"),
    # Efeitos
    dict(id="car-horn", src=("esc50", "audio/2-54086-A-43.wav"), credit=fsd(54086, "horn", "guitarguy1985") + ", via ESC-50", license="CC0"),
    dict(id="siren", src=("esc50", "audio/2-70938-A-42.wav"), credit=fsd(70938, "police2", "guitarguy1985") + ", via ESC-50", license="CC0"),
    dict(id="referee-whistle", src=("vcsl", "Aerophones/Edge-blown Aerophones/Ball Whistle/Main_BallWhistle_Long-001.wav"), credit="Ball Whistle — VCSL (Versilian Studios)", license="CC0", max=1.6),
    dict(id="train-whistle", src=("vcsl", "Aerophones/Edge-blown Aerophones/Train Whistle, Toy/Main_TrainLow_Double-001.wav"), credit="Train Whistle, Toy — VCSL (Versilian Studios)", license="CC0"),
    dict(id="boing", src=("vcsl", "Idiophones/Struck Idiophones/Flexatone/flexatone_fast.wav"), credit="Flexatone — VCSL (Versilian Studios)", license="CC0", max=2.0),
    dict(id="alarm-clock", src=("esc50", "audio/5-223176-A-37.wav"), credit=fsd(223176, "Generic Alarm Clock", "Yoyodaman234") + ", via ESC-50", license="CC0"),
    dict(id="toilet-flush", src=("esc50", "audio/5-202020-A-18.wav"), credit=fsd(202020, "toilet flush", "ryancacophony") + ", via ESC-50", license="CC0", max=2.5),
    dict(id="robot", src=("sonicpi", "etc/samples/mehackit_robot3.flac"), credit=fsd(415566, "robot", "hullum") + ", via Sonic Pi", license="CC0"),
    dict(id="laser", synth="laser", credit="Sintetizado", license="CC0"),
    dict(id="vuvuzela", synth="vuvuzela", credit="Sintetizado", license="CC0"),
]


# ---------------------------------------------------------------- fontes

def fetch(repo_key: str, path: str) -> Path:
    repo, sha = REPOS[repo_key]
    dest = CACHE / repo_key / path
    if not dest.exists():
        dest.parent.mkdir(parents=True, exist_ok=True)
        url = f"https://raw.githubusercontent.com/{repo}/{sha}/{urllib.parse.quote(path)}"
        urllib.request.urlretrieve(url, dest)
    return dest


def decode(path: Path) -> np.ndarray:
    raw = subprocess.run(
        [imageio_ffmpeg.get_ffmpeg_exe(), "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
        capture_output=True,
        check=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


# ---------------------------------------------------------------- tratamento

HOP = SR // 100  # 10 ms


def envelope_db(x: np.ndarray) -> np.ndarray:
    n = len(x) // HOP
    frames = x[: n * HOP].reshape(n, HOP)
    return 20 * np.log10(np.sqrt(np.mean(frames**2, axis=1)) + 1e-9)


def auto_trim(x: np.ndarray, max_s: float) -> np.ndarray:
    """Recorta o evento principal: do primeiro ao último trecho a até 30 dB do pico; se passar de
    `max_s`, fica com a janela de `max_s` com mais energia."""
    env = envelope_db(x)
    active = np.where(env > env.max() - 30)[0]
    start, end = active[0], active[-1] + 1
    win = int(max_s * 100)
    if end - start > win:
        power = np.convolve(10 ** (env[start:end] / 10), np.ones(win), "valid")
        start += int(np.argmax(power))
        end = start + win
    start = max(start - 3, 0)
    end = min(end + 8, len(env))
    return x[start * HOP : end * HOP]


def finish(x: np.ndarray) -> np.ndarray:
    """Volume uniforme entre os sons (RMS da parte ativa em −18 dBFS, pico ≤ −1 dBFS) + fades."""
    env = envelope_db(x)
    loud = env > env.max() - 20
    rms = np.sqrt(np.mean(10 ** (env[loud] / 10)))
    x = x * (10 ** (-18 / 20) / rms)
    peak = np.max(np.abs(x))
    if peak > 10 ** (-1 / 20):
        x = x * (10 ** (-1 / 20) / peak)
    fade_in, fade_out = int(0.005 * SR), int(0.08 * SR)
    x[:fade_in] *= np.linspace(0, 1, fade_in)
    x[-fade_out:] *= np.linspace(1, 0, fade_out)
    return x


def write_wav(path: Path, x: np.ndarray) -> None:
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype("<i2").tobytes())


# ---------------------------------------------------------------- síntese

def t_axis(dur: float) -> np.ndarray:
    return np.arange(int(dur * SR)) / SR


def gate(t: np.ndarray, attack: float, release: float) -> np.ndarray:
    dur = t[-1] if len(t) else 0
    return np.clip(t / attack, 0, 1) * np.clip((dur - t) / release, 0, 1)


def brass(freq, t, brightness=1.0, harmonics=14):
    """Timbre de metal: série harmônica tipo dente-de-serra, com brilho controlável (surdina)."""
    phase = 2 * np.pi * np.cumsum(freq * np.ones_like(t)) / SR
    return sum((brightness ** (k / 3)) * np.sin(k * phase) / k for k in range(1, harmonics + 1))


def sad_trombone():
    notes = [(196.0, 0.36), (185.0, 0.36), (174.6, 0.36), (164.8, 1.3)]  # Sol, Fá#, Fá, Mi
    out = []
    for i, (f, d) in enumerate(notes):
        t = t_axis(d)
        vib = 1 + (0.015 * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - 0.2) / 0.3, 0, 1) if i == 3 else 0)
        wah = np.clip(t / 0.09, 0, 1) * (0.55 + 0.45 * np.cos(np.pi * np.clip(t / d, 0, 1)) ** 2)
        out.append(brass(f * vib, t, wah) * gate(t, 0.03, 0.07))
    return np.concatenate(out)


def air_horn():
    out = []
    for d, gap in [(0.22, 0.07), (0.22, 0.07), (0.95, 0)]:
        t = t_axis(d)
        sig = sum(brass(f * (1 + 0.004 * np.sin(2 * np.pi * 7 * t)), t, 1.0, 10) for f in (370.0, 392.0 * 1.01, 466.2))
        out += [np.tanh(1.6 * sig / 3) * gate(t, 0.012, 0.05), np.zeros(int(gap * SR))]
    return np.concatenate(out)


def melody(notes, unit, voice, overlap=0.0):
    """Toca (freq, duração em unidades) em sequência; cada nota pode soar além da seguinte (`overlap`)."""
    total = sum(d for _, d in notes) * unit + overlap + 0.05
    out = np.zeros(int(total * SR))
    pos = 0.0
    for f, d in notes:
        t = t_axis(d * unit + overlap)
        start = int(pos * SR)
        out[start : start + len(t)] += voice(f, t, d * unit)
        pos += d * unit
    return out


def gas_truck():
    # Für Elise: Mi Ré# Mi Ré# Mi Si Ré Dó Lá (como no carro do gás)
    E5, Ds5, B4, D5, C5, A4 = 659.25, 622.25, 493.88, 587.33, 523.25, 440.0
    notes = [(E5, 1), (Ds5, 1), (E5, 1), (Ds5, 1), (E5, 1), (B4, 1), (D5, 1), (C5, 1), (A4, 4)]

    def chime(f, t, _):
        ph = 2 * np.pi * f * t
        return (np.sin(ph) + 0.4 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph)) * np.exp(-t / 0.35) * np.clip(t / 0.004, 0, 1)

    return melody(notes, 0.17, chime, overlap=0.4)


def old_phone():
    # Gran Vals (o toque de celular mais famoso): colcheias, semínimas e mínima final
    E6, D6, Fs5, Gs5, Cs6, B5, D5, E5, A5, Cs5 = 1318.5, 1174.7, 740.0, 830.6, 1108.7, 987.8, 587.3, 659.3, 880.0, 554.4
    notes = [(E6, 1), (D6, 1), (Fs5, 2), (Gs5, 2), (Cs6, 1), (B5, 1), (D5, 2), (E5, 2), (B5, 1), (A5, 1), (Cs5, 2), (E5, 2), (A5, 4)]

    def beep(f, t, d):
        ph = 2 * np.pi * f * t
        square = sum(np.sin(k * ph) / k for k in (1, 3, 5, 7))
        return square * gate(t, 0.004, 0.02) * (t < d * 0.88)

    return melody(notes, 0.13, beep)


def dun_dun_dun():
    def chord(root, dur, tremolo=False):
        t = t_axis(dur)
        freqs = [root / 2, root, root * 2 ** (3 / 12), root * 2 ** (7 / 12)]  # menor, com baixo
        sig = sum(brass(f * (1 + 0.002 * j), t, 0.9, 10) for j, f in enumerate(freqs))
        env = gate(t, 0.015, 0.25 if tremolo else 0.06)
        if tremolo:
            env *= (1 - 0.25 * (0.5 + 0.5 * np.sin(2 * np.pi * 7 * t))) * np.exp(-t / 1.4)
        return sig * env

    gap = np.zeros(int(0.08 * SR))
    return np.concatenate([chord(196.0, 0.26), gap, chord(196.0, 0.26), gap, chord(185.0, 1.5, tremolo=True)])


def laser():
    out = []
    for d in (0.26, 0.32):
        t = t_axis(d)
        f = 2300 * np.exp(-t * 10) + 170
        ph = 2 * np.pi * np.cumsum(f) / SR
        out += [(0.6 * np.sin(ph) + 0.4 * np.sign(np.sin(ph))) * np.exp(-t * 7) * np.clip(t / 0.003, 0, 1), np.zeros(int(0.08 * SR))]
    return np.concatenate(out)


def vuvuzela():
    t = t_axis(1.8)
    f = 233.1 * (1 + 0.006 * np.sin(2 * np.pi * 4.2 * t) + 0.004 * np.sin(2 * np.pi * 0.7 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    sig = sum(np.sin(k * ph) / k**0.6 for k in range(1, 24))
    return np.tanh(sig / 4) * gate(t, 0.08, 0.12)


def boom():
    """Pancada grave de efeito dramático: seno que despenca de 140 Hz para 40 Hz, saturado."""
    t = t_axis(1.3)
    f = 40 + 100 * np.exp(-t * 14)
    ph = 2 * np.pi * np.cumsum(f) / SR
    sig = np.sin(ph) + 0.35 * np.sin(2 * ph)
    click = np.random.default_rng(7).standard_normal(len(t)) * np.exp(-t * 180) * 0.4
    return np.tanh(2.2 * (sig * np.exp(-t / 0.45) + click)) * np.clip(t / 0.002, 0, 1)


def rimshot():
    def hit(name, at, gain):
        x = decode(fetch("sonicpi", f"etc/samples/{name}.flac"))
        return at, x * gain

    parts = [hit("drum_tom_mid_hard", 0.0, 0.9), hit("drum_tom_lo_hard", 0.17, 1.0), hit("drum_bass_hard", 0.42, 0.7), hit("drum_splash_hard", 0.42, 0.9)]
    out = np.zeros(int(1.8 * SR))
    for at, x in parts:
        s = int(at * SR)
        n = min(len(x), len(out) - s)
        out[s : s + n] += x[:n]
    return out


SYNTHS = {f.__name__: f for f in (sad_trombone, air_horn, gas_truck, old_phone, dun_dun_dun, laser, vuvuzela, boom, rimshot)}


# ---------------------------------------------------------------- build

def build(spec: dict) -> np.ndarray:
    if "synth" in spec:
        x = SYNTHS[spec["synth"]]()
    else:
        x = decode(fetch(*spec["src"]))
        if "start" in spec or "end" in spec:
            x = x[int(spec.get("start", 0) * SR) : int(spec["end"] * SR) if "end" in spec else None]
    return finish(auto_trim(x, spec.get("max", 3.0)))


PERSONAL_IN = ROOT / "packs-pessoais"
PERSONAL_OUT = OUT / "pessoais"
AUDIO_EXT = {".mp3", ".wav", ".ogg", ".oga", ".m4a", ".aac", ".flac", ".opus", ".webm"}
PERSONAL_MAX_S = 5.0


def slug(text: str) -> str:
    ascii_text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", ascii_text.lower()).strip("-") or "som"


def build_personal(include: bool) -> None:
    """Processa packs-pessoais/ e gera src/audio/personalPacks.ts (lista vazia com include=False)."""
    packs = []
    if include and PERSONAL_IN.exists():
        for folder in sorted(p for p in PERSONAL_IN.iterdir() if (p / "pack.json").exists()):
            meta = json.loads((folder / "pack.json").read_text(encoding="utf-8"))
            pack_slug = slug(folder.name)
            sounds = []
            for audio in sorted(f for f in folder.iterdir() if f.suffix.lower() in AUDIO_EXT):
                x = finish(auto_trim(decode(audio), PERSONAL_MAX_S))
                name = slug(audio.stem)
                dest = PERSONAL_OUT / pack_slug / f"{name}.wav"
                dest.parent.mkdir(parents=True, exist_ok=True)
                write_wav(dest, x)
                title = re.sub(r"[_-]+", " ", audio.stem).strip()
                sounds.append((f"personal:{pack_slug}/{name}", title, round(len(x) / SR * 1000), dest))
                print(f"pessoal {pack_slug}/{name:24} {len(x) / SR:5.2f} s")
            if sounds:
                packs.append((pack_slug, meta, sounds))

    body = []
    for pack_slug, meta, sounds in packs:
        items = "\n".join(
            f"      {{ id: {json.dumps(sid)}, title: {json.dumps(title, ensure_ascii=False)}, durationMs: {ms}, "
            f"file: require('../../{dest.relative_to(ROOT).as_posix()}') }},"
            for sid, title, ms, dest in sounds
        )
        body.append(
            "  {\n"
            f"    id: {json.dumps('personal:' + pack_slug)},\n"
            f"    title: {json.dumps(meta.get('title', pack_slug), ensure_ascii=False)},\n"
            f"    description: {json.dumps(meta.get('description', 'Pack pessoal'), ensure_ascii=False)},\n"
            f"    icon: {json.dumps(meta.get('icon', 'albums'))},\n"
            f"    sounds: [\n{items}\n    ],\n"
            "  },"
        )
    (ROOT / "src" / "audio" / "personalPacks.ts").write_text(
        "// Gerado por scripts/build-sounds.py — não edite à mão.\n"
        "// Packs da pasta packs-pessoais/ (uso privado do grupo; veja packs-pessoais/README.md).\n\n"
        "export interface PersonalPack {\n"
        "  id: string;\n  title: string;\n  description: string;\n  icon: string;\n"
        "  sounds: { id: string; title: string; durationMs: number; file: number }[];\n}\n\n"
        "export const PERSONAL_PACKS: PersonalPack[] = ["
        + ("\n" + "\n".join(body) + "\n" if body else "")
        + "];\n"
    )


def main() -> None:
    if "--so-pessoais" in sys.argv:
        build_personal(include=True)
        return
    OUT.mkdir(parents=True, exist_ok=True)
    manifest, credits = {}, []
    for spec in SOUNDS:
        x = build(spec)
        write_wav(OUT / f"{spec['id']}.wav", x)
        manifest[spec["id"]] = {"durationMs": round(len(x) / SR * 1000)}
        credits.append(f"| `{spec['id']}.wav` | {spec['credit']} | {spec['license']} |")
        print(f"{spec['id']:18} {len(x) / SR:5.2f} s")

    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    (OUT / "CREDITS.md").write_text(
        "# Créditos dos sons\n\n"
        "Gerado por `scripts/build-sounds.py`. Todos os arquivos são **CC0** ou **domínio público** — não exigem\n"
        "atribuição, mas registramos a origem por transparência. As gravações foram baixadas de commits fixos dos\n"
        "repositórios [ESC-50](https://github.com/karolpiczak/ESC-50) (só os clipes marcados como CC0 no LICENSE),\n"
        "[Sonic Pi](https://github.com/sonic-pi-net/sonic-pi/tree/dev/etc/samples),\n"
        "[VCSL](https://github.com/sgossner/VCSL), [Animal-Sounds](https://github.com/DJWoodZ/Animal-Sounds),\n"
        "[learntoread](https://github.com/Courtside-live01/learntoread) e\n"
        "[CC0-Public-Domain-Sounds](https://github.com/lavenderdotpet/CC0-Public-Domain-Sounds).\n"
        "Processamento: mono, recorte do evento principal, volume normalizado e WAV 16 bits/22,05 kHz.\n\n"
        "| Arquivo | Origem | Licença |\n|---|---|---|\n" + "\n".join(credits) + "\n"
    )
    lines = [f"  '{s['id']}': require('../../assets/sounds/{s['id']}.wav')," for s in SOUNDS]
    (ROOT / "src" / "audio" / "soundFiles.ts").write_text(
        "// Gerado por scripts/build-sounds.py — não edite à mão.\n"
        "export const SOUND_FILES: Record<string, number> = {\n" + "\n".join(lines) + "\n};\n"
    )
    build_personal(include="--sem-pessoais" not in sys.argv)


if __name__ == "__main__":
    main()
