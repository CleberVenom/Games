"""Gera os sons de referência do jogo.

Saída:
  assets/sounds/<id>.wav       mono, 16 bits, 22,05 kHz, recortado e com volume normalizado
  assets/sounds/manifest.json  título, pack e duração de cada som (lido por src/game/sounds.ts)
  assets/sounds/CREDITS.md     origem e licença de cada arquivo
  src/audio/soundFiles.ts      mapa id → require() dos arquivos (gerado)

Todas as gravações são CC0 ou domínio público: vêm de repositórios no GitHub, em commits fixos, ou
de prévias de sons CC0 do Freesound. Os sons marcados como "sintetizado" são gerados aqui mesmo
(código original deste projeto, CC0). Cada som fica com 1,4 a 15 s: a gravação da imitação dura o
mesmo que o som, então os que ficarem mais curtos que 1,4 s são descartados (vale para os pessoais).

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
    "learn": ("Courtside-live01/learntoread", "0baca75e483d1991498d3b884a0d912db86abb26"),
    "lav": ("lavenderdotpet/CC0-Public-Domain-Sounds", "f2b6264f9ab89fabc266914c3654685d68c5a39b"),
}

# Prévias HQ de sons CC0 do Freesound: id → (caminho da prévia, autor, título original).
FREESOUND = {
    504988: ("504/504988_1661766", "felix.blume", "Macaw Parrot screaming in a park"),
    465697: ("465/465697_9159316", "Breviceps", "Owl Hoot"),
    562605: ("562/562605_12627963", "Viniuau", "Cicada"),
    436790: ("436/436790_3206727", "roboroo", "Thunder Clap"),
    362283: ("362/362283_676927", "zachrau", "Sheep bleating"),
    705300: ("705/705300_1661766", "felix.blume", "Donkey braying loud with distant village atmosphere, close recording"),
    495688: ("495/495688_8923841", "poodaddy69", "Happy Goat"),
    399186: ("399/399186_1032573", "genel", "wolf 2.wav"),
    611721: ("611/611721_13511310", "_justMonke_", "Big Lion Roar"),
    323650: ("323/323650_3284078", "1000kcirtap", "Long burp / Langer Rülps.wav"),
    125419: ("125/125419_2268347", "jyoung20", "Man Yawning.wav"),
    776025: ("776/776025_13922306", "9voltfan", "Hiccups"),
    784056: ("784/784056_15444236", "FriendComIndustries", "gargling"),
    59572: ("59/59572_571436", "3bagbrew", "whistling_kettle2.mp3"),
    638160: ("638/638160_12739873", "martinmih123", "SFX_Int_Mono_MicrowaveBeeping.wav"),
    709948: ("709/709948_3199363", "Squidems", "Doorbell"),
    15417: ("15/15417_45698", "pagancow", "Zipper5.wav"),
    781071: ("781/781071_16471339", "Morimorimori42", "Blender (empty) - long blending + short pulses"),
    384487: ("384/384487_208707", "mobaudio", "cell phone vibrate glass_loopable.wav"),
    202809: ("202/202809_285997", "bone666138", "Motorcycle Kickstart and Rev"),
    49306: ("49/49306_431614", "FOSSA11", "drumroll.wav"),
    752707: ("752/752707_9250976", "Nox_Sound", "Voice_Crowd_Small_Expression_Boo_Stereo"),
    658932: ("658/658932_14147481", "thearchiveguy99", "Dial-up_sound.mp3.flac"),
}

# Regra do jogo: a gravação dura o mesmo que o som, então sons curtos demais ficam de fora.
MIN_S = 1.4
MAX_S = 15.0


def secs(value: float) -> str:
    """Segundos no jeito brasileiro (1,4)."""
    return f"{value:g}".replace(".", ",")


def fsd(sound_id: int, name: str, author: str) -> str:
    return f'"{name}" de {author} ([freesound {sound_id}](https://freesound.org/s/{sound_id}/))'


def fs(sound_id: int) -> dict:
    """Fonte + crédito de um som CC0 do Freesound (prévia HQ)."""
    _, user, title = FREESOUND[sound_id]
    return dict(src=("freesound", sound_id), credit=fsd(sound_id, title, user), license="CC0")


def esc(clip: str, sound_id: int, name: str, author: str) -> dict:
    """Clipe do ESC-50 marcado como CC0 no LICENSE do dataset."""
    return dict(src=("esc50", f"audio/{clip}"), credit=fsd(sound_id, name, author) + ", via ESC-50", license="CC0")


def lav(path: str, credit: str) -> dict:
    return dict(src=("lav", path), credit=credit, license="CC0")


KENNEY = '"Voiceover Pack" de Kenney'
KENNEY_FIGHTER = '"Voiceover Pack: Fighter" de Kenney'
RETRO = '"Free Retro Arcade Sounds" de The Motion Monkey'
RETRO_DIR = "MMRetroArcadeSoundsPack1_0_5"
MALE = "kenney_voiceoverpack/Male"
FIGHTER = "kenney_voiceoverfighter/Audio"

# Cada som: id, pack, título (pt-BR), fonte e crédito. Ajustes: max = duração máxima (s) do recorte;
# start/end = trecho da fonte (s); parts = falas/sons emendados [(fonte, pausa depois, duração máx.)].
SOUNDS = [
    # Animais
    dict(id="dog-bark", pack="animais", title="Latido de cachorro", **esc("2-114587-A-0.wav", 114587, "Buddy Bark", "InDaHouse20"), max=2.5),
    dict(id="cat-meow", pack="animais", title="Miado de gato", **esc("4-120160-A-5.wav", 120160, "Cat Wants Food", "Oneirophile")),
    dict(id="rooster", pack="animais", title="Canto do galo", **esc("3-154957-A-1.wav", 154957, "brahma-rooster", "signorvaso")),
    dict(id="cow-moo", pack="animais", title="Mugido de vaca", **esc("3-163727-A-3.wav", 163727, "Cow mooing in south of France (Limousin)", "felix.blume")),
    dict(id="pig-oink", pack="animais", title="Porco guinchando", **esc("1-260640-B-2.wav", 260640, "Pig Squealing", "TheAcidRomance"), max=2.5),
    dict(id="sheep-baa", pack="animais", title="Balido de ovelha", **fs(362283), max=2.5),
    dict(id="hen-cluck", pack="animais", title="Cacarejo de galinha", **esc("4-232495-A-6.wav", 232495, "Polish hen cackling", "eksaa")),
    dict(id="crow", pack="animais", title="Corvo", **esc("4-188287-A-9.wav", 188287, "crow 1", "pepv"), max=2.5),
    dict(id="lion-roar", pack="animais", title="Rugido de leão", **fs(611721), max=2.5),
    dict(id="horse-neigh", pack="animais", title="Relincho de cavalo", src=("learn", "animals/clips/horse.mp3"), credit='"Wiehern.ogg" de Hü. (Wikimedia Commons)', license="Domínio público"),
    dict(id="donkey-bray", pack="animais", title="Burro zurrando", **fs(705300)),
    dict(id="goat", pack="animais", title="Cabra berrando", **fs(495688), max=2.5),
    dict(id="wolf-howl", pack="animais", title="Lobo uivando", **fs(399186), max=3.5),
    dict(id="whale", pack="animais", title="Canto de baleia", src=("learn", "animals/clips/whale.mp3"), credit='"Humpbackwhale2.ogg" de Spyrogumas (Wikimedia Commons)', license="CC0", max=3.5),
    # Vozes
    dict(id="evil-laugh", pack="vozes", title="Risada maligna", **esc("4-167571-A-26.wav", 167571, "evil-laugh", "dlovere")),
    dict(id="snore", pack="vozes", title="Ronco", **esc("3-151557-B-28.wav", 151557, "Snoring", "Erik Pritzens"), max=2.2),
    dict(id="baby-cry", pack="vozes", title="Bebê chorando", **esc("3-152007-A-20.wav", 152007, "babys crying", "winsx87"), max=2.4),
    dict(id="burp", pack="vozes", title="Arroto", **fs(323650)),
    dict(id="kid-laugh", pack="vozes", title="Risada de criança", **esc("4-164243-A-26.wav", 164243, "Young girl laughing uncontrollably", "caculo")),
    dict(id="cough", pack="vozes", title="Tosse", **esc("3-125418-A-24.wav", 125418, "Man Coughing", "jyoung20")),
    dict(id="clapping", pack="vozes", title="Palmas", **esc("3-130330-A-22.wav", 130330, "Polite Clapping with no Yelling", "dianadesim")),
    dict(id="yawn", pack="vozes", title="Bocejo", **fs(125419), max=3.5),
    dict(id="hiccup", pack="vozes", title="Soluço", **fs(776025), max=3.5),
    dict(id="gargle", pack="vozes", title="Gargarejo", **fs(784056), max=3.5),
    # Memes e zoeira (pack Vozes & zoeira)
    dict(id="sad-trombone", pack="vozes", title="Trombone triste", synth="sad_trombone", credit="Sintetizado (melodia tradicional)", license="CC0"),
    dict(id="record-scratch", pack="vozes", title="Scratch de DJ", src=("sonicpi", "etc/samples/vinyl_rewind.flac"), credit=fsd(162493, "vinyl rewind", "TasmanianPower") + ", via Sonic Pi", license="CC0"),
    dict(id="air-horn", pack="vozes", title="Buzina de torcida", synth="air_horn", credit="Sintetizado", license="CC0"),
    dict(id="gas-truck", pack="vozes", title="Caminhão do gás", synth="gas_truck", credit="Sintetizado — Für Elise, de Beethoven (obra em domínio público)", license="CC0"),
    dict(id="old-phone", pack="vozes", title="Toque de celular antigo", synth="old_phone", credit="Sintetizado — Gran Vals, de Francisco Tárrega (obra em domínio público)", license="CC0"),
    dict(id="dun-dun-dun", pack="vozes", title="Dun dun duuun", synth="dun_dun_dun", credit="Sintetizado", license="CC0"),
    dict(id="fire-in-the-hole", pack="vozes", title="“Fire in the hole!”", parts=[((("lav", f"{MALE}/war_fire_in_the_hole.ogg")), 0.15, 2.0), (("lav", f"{RETRO_DIR}/Explosions/wav/Explosion7.wav"), 0, 1.8)], credit=f"{KENNEY} + explosão de {RETRO}", license="CC0", max=MAX_S),
    dict(id="drumroll", pack="vozes", title="Rufar de tambores", **fs(49306)),
    dict(id="boo", pack="vozes", title="Vaia", **fs(752707)),
    dict(id="dial-up", pack="vozes", title="Internet discada", **fs(658932), max=3.5),
    dict(id="happy-birthday", pack="vozes", title="Parabéns pra você", synth="happy_birthday", credit="Sintetizado — melodia de Happy Birthday (domínio público)", license="CC0"),
    # Máquinas e efeitos
    dict(id="car-horn", pack="maquinas", title="Buzina de carro", **esc("2-54086-A-43.wav", 54086, "horn", "guitarguy1985")),
    dict(id="siren", pack="maquinas", title="Sirene de polícia", **esc("2-70938-A-42.wav", 70938, "police2", "guitarguy1985")),
    dict(id="referee-whistle", pack="maquinas", title="Apito de juiz", src=("vcsl", "Aerophones/Edge-blown Aerophones/Ball Whistle/Main_BallWhistle_Long-001.wav"), credit="Ball Whistle — VCSL (Versilian Studios)", license="CC0"),
    dict(id="train-whistle", pack="maquinas", title="Apito de trem", src=("vcsl", "Aerophones/Edge-blown Aerophones/Train Whistle, Toy/Main_TrainLow_Double-001.wav"), credit="Train Whistle, Toy — VCSL (Versilian Studios)", license="CC0"),
    dict(id="boing", pack="maquinas", title="Boing", src=("vcsl", "Idiophones/Struck Idiophones/Flexatone/flexatone_fast.wav"), credit="Flexatone — VCSL (Versilian Studios)", license="CC0", max=2.2),
    dict(id="alarm-clock", pack="maquinas", title="Despertador", **esc("5-223176-A-37.wav", 223176, "Generic Alarm Clock", "Yoyodaman234")),
    dict(id="laser", pack="maquinas", title="Tiros de laser", synth="laser", credit="Sintetizado", license="CC0"),
    dict(id="vuvuzela", pack="maquinas", title="Vuvuzela", synth="vuvuzela", credit="Sintetizado", license="CC0"),
    dict(id="chainsaw", pack="maquinas", title="Motosserra", **esc("3-118972-B-41.wav", 118972, "Chainsaw", "esperri")),
    dict(id="church-bell", pack="maquinas", title="Sino de igreja", **esc("2-56926-A-46.wav", 56926, "sorana bells_sette_casa", "dADDoiT"), max=3.5),
    dict(id="fireworks", pack="maquinas", title="Fogos de artifício", **esc("2-117616-A-48.wav", 117616, "fireworks exploding 1", "soundmary"), max=3.5),
    dict(id="motorcycle", pack="maquinas", title="Moto acelerando", **fs(202809), max=3.5),
    dict(id="tire-screech", pack="maquinas", title="Pneu cantando", **lav(f"{RETRO_DIR}/Vehicles/wav/Skid2.wav", RETRO)),
    # Games e 8-bit (pack Efeitos & games)
    dict(id="ready-set-go", pack="maquinas", title="“Ready… set… go!”", parts=[(("lav", f"{MALE}/ready.ogg"), 0.4, 2.0), (("lav", f"{MALE}/set.ogg"), 0.4, 2.0), (("lav", f"{MALE}/go.ogg"), 0, 2.0)], credit=KENNEY, license="CC0", max=MAX_S),
    dict(id="round-fight", pack="maquinas", title="“Round 1… Fight!”", parts=[(("lav", f"{FIGHTER}/round_1.ogg"), 0.45, 2.0), (("lav", f"{FIGHTER}/fight.ogg"), 0, 2.0)], credit=KENNEY_FIGHTER, license="CC0", max=MAX_S),
    dict(id="countdown", pack="maquinas", title="“3, 2, 1… Go!”", parts=[(("lav", f"{MALE}/3.ogg"), 0.35, 2.0), (("lav", f"{MALE}/2.ogg"), 0.35, 2.0), (("lav", f"{MALE}/1.ogg"), 0.35, 2.0), (("lav", f"{MALE}/go.ogg"), 0, 2.0)], credit=KENNEY, license="CC0", max=MAX_S),
    dict(id="choose-character", pack="maquinas", title="“Player 1… Choose your character!”", parts=[(("lav", f"{FIGHTER}/player_1.ogg"), 0.35, 2.0), (("lav", f"{FIGHTER}/choose_your_character.ogg"), 0, 2.5)], credit=KENNEY_FIGHTER, license="CC0", max=MAX_S),
    dict(id="game-over", pack="maquinas", title="“You lose… Game over!”", parts=[(("lav", f"{FIGHTER}/you_lose.ogg"), 0.35, 2.0), (("lav", f"{FIGHTER}/game_over.ogg"), 0, 2.5)], credit=KENNEY_FIGHTER, license="CC0", max=MAX_S),
    dict(id="boss-laugh", pack="maquinas", title="Risada do chefão", **lav(f"{RETRO_DIR}/Vocal/wav/Laugh1.wav", RETRO)),
    dict(id="explosion", pack="maquinas", title="Explosão", **lav(f"{RETRO_DIR}/Explosions/wav/Explosion7.wav", RETRO)),
    dict(id="coins", pack="maquinas", title="Moedinhas e vida extra", synth="coins", credit="Sintetizado (8-bit)", license="CC0"),
    dict(id="power-up", pack="maquinas", title="Power-up", synth="power_up", credit="Sintetizado (8-bit)", license="CC0"),
    dict(id="level-complete", pack="maquinas", title="Fase completa", synth="level_complete", credit="Sintetizado (8-bit)", license="CC0"),
    dict(id="jumps", pack="maquinas", title="Pulo, pulo, pulo, pulo", synth="jumps", credit="Sintetizado (8-bit)", license="CC0"),
    # Casa e cotidiano (pack Efeitos & games)
    dict(id="door-knock", pack="maquinas", title="Batida na porta", **esc("2-134915-A-30.wav", 134915, "Knocking 2", "barrygusey")),
    dict(id="door-creak", pack="maquinas", title="Porta rangendo", **esc("1-51805-D-33.wav", 51805, "door hinge squeak creak o,c", "kyles"), max=3.5),
    dict(id="brushing-teeth", pack="maquinas", title="Escovando os dentes", **esc("1-68628-A-27.wav", 68628, "brushing teeth with noise in background", "bwav")),
    dict(id="kettle", pack="maquinas", title="Chaleira apitando", **fs(59572)),
    dict(id="microwave", pack="maquinas", title="Micro-ondas apitando", **fs(638160)),
    dict(id="doorbell", pack="maquinas", title="Campainha (dim-dom)", **fs(709948)),
    dict(id="zipper", pack="maquinas", title="Zíper", **fs(15417)),
    dict(id="blender", pack="maquinas", title="Liquidificador", **fs(781071)),
    dict(id="phone-vibrate", pack="maquinas", title="Celular vibrando", **fs(384487)),
    # Natureza e clima (pack Animais & natureza)
    dict(id="sea-waves", pack="animais", title="Ondas do mar", **esc("2-125966-A-11.wav", 125966, "Waves in sea", "Ryding"), max=3.5),
    dict(id="dripping", pack="animais", title="Goteira", **esc("2-124564-A-15.wav", 124564, "water-drip-rhythm", "alienistcog")),
    dict(id="thunder", pack="animais", title="Trovão", **fs(436790), max=3.5),
    dict(id="macaw", pack="animais", title="Arara gritando", **fs(504988), max=3.5),
    dict(id="owl", pack="animais", title="Coruja", **fs(465697), max=3.5),
    dict(id="cicada", pack="animais", title="Cigarra", **fs(562605)),
    dict(id="fly", pack="animais", title="Mosca zumbindo", **esc("5-195517-A-7.wav", 195517, "Foley Small Fly", "jamesrodavidson")),
]

# ---------------------------------------------------------------- fontes

def fetch(repo_key: str, path) -> Path:
    if repo_key == "freesound":
        dest = CACHE / "freesound" / f"{path}.mp3"
        url = f"https://cdn.freesound.org/previews/{FREESOUND[path][0]}-hq.mp3"
    else:
        repo, sha = REPOS[repo_key]
        dest = CACHE / repo_key / path
        url = f"https://raw.githubusercontent.com/{repo}/{sha}/{urllib.parse.quote(path)}"
    if not dest.exists():
        dest.parent.mkdir(parents=True, exist_ok=True)
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
    for d, gap in [(0.22, 0.07), (0.22, 0.07), (1.6, 0)]:
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
    for d in (0.3, 0.3, 0.26, 0.4):
        t = t_axis(d)
        f = 2300 * np.exp(-t * 10) + 170
        ph = 2 * np.pi * np.cumsum(f) / SR
        out += [(0.6 * np.sin(ph) + 0.4 * np.sign(np.sin(ph))) * np.exp(-t * 7) * np.clip(t / 0.003, 0, 1), np.zeros(int(0.22 * SR))]
    return np.concatenate(out)


def vuvuzela():
    t = t_axis(2.6)
    f = 233.1 * (1 + 0.006 * np.sin(2 * np.pi * 4.2 * t) + 0.004 * np.sin(2 * np.pi * 0.7 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    sig = sum(np.sin(k * ph) / k**0.6 for k in range(1, 24))
    return np.tanh(sig / 4) * gate(t, 0.08, 0.12)


def chip(f, t, d, duty=0.5):
    """Nota de videogame 8-bit: onda quadrada (pulso) com ataque e soltura curtos."""
    f = f * np.ones_like(t)
    if not f.any():  # pausa
        return np.zeros_like(t)
    square = np.where(np.cumsum(f) / SR % 1 < duty, 1.0, -1.0)
    return 0.5 * square * gate(t, 0.004, 0.03) * (t < d)


def note(name: str) -> float:
    """Frequência de uma nota como "C5", "F#4" (Lá 4 = 440 Hz)."""
    steps = {"C": -9, "D": -7, "E": -5, "F": -4, "G": -2, "A": 0, "B": 2}[name[0]] + name.count("#")
    return 440.0 * 2 ** ((steps + 12 * (int(name[-1]) - 4)) / 12)


def coins():
    """Três moedinhas (duas notas rápidas) e uma vida extra em arpejo — composição própria."""
    coin = [(note("A5"), 0.5), (note("E6"), 3)]
    extra = [(note(n), 1) for n in ("C6", "E6", "G6", "C7", "E7", "G7")] + [(note("C7"), 4)]
    rest = [(0.0, 2)]
    return melody(coin + rest + coin + rest + coin + rest * 2 + extra, 0.07, chip, overlap=0.0)


def power_up():
    """Arpejo que sobe duas vezes, cada vez mais agudo, e termina numa nota longa."""
    run = ["C5", "E5", "G5", "C6", "E6", "G6"]
    notes = [(note(n), 1) for n in run] + [(note(n[:-1] + str(int(n[-1]) + 1)), 1) for n in run[:4]] + [(note("E7"), 8)]
    return melody(notes, 0.12, lambda f, t, d: chip(f * (1 + 0.01 * np.sin(2 * np.pi * 9 * t)), t, d, 0.25))


def level_complete():
    """Fanfarra curta de fase completa — composição própria em Dó maior."""
    notes = [("G5", 1), ("C6", 1), ("E6", 1), ("G6", 3), ("E6", 1), ("G6", 1), ("A6", 1), ("B6", 1), ("C7", 8)]
    return melody([(note(n), d) for n, d in notes], 0.11, chip)


def jumps():
    """Quatro pulos de personagem 8-bit: varredura rápida de grave para agudo."""
    out = []
    for d in (0.28, 0.28, 0.28, 0.4):
        t = t_axis(d)
        f = 180 + 900 * (t / d) ** 0.7
        ph = np.cumsum(f) / SR
        out += [0.5 * np.where(ph % 1 < 0.5, 1.0, -1.0) * gate(t, 0.003, 0.05), np.zeros(int(0.42 * SR))]
    return np.concatenate(out)


def happy_birthday():
    """"Parabéns pra você" (melodia de Happy Birthday, domínio público): primeira frase, em sino suave."""
    notes = [("G4", 0.75), ("G4", 0.25), ("A4", 1), ("G4", 1), ("C5", 1), ("B4", 2)]

    def bell(f, t, _):
        ph = 2 * np.pi * f * t
        return (np.sin(ph) + 0.3 * np.sin(2 * ph) + 0.1 * np.sin(3 * ph)) * np.exp(-t / 0.6) * np.clip(t / 0.01, 0, 1)

    return melody([(note(n), d) for n, d in notes], 0.4, bell, overlap=0.3)


SYNTHS = {
    f.__name__: f
    for f in (sad_trombone, air_horn, gas_truck, old_phone, dun_dun_dun, laser, vuvuzela, coins, power_up, level_complete, jumps, happy_birthday)
}


# ---------------------------------------------------------------- build

def build(spec: dict) -> np.ndarray:
    if "synth" in spec:
        x = SYNTHS[spec["synth"]]()
    elif "parts" in spec:
        # Falas/sons emendados: cada parte recortada e com o mesmo volume, separadas por pausas.
        pieces = []
        for src, gap, max_s in spec["parts"]:
            pieces += [finish(auto_trim(decode(fetch(*src)), max_s)), np.zeros(int(gap * SR))]
        x = np.concatenate(pieces)
    else:
        x = decode(fetch(*spec["src"]))
        if "start" in spec or "end" in spec:
            x = x[int(spec.get("start", 0) * SR) : int(spec["end"] * SR) if "end" in spec else None]
    return finish(auto_trim(x, spec.get("max", 3.0)))


PERSONAL_IN = ROOT / "packs-pessoais"
PERSONAL_OUT = OUT / "pessoais"
AUDIO_EXT = {".mp3", ".wav", ".ogg", ".oga", ".m4a", ".aac", ".flac", ".opus", ".webm"}


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
                x = finish(auto_trim(decode(audio), MAX_S))
                name = slug(audio.stem)
                if len(x) / SR < MIN_S:
                    print(f"pessoal {pack_slug}/{name:24} {len(x) / SR:5.2f} s  FORA (menos de {secs(MIN_S)} s)")
                    continue
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
    manifest, credits, kept = {}, [], []
    for spec in SOUNDS:
        x = build(spec)
        seconds = len(x) / SR
        if not MIN_S <= seconds <= MAX_S:
            print(f"{spec['id']:18} {seconds:5.2f} s  FORA (fora de {secs(MIN_S)}–{secs(MAX_S)} s)")
            continue
        write_wav(OUT / f"{spec['id']}.wav", x)
        manifest[spec["id"]] = {"durationMs": round(seconds * 1000), "title": spec["title"], "pack": spec["pack"]}
        credits.append(f"| `{spec['id']}.wav` | {spec['credit']} | {spec['license']} |")
        kept.append(spec["id"])
        print(f"{spec['id']:18} {seconds:5.2f} s")
    for old in OUT.glob("*.wav"):
        if old.stem not in manifest:
            old.unlink()

    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    (OUT / "CREDITS.md").write_text(
        "# Créditos dos sons\n\n"
        "Gerado por `scripts/build-sounds.py`. Todos os arquivos são **CC0** ou **domínio público** — não exigem\n"
        "atribuição, mas registramos a origem por transparência. As gravações foram baixadas de commits fixos dos\n"
        "repositórios [ESC-50](https://github.com/karolpiczak/ESC-50) (só os clipes marcados como CC0 no LICENSE),\n"
        "[Sonic Pi](https://github.com/sonic-pi-net/sonic-pi/tree/dev/etc/samples),\n"
        "[VCSL](https://github.com/sgossner/VCSL), [learntoread](https://github.com/Courtside-live01/learntoread) e\n"
        "[CC0-Public-Domain-Sounds](https://github.com/lavenderdotpet/CC0-Public-Domain-Sounds) (Kenney, The Motion\n"
        "Monkey, Ben Burnes), além de prévias de sons CC0 do [Freesound](https://freesound.org).\n"
        f"Processamento: mono, recorte do evento principal ({secs(MIN_S)} a {secs(MAX_S)} s), volume normalizado e WAV\n"
        "16 bits/22,05 kHz.\n\n"
        "| Arquivo | Origem | Licença |\n|---|---|---|\n" + "\n".join(credits) + "\n"
    )
    lines = [f"  '{sid}': require('../../assets/sounds/{sid}.wav')," for sid in kept]
    (ROOT / "src" / "audio" / "soundFiles.ts").write_text(
        "// Gerado por scripts/build-sounds.py — não edite à mão.\n"
        "export const SOUND_FILES: Record<string, number> = {\n" + "\n".join(lines) + "\n};\n"
    )
    build_personal(include="--sem-pessoais" not in sys.argv)


if __name__ == "__main__":
    main()
