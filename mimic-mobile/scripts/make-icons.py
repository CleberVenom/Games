"""Gera os ícones do app (assets/images) a partir da marca: 5 barras de onda sonora sobre o
gradiente violeta → rosa, as mesmas do componente LogoMark.

Uso: pip install pillow && python3 scripts/make-icons.py
"""
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "assets" / "images"
VIOLET = (0x8B, 0x6B, 0xFF)  # palette.violet[500]
PINK = (0xF0, 0x47, 0x9D)  # palette.pink[500]
MIST = (0xF2, 0xF3, 0xFA, 255)  # palette.mist[50]
# Mesmas proporções do LogoMark (caixa de 80): largura 5, espaço 4, alturas abaixo.
BARS = [14, 26, 38, 24, 12]
SS = 4  # supersampling para bordas suaves


def gradient(size: int) -> Image.Image:
    """Gradiente diagonal (canto superior esquerdo → inferior direito)."""
    small = Image.new("RGBA", (256, 256))
    px = small.load()
    for y in range(256):
        for x in range(256):
            t = (x + y) / 510
            px[x, y] = tuple(round(a + (b - a) * t) for a, b in zip(VIOLET, PINK)) + (255,)
    return small.resize((size, size), Image.BICUBIC)


def draw_bars(img: Image.Image, scale: float, color=MIST) -> None:
    """Desenha as barras centralizadas; `scale` = pixels por unidade da caixa de 80."""
    d = ImageDraw.Draw(img)
    w, gap = 5 * scale, 4 * scale
    total = len(BARS) * w + (len(BARS) - 1) * gap
    x = (img.width - total) / 2
    for h in BARS:
        top = (img.height - h * scale) / 2
        d.rounded_rectangle([x, top, x + w, top + h * scale], radius=w / 2, fill=color)
        x += w + gap


def render(size: int, *, background: str, bar_scale: float, color=MIST) -> Image.Image:
    big = size * SS
    if background == "full":
        img = gradient(big)
    elif background == "rounded":
        img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
        mask = Image.new("L", (big, big), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, big - 1, big - 1], radius=big * 0.35, fill=255)
        img.paste(gradient(big), (0, 0), mask)
    else:
        img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    if bar_scale:
        draw_bars(img, bar_scale * big / 80, color)
    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    # iOS / ícone legado: gradiente até a borda (o sistema aplica a máscara).
    render(1024, background="full", bar_scale=1.0).save(OUT / "icon.png")
    # Android adaptativo: fundo em gradiente + barras dentro da zona segura (66%).
    render(1024, background="full", bar_scale=0).save(OUT / "android-icon-background.png")
    render(1024, background="none", bar_scale=0.82).save(OUT / "android-icon-foreground.png")
    render(1024, background="none", bar_scale=0.82).save(OUT / "android-icon-monochrome.png")
    # Splash e favicon: a marca com cantos arredondados, como na tela inicial.
    render(512, background="rounded", bar_scale=1.0).save(OUT / "splash-icon.png")
    render(48, background="rounded", bar_scale=1.0).save(OUT / "favicon.png")
    print(f"Ícones gerados em {OUT}")


if __name__ == "__main__":
    main()
