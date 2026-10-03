"""Gera a identidade visual do Imitashow: o gato no microfone, num palco de stand-up com a plateia de mascotes.

Desenha a cena em SVG (reaproveitando os mascotes de scripts/make-avatars.py), em 3 camadas, e renderiza os PNGs:

  assets/icon/{full,background,foreground}.svg   fontes editáveis das camadas
  assets/images/icon.png                         iOS / ícone legado (1024, cena inteira, sem transparência)
  assets/images/android-icon-background.png      Android adaptativo: palco, cortinas, luzes e plateia
  assets/images/android-icon-foreground.png      Android adaptativo: gato + microfone (dentro da zona segura)
  assets/images/android-icon-monochrome.png      Android 13+ (ícone temático): silhueta do primeiro plano
  assets/images/splash-icon.png, favicon.png     abertura e web (cena com cantos arredondados)
  assets/images/logo.png                         marca da tela inicial (LogoMark)
  assets/images/play-store-icon.png              ícone de 512 px que o console da Google Play pede (não entra no app)

Uso:  pip install pillow && python3 scripts/make-icons.py
Precisa do Playwright com Chromium (npm i -g playwright) para rasterizar o SVG; o caminho do módulo pode ser dado
em PLAYWRIGHT_MODULE (padrão: /opt/node22/lib/node_modules/playwright).
O gato é o personagem "gato" de make-avatars.py: mexeu nele? Rode make-avatars.py antes.
"""
import importlib.util
import math
import os
import re
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
IMAGES = ROOT / "assets" / "images"
SOURCES = ROOT / "assets" / "icon"
PLAYWRIGHT = os.environ.get("PLAYWRIGHT_MODULE", "/opt/node22/lib/node_modules/playwright")

spec = importlib.util.spec_from_file_location("mk", ROOT / "scripts" / "make-avatars.py")
mk = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mk)

INK = mk.INK
PLUM_DARK = "#1B0626"


def mascot(key, cx, cy, size, rot=0):
    """Um mascote centrado em (cx, cy), com `size` px de lado."""
    body = re.sub(r"\s*\n\s*", "", mk.CHARACTERS[key](key)).strip()
    tr = f'transform="rotate({rot} {cx} {cy})"' if rot else ""
    return (f'<g {tr}><svg x="{cx - size / 2}" y="{cy - size / 2}" width="{size}" height="{size}" '
            f'viewBox="-4 -6 108 112" overflow="visible">{body}</svg></g>')


DEFS = """
<defs>
  <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1B0526"/><stop offset=".55" stop-color="#3A0F4C"/><stop offset="1" stop-color="#5A1D6B"/></linearGradient>
  <linearGradient id="curtain" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8E0A5C"/><stop offset=".5" stop-color="#E43A97"/><stop offset="1" stop-color="#A5106B"/></linearGradient>
  <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7B2D6B"/><stop offset="1" stop-color="#3A1050"/></linearGradient>
  <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF1B8" stop-opacity=".85"/><stop offset="1" stop-color="#FFE65D" stop-opacity=".05"/></linearGradient>
  <radialGradient id="pool" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFF1B8" stop-opacity=".75"/><stop offset="1" stop-color="#FFE65D" stop-opacity="0"/></radialGradient>
  <radialGradient id="steel" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".5" stop-color="#D9D2E6"/><stop offset="1" stop-color="#8F83A6"/></radialGradient>
</defs>"""

FLOOR_Y = 735


def curtains():
    folds = lambda xs, sign: "".join(  # noqa: E731
        f'<path d="M{x} 0 C{x - 18 * sign} 300 {x + 18 * sign} 600 {x} 1024" stroke="#5B0839" stroke-width="10" opacity=".45" fill="none"/>'
        for x in xs)
    left = f'<path d="M0 0 H190 C170 260 205 560 150 1024 H0 Z" fill="url(#curtain)"/>{folds((40, 95, 150), 1)}'
    right = f'<path d="M1024 0 H834 C854 260 819 560 874 1024 H1024 Z" fill="url(#curtain)"/>{folds((984, 929, 874), -1)}'
    valance = ('<path d="M0 0 H1024 V70 ' + "".join(f"Q{1024 - 64 - i * 128} 150 {1024 - 128 - i * 128} 70 " for i in range(8))
               + 'Z" fill="#C21E80" stroke="#5B0839" stroke-width="8"/>')
    return left + right + valance


def beams(targets):
    """Cones de luz de refletores no alto até os alvos: (x do refletor, x do alvo, y do alvo, largura)."""
    out = ""
    for sx, tx, ty, w in targets:
        out += (f'<polygon points="{sx - 22},40 {sx + 22},40 {tx + w / 2},{ty} {tx - w / 2},{ty}" fill="url(#beam)" opacity=".7"/>'
                f'<rect x="{sx - 34}" y="20" width="68" height="46" rx="14" fill="{INK}"/><ellipse cx="{sx}" cy="62" rx="22" ry="9" fill="#FFF1B8"/>')
    return out


def floor(y):
    boards = "".join(f'<path d="M{x} {y} L{512 + (x - 512) * 1.7} 1024" stroke="#2B0B3A" stroke-width="5" opacity=".5"/>'
                     for x in range(-100, 1200, 120))
    return f'<path d="M0 {y} H1024 V1024 H0 Z" fill="url(#floor)"/><path d="M0 {y} H1024" stroke="#FFB5D8" stroke-width="10" opacity=".8"/>{boards}'


def audience(y):
    """Plateia: os outros mascotes na frente do palco, escurecidos para o artista aparecer."""
    keys = ["estegossauro", "polvo", "unicornio", "robo", "alien", "coruja", "sapo"]
    out = ""
    for i, k in enumerate(keys):
        out += mascot(k, 40 + i * 150, y + (i % 2) * 34, 210 + (i % 3) * 14, rot=(-8, 6, -4, 9)[i % 4])
    return out + f'<rect x="0" y="{y - 115}" width="1024" height="{1024 - y + 115}" fill="{PLUM_DARK}" opacity=".42"/>'


def mic(bx, by, r, tilt):
    """Microfone de mão: cabeça prateada com grade e corpo cônico, inclinado para a boca do gato."""
    length = r * 3.7
    grille = "".join(
        f'<path d="M{-r} {k} H{r}" stroke="{INK}" stroke-opacity=".3" stroke-width="{r * .06}"/>'
        f'<path d="M{k} {-r} V{r}" stroke="{INK}" stroke-opacity=".3" stroke-width="{r * .06}"/>'
        for k in [i * r / 3.4 for i in range(-3, 4)])
    return (f'<g transform="translate({bx} {by}) rotate({tilt})">'
            f'<path d="M{-r * .62} {r * .55} L{-r * .4} {length} Q0 {length + r * .35} {r * .4} {length} L{r * .62} {r * .55} Z" '
            f'fill="url(#steel)" stroke="{INK}" stroke-width="{r * .1}" stroke-linejoin="round"/>'
            f'<path d="M{-r * .52} {r * 1.05} H{r * .52} V{r * 1.38} H{-r * .52} Z" fill="#FB69AC" stroke="{INK}" stroke-width="{r * .06}"/>'
            f'<path d="M{-r * .41} {length - r * .5} Q0 {length - r * .15} {r * .41} {length - r * .5} L{r * .4} {length} Q0 {length + r * .35} {-r * .4} {length} Z" fill="{INK}"/>'
            f'<circle r="{r}" fill="url(#steel)" stroke="{INK}" stroke-width="{r * .1}"/>'
            f'<clipPath id="mic-grille"><circle r="{r * .93}"/></clipPath><g clip-path="url(#mic-grille)">{grille}</g>'
            f'<ellipse cx="{-r * .38}" cy="{-r * .42}" rx="{r * .22}" ry="{r * .12}" transform="rotate(-35 {-r * .38} {-r * .42})" fill="#FFFFFF" opacity=".9"/></g>')


def cat_with_mic():
    """O gato cantor em pé no palco, segurando o microfone (corpo e patas desenhados aqui; a cabeça é o mascote)."""
    body, dark = "#FFBB77", "#F08A2E"
    o = f'stroke="{INK}" stroke-width="9" stroke-linejoin="round" stroke-linecap="round"'
    shadow = f'<ellipse cx="506" cy="{FLOOR_Y - 6}" rx="250" ry="26" fill="{PLUM_DARK}" opacity=".5"/>'
    feet = "".join(f'<ellipse cx="{x}" cy="{FLOOR_Y - 14}" rx="52" ry="28" fill="{dark}" {o}/>' for x in (440, 566))
    torso = f'<ellipse cx="503" cy="672" rx="128" ry="92" fill="{body}" {o}/><ellipse cx="503" cy="700" rx="70" ry="56" fill="#FFE2BE"/>'
    left_arm = f'<ellipse cx="395" cy="676" rx="30" ry="52" transform="rotate(14 395 676)" fill="{body}" {o}/>'
    head = mascot("gato", 503, 468, 470)
    mic_svg = mic(612, 596, 52, -28)
    # braço direito e pata fechada em volta do cabo do microfone
    arm = f'<path d="M585 706 C615 706 626 690 640 678" fill="none" stroke="{INK}" stroke-width="64" stroke-linecap="round"/><path d="M585 706 C615 706 626 690 640 678" fill="none" stroke="{body}" stroke-width="46" stroke-linecap="round"/>'
    paw = (f'<ellipse cx="652" cy="672" rx="38" ry="34" fill="{body}" {o}/>'
           f'<path d="M640 650 V664 M654 646 V662 M668 650 V664" stroke="{dark}" stroke-width="5" stroke-linecap="round"/>')
    # o conjunto fica centrado na zona segura do ícone adaptativo; só a sombra e os pés ficam no chão do palco
    return shadow + feet + f'<g transform="translate(6 -25)">{torso}{left_arm}{head}{mic_svg}{arm}{paw}</g>'


def layer(kind):
    stage = beams([(205, 480, FLOOR_Y, 360), (819, 520, FLOOR_Y, 360)]) + curtains() + floor(FLOOR_Y) + \
        f'<ellipse cx="500" cy="{FLOOR_Y}" rx="340" ry="40" fill="url(#pool)"/>' + audience(910)
    wall = '<rect width="1024" height="1024" fill="url(#wall)"/>'
    parts = {"full": wall + stage + cat_with_mic(), "background": wall + stage, "foreground": cat_with_mic()}[kind]
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">{DEFS}{parts}</svg>\n'


def rasterize(svgs: dict) -> dict:
    """Renderiza cada SVG (1024×1024) com o Chromium do Playwright; `transparent` mantém o fundo transparente."""
    tmp = Path(tempfile.mkdtemp())
    jobs = []
    for name, (svg, transparent) in svgs.items():
        (tmp / f"{name}.svg").write_text(svg)
        jobs.append({"name": name, "transparent": transparent})
    (tmp / "jobs.json").write_text(__import__("json").dumps(jobs))
    (tmp / "render.js").write_text(f"""
const {{ chromium }} = require({PLAYWRIGHT!r});
const fs = require('fs');
const dir = {str(tmp)!r};
(async () => {{
  const b = await chromium.launch();
  const p = await b.newPage({{ viewport: {{ width: 1024, height: 1024 }} }});
  for (const j of JSON.parse(fs.readFileSync(dir + '/jobs.json', 'utf8'))) {{
    const svg = fs.readFileSync(dir + '/' + j.name + '.svg', 'utf8');
    await p.setContent('<body style="margin:0;background:transparent">' + svg + '</body>');
    await p.screenshot({{ path: dir + '/' + j.name + '.png', omitBackground: j.transparent, clip: {{ x: 0, y: 0, width: 1024, height: 1024 }} }});
  }}
  await b.close();
}})();
""")
    subprocess.run(["node", str(tmp / "render.js")], check=True)
    return {name: Image.open(tmp / f"{name}.png").convert("RGBA") for name in svgs}


def rounded(img: Image.Image, size: int, radius: float = 0.22) -> Image.Image:
    """Cena com cantos arredondados (aberta, logo e favicon)."""
    out = img.resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size * 4 - 1, size * 4 - 1], radius=size * 4 * radius, fill=255)
    out.putalpha(mask.resize((size, size), Image.LANCZOS))
    return out


def main() -> None:
    IMAGES.mkdir(parents=True, exist_ok=True)
    SOURCES.mkdir(parents=True, exist_ok=True)
    svgs = {k: layer(k) for k in ("full", "background", "foreground")}
    for k, svg in svgs.items():
        (SOURCES / f"{k}.svg").write_text(svg)
    png = rasterize({"full": (svgs["full"], False), "background": (svgs["background"], False), "foreground": (svgs["foreground"], True)})

    png["full"].convert("RGB").save(IMAGES / "icon.png")  # iOS: sem transparência
    png["background"].convert("RGB").save(IMAGES / "android-icon-background.png")
    png["foreground"].save(IMAGES / "android-icon-foreground.png")
    # Ícone temático (Android 13+): o sistema pinta a silhueta com a cor do tema.
    # O contorno escuro vira vazado (transparente): olhos, boca e microfone continuam visíveis dentro da silhueta.
    light = png["foreground"].convert("L").point(lambda v: max(0, min(255, round((v - 45) * 255 / 70))))
    mono = Image.new("RGBA", light.size, (255, 255, 255, 255))
    mono.putalpha(ImageChops.darker(png["foreground"].getchannel("A"), light))
    mono.save(IMAGES / "android-icon-monochrome.png")
    rounded(png["full"], 512).save(IMAGES / "splash-icon.png")
    rounded(png["full"], 256).save(IMAGES / "favicon.png")
    # A marca da tela inicial é pequena: enquadra mais perto do gato (80% centrais da cena).
    rounded(png["full"].crop((102, 102, 922, 922)), 384).save(IMAGES / "logo.png")
    png["full"].resize((512, 512), Image.LANCZOS).convert("RGB").save(IMAGES / "play-store-icon.png")
    print("ok")


if __name__ == "__main__":
    main()
