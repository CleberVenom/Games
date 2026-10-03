"""Gera os 15 mascotes do jogo (desenhos originais, sem licença de terceiros).

Cada personagem é um SVG de 100×100 com contorno escuro e cores chapadas; o anel e o fundo de cada jogador
vêm da cor do mascote (`avatarTints` em src/theme/palette.js). Rode `python3 scripts/make-avatars.py` depois
de mexer num desenho: ele reescreve src/avatars/art.ts (lido pelo app) e assets/avatars/*.svg (para ver/editar).
"""
import math
import pathlib
import re

INK = '#2B1330'
W = '#FFFFFF'
SW = 3.2  # espessura do contorno


def o(fill, extra='', sw=SW):
    return f'fill="{fill}" stroke="{INK}" stroke-width="{sw}" stroke-linejoin="round" stroke-linecap="round" {extra}'


def eye(cx, cy, r=7, px=0.0, py=0.0):
    return (f'<circle cx="{cx}" cy="{cy}" r="{r}" {o(W, sw=2.6)}/>'
            f'<circle cx="{cx + px}" cy="{cy + py}" r="{r * 0.5:.1f}" fill="{INK}"/>'
            f'<circle cx="{cx + px - r * 0.18:.1f}" cy="{cy + py - r * 0.2:.1f}" r="{r * 0.17:.1f}" fill="{W}"/>')


def dot_eye(cx, cy, r=4.6):
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{INK}"/><circle cx="{cx - r * 0.3:.1f}" cy="{cy - r * 0.3:.1f}" r="{r * 0.35:.1f}" fill="{W}"/>'


def blush(cx, cy, r=5):
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#FF7FA8" opacity="0.55"/>'


def polvo(c):
    body = '#FE8D7F'
    return f'''
<path d="M18 56 C18 24 36 10 50 10 C64 10 82 24 82 56 C82 62 80 66 82 74 C84 82 76 86 72 80 C70 77 68 74 66 78 C64 84 56 88 54 80 C53 76 50 74 48 80 C46 88 38 86 36 78 C34 74 32 77 30 80 C26 86 16 82 18 74 C20 66 18 62 18 56 Z" {o(body)}/>
<circle cx="34" cy="26" r="4" fill="#FFC1B8"/><circle cx="66" cy="70" r="3" fill="#E8604F"/><circle cx="30" cy="66" r="3" fill="#E8604F"/><circle cx="72" cy="40" r="3" fill="#E8604F"/>
{eye(38, 50, 8, 1, 1)}{eye(62, 50, 8, -1, 1)}
{blush(27, 62)}{blush(73, 62)}
<path d="M42 63 Q50 70 58 63" fill="none" stroke="{INK}" stroke-width="3.2" stroke-linecap="round"/>
<path d="M17 46 C14 2 86 2 83 46" fill="none" stroke="{INK}" stroke-width="5.5" stroke-linecap="round"/>
<rect x="8" y="38" width="14" height="26" rx="7" {o('#FFE65D')}/><rect x="78" y="38" width="14" height="26" rx="7" {o('#FFE65D')}/>
'''


def gato(c):
    body = '#FFBB77'
    whiskers = ''.join(f'<path d="M{x1} {y1} L{x2} {y2}" stroke="{INK}" stroke-width="2.2" stroke-linecap="round"/>' for x1, y1, x2, y2 in
                       [(8, 60, 26, 62), (8, 70, 26, 68), (92, 60, 74, 62), (92, 70, 74, 68)])
    return f'''
<path d="M17 46 L19 12 L43 27 Z" {o(body)}/><path d="M83 46 L81 12 L57 27 Z" {o(body)}/>
<path d="M23 36 L24 20 L35 28 Z" fill="#FF9DB5"/><path d="M77 36 L76 20 L65 28 Z" fill="#FF9DB5"/>
<ellipse cx="50" cy="56" rx="35" ry="31" {o(body)}/>
<path d="M44 28 L44 36 M50 26 L50 36 M56 28 L56 36" stroke="#F08A2E" stroke-width="3.4" stroke-linecap="round"/>
<path d="M27 48 Q34 40 41 48 M59 48 Q66 40 73 48" fill="none" stroke="{INK}" stroke-width="3.6" stroke-linecap="round"/>
{whiskers}
<path d="M45 56 L55 56 L50 62 Z" fill="#FF7FA8" stroke="{INK}" stroke-width="2" stroke-linejoin="round"/>
<ellipse cx="50" cy="73" rx="10" ry="11" fill="{INK}"/><ellipse cx="50" cy="79" rx="6" ry="5" fill="#FF7FA8"/>
{blush(26, 58)}{blush(74, 58)}
'''


def pintinho(c):
    body = '#FFE65D'
    return f'''
<path d="M40 28 Q36 14 44 10 Q46 20 48 27 Z" {o(body, sw=2.6)}/><path d="M52 27 Q56 12 64 12 Q60 22 58 30 Z" {o(body, sw=2.6)}/>
<circle cx="50" cy="58" r="33" {o(body)}/>
<path d="M18 62 C12 56 12 70 20 72 Z" {o('#F5C400', sw=2.6)}/><path d="M82 62 C88 56 88 70 80 72 Z" {o('#F5C400', sw=2.6)}/>
{dot_eye(37, 52, 5)}{dot_eye(63, 52, 5)}
{blush(28, 64, 6)}{blush(72, 64, 6)}
<path d="M42 60 L58 60 L50 73 Z" {o('#FF9A3C', sw=2.8)}/>
<path d="M30 36 L50 -2 L64 34 Z" {o('#FB69AC')}/>
<path d="M38 24 L55 28 M42 15 L58 21" stroke="{W}" stroke-width="3.4" stroke-linecap="round" opacity="0.9"/>
<circle cx="50" cy="-1" r="5" {o('#FFE65D', sw=2.6)}/>
'''


def sapo(c):
    body = '#BCD20A'
    return f'''
<ellipse cx="50" cy="62" rx="39" ry="28" {o(body)}/>
<circle cx="29" cy="38" r="14" {o(body)}/><circle cx="71" cy="38" r="14" {o(body)}/>
{eye(29, 38, 9.5, 1.5, 1.5)}{eye(71, 38, 9.5, -1.5, 1.5)}
<circle cx="44" cy="56" r="1.8" fill="{INK}"/><circle cx="56" cy="56" r="1.8" fill="{INK}"/>
<path d="M20 66 Q50 92 80 66" fill="none" stroke="{INK}" stroke-width="3.6" stroke-linecap="round"/>
{blush(26, 70, 6)}{blush(74, 70, 6)}
<path d="M38 26 L39 8 L45 16 L50 4 L55 16 L61 8 L62 26 Z" {o('#FFE65D')}/>
<circle cx="50" cy="19" r="2.6" fill="#FB69AC"/>
'''


def estegossauro(c):
    body = '#10FCBD'
    dark = '#00C896'
    plates = ''.join(f'<path d="{p}" {o("#FFBB77", sw=2.8)}/>' for p in [
        'M22 46 C20 36 24 28 30 24 C33 32 36 40 36 46 Z',
        'M35 42 C33 28 38 16 45 10 C49 20 51 32 50 42 Z',
        'M49 41 C48 26 54 14 62 10 C65 20 66 32 64 42 Z',
        'M63 43 C64 32 70 24 77 22 C77 30 75 38 72 46 Z'])
    return f'''
<path d="M26 52 C18 56 10 52 3 40 C12 40 14 38 22 38 Z" {o(body)}/>
<path d="M2 40 L1 28 L10 36 Z M10 38 L12 26 L18 38 Z" {o('#FFBB77', sw=2.4)}/>
<rect x="38" y="68" width="12" height="16" rx="6" {o(dark)}/><rect x="52" y="68" width="12" height="16" rx="6" {o(dark)}/>
{plates}
<ellipse cx="48" cy="56" rx="31" ry="21" {o(body)}/>
<ellipse cx="48" cy="66" rx="20" ry="8" fill="#9BFFE3" opacity="0.7"/>
<rect x="27" y="68" width="13" height="18" rx="6" {o(body)}/><rect x="60" y="68" width="13" height="18" rx="6" {o(body)}/>
<path d="M68 48 C74 44 88 44 96 52 C99 58 96 66 88 68 C80 70 72 68 68 64 Z" {o(body)}/><circle cx="94" cy="58" r="1.4" fill="{INK}"/>
<circle cx="40" cy="52" r="3" fill="{dark}"/><circle cx="52" cy="46" r="2.6" fill="{dark}"/><circle cx="58" cy="58" r="3" fill="{dark}"/><circle cx="34" cy="60" r="2.4" fill="{dark}"/>
<path d="M66 54 L72 52" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>
<rect x="71" y="46" width="21" height="14" rx="6" fill="{INK}"/><path d="M75 49.5 L81 49.5 M75 53 L78 53" stroke="{W}" stroke-width="2.2" stroke-linecap="round"/>
<path d="M78 66 Q86 72 93 65" fill="none" stroke="{INK}" stroke-width="3.2" stroke-linecap="round"/>
<circle cx="72" cy="66" r="3.4" fill="#FF7FA8" opacity="0.6"/>
'''


def tubarao(c):
    body = '#52DFEA'
    teeth = ''.join(f'<path d="M{x} 61 L{x + 5} 61 L{x + 2.5} 69 Z" fill="{W}" stroke="{INK}" stroke-width="1.4" stroke-linejoin="round"/>' for x in range(30, 66, 7))
    return f'''
<path d="M58 40 L80 4 L84 50 Z" {o('#2FB9C6')}/>
<path d="M4 70 L22 60 L24 76 Z" {o('#2FB9C6', sw=2.8)}/><path d="M96 70 L78 60 L76 76 Z" {o('#2FB9C6', sw=2.8)}/>
<ellipse cx="50" cy="62" rx="38" ry="30" {o(body)}/>
<path d="M22 60 Q50 92 78 60 Z" fill="{INK}" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>
{teeth}
<path d="M42 79 Q50 75 58 79 Q50 87 42 79Z" fill="#FF7FA8"/>
{dot_eye(34, 52, 5)}{dot_eye(66, 52, 5)}
{blush(24, 62, 5)}{blush(76, 62, 5)}
<path d="M24 42 Q24 14 48 13 Q70 14 70 42 Z" {o('#FFE65D')}/>
<path d="M12 41 Q6 46 14 49 L48 48 L48 41 Z" {o('#F5C400', sw=2.8)}/>
<circle cx="47" cy="14" r="3.2" {o('#F5C400', sw=2)}/>
<path d="M34 34 Q36 24 44 22" fill="none" stroke="{W}" stroke-width="3" stroke-linecap="round" opacity="0.7"/>
'''


def robo(c):
    body = '#8FB8FE'
    mouth = ''.join(f'<path d="M{x} 62 V68" stroke="{INK}" stroke-width="2" />' for x in (42, 50, 58))
    return f'''
<path d="M50 20 V8" stroke="{INK}" stroke-width="3.4" stroke-linecap="round"/><circle cx="50" cy="7" r="5.5" {o('#FE8D7F', sw=2.8)}/>
<rect x="8" y="36" width="12" height="24" rx="5" {o('#5B8DE8')}/><rect x="80" y="36" width="12" height="24" rx="5" {o('#5B8DE8')}/>
<rect x="16" y="20" width="68" height="54" rx="15" {o(body)}/>
<rect x="24" y="30" width="52" height="26" rx="11" fill="{INK}"/>
<circle cx="38" cy="43" r="6.5" fill="#52DFEA"/><circle cx="62" cy="43" r="6.5" fill="#52DFEA"/>
<circle cx="36" cy="41" r="2" fill="{W}"/><circle cx="60" cy="41" r="2" fill="{W}"/>
<rect x="36" y="60" width="28" height="9" rx="4" {o(W, sw=2.4)}/>{mouth}
<path d="M50 84 L30 76 L30 94 Z" {o('#FB69AC', sw=2.8)}/><path d="M50 84 L70 76 L70 94 Z" {o('#FB69AC', sw=2.8)}/><circle cx="50" cy="85" r="5" {o('#FFE65D', sw=2.6)}/>
<circle cx="22" cy="30" r="2" fill="{W}" opacity="0.8"/>
'''


def fantasma(c):
    body = '#D4D0FF'
    return f'''
<path d="M17 88 V46 C17 22 32 8 50 8 C68 8 83 22 83 46 V88 L72 80 L61 90 L50 80 L39 90 L28 80 Z" {o(body)}/>
<ellipse cx="12" cy="56" rx="8" ry="5" transform="rotate(-25 12 56)" {o(body, sw=2.6)}/><ellipse cx="88" cy="56" rx="8" ry="5" transform="rotate(25 88 56)" {o(body, sw=2.6)}/>
<ellipse cx="38" cy="42" rx="6" ry="8.5" fill="{INK}"/><ellipse cx="62" cy="42" rx="6" ry="8.5" fill="{INK}"/>
<circle cx="36" cy="38.5" r="2.2" fill="{W}"/><circle cx="60" cy="38.5" r="2.2" fill="{W}"/>
{blush(27, 56, 6)}{blush(73, 56, 6)}
<path d="M38 57 Q50 68 62 57" fill="none" stroke="{INK}" stroke-width="3.4" stroke-linecap="round"/>
<path d="M45 62 V73 Q50 79 55 73 V64" {o('#FF7FA8', sw=2.6)}/>
<path d="M50 63 V71" stroke="#E0457F" stroke-width="1.6" stroke-linecap="round"/>
'''


def monstro(c):
    body = '#CB6ADE'
    pts = []
    n = 22
    for i in range(n * 2):
        a = math.radians(i * 180 / n - 90)
        r = 40 if i % 2 == 0 else 34
        pts.append(f'{50 + r * math.cos(a):.1f} {58 + r * 0.95 * math.sin(a):.1f}')
    fur = 'M' + ' L'.join(pts) + ' Z'
    return f'''
<path d="M32 28 L28 8 L44 22 Z" {o(W, sw=2.8)}/><path d="M68 28 L72 8 L56 22 Z" {o(W, sw=2.8)}/>
<path d="{fur}" {o(body)}/>
<circle cx="50" cy="48" r="16" {o(W)}/><circle cx="52" cy="50" r="9" fill="#10FCBD"/><circle cx="53" cy="51" r="5" fill="{INK}"/><circle cx="50" cy="47" r="2.6" fill="{W}"/>
<path d="M30 72 Q50 92 70 72 Z" fill="{INK}" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>
<path d="M38 74 L42 81 L46 76 Z M54 76 L58 81 L62 74 Z" fill="{W}" stroke="{INK}" stroke-width="1.2" stroke-linejoin="round"/>
<path d="M16 54 Q22 50 24 56 M76 56 Q78 50 84 54" fill="none" stroke="#A94BC0" stroke-width="3" stroke-linecap="round"/>
'''


def disfarce(c):
    return f'''
<path d="M14 24 Q30 12 44 22" fill="none" stroke="{INK}" stroke-width="7" stroke-linecap="round"/><path d="M86 24 Q70 12 56 22" fill="none" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>
<circle cx="30" cy="42" r="15" {o(W, sw=4.4)}/><circle cx="70" cy="42" r="15" {o(W, sw=4.4)}/>
<path d="M44 40 Q50 34 56 40" fill="none" stroke="{INK}" stroke-width="4.4" stroke-linecap="round"/>
<circle cx="32" cy="44" r="6" fill="{INK}"/><circle cx="68" cy="44" r="6" fill="{INK}"/>
<circle cx="30" cy="41" r="2.2" fill="{W}"/><circle cx="66" cy="41" r="2.2" fill="{W}"/>
<path d="M15 42 L4 40 M85 42 L96 40" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>
<ellipse cx="50" cy="62" rx="12" ry="13" {o('#FB69AC')}/><ellipse cx="46" cy="57" rx="3.4" ry="4.4" fill="#FFC1D8" opacity="0.9"/>
<path d="M50 72 C44 65 31 67 22 76 C20 84 28 85 35 82 C41 80 46 82 50 80 C54 82 59 80 65 82 C72 85 80 84 78 76 C69 67 56 65 50 72 Z" {o(INK, sw=2.4)}/>
<path d="M30 76 Q36 73 42 76 M58 76 Q64 73 70 76" fill="none" stroke="#6B3A78" stroke-width="2" stroke-linecap="round"/>
'''


def abacaxi(c):
    body = '#FFD24A'
    hatch = ''.join(f'<path d="M{x} {y} l5 5 l5 -5" fill="none" stroke="#E8A317" stroke-width="2.4" stroke-linecap="round"/>'
                    for x, y in [(32, 40), (46, 40), (60, 40), (25, 56), (39, 56), (53, 56), (67, 56), (32, 72), (46, 72), (60, 72)])
    return f"""
<path d="M50 40 C40 34 24 30 16 14 C32 14 44 24 50 34 Z" {o('#2CB86B', sw=2.6)}/>
<path d="M50 40 C60 34 76 30 84 14 C68 14 56 24 50 34 Z" {o('#2CB86B', sw=2.6)}/>
<path d="M50 42 C40 30 38 12 50 -3 C62 12 60 30 50 42 Z" {o('#3DDC84', sw=2.8)}/>
<path d="M50 34 L50 6" stroke="#2CB86B" stroke-width="2.4" stroke-linecap="round"/>
<ellipse cx="50" cy="62" rx="29" ry="33" {o(body)}/>
{hatch}
<path d="M24 52 Q26 46 34 48 L66 48 Q74 46 76 52 L76 60 Q74 68 66 66 L56 64 Q50 60 44 64 L34 66 Q26 68 24 60 Z" fill="{INK}"/>
<path d="M30 52 L38 52 M62 52 L70 52" stroke="{W}" stroke-width="2.6" stroke-linecap="round"/>
<path d="M26 50 L18 46 M74 50 L82 46" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>
<path d="M38 76 Q50 86 62 76" fill="none" stroke="{INK}" stroke-width="3.4" stroke-linecap="round"/>
{blush(31, 74, 5)}{blush(69, 74, 5)}
"""


def alien(c):
    body = '#8CE36B'
    return f"""
<path d="M38 18 L30 0 M62 18 L70 0" stroke="{INK}" stroke-width="3.4" stroke-linecap="round"/>
<circle cx="30" cy="0" r="5.5" {o('#FB69AC', sw=2.8)}/><circle cx="70" cy="0" r="5.5" {o('#FB69AC', sw=2.8)}/>
<path d="M50 12 C80 12 94 36 88 58 C84 76 68 90 50 90 C32 90 16 76 12 58 C6 36 20 12 50 12 Z" {o(body)}/>
<ellipse cx="33" cy="48" rx="13" ry="18" transform="rotate(24 33 48)" fill="{INK}"/><ellipse cx="67" cy="48" rx="13" ry="18" transform="rotate(-24 67 48)" fill="{INK}"/>
<ellipse cx="29" cy="42" rx="3.4" ry="5" transform="rotate(24 29 42)" fill="{W}"/><ellipse cx="63" cy="42" rx="3.4" ry="5" transform="rotate(-24 63 42)" fill="{W}"/>
<circle cx="46" cy="66" r="1.6" fill="{INK}"/><circle cx="54" cy="66" r="1.6" fill="{INK}"/>
<path d="M40 74 Q50 82 60 74" fill="none" stroke="{INK}" stroke-width="3.4" stroke-linecap="round"/>
<path d="M22 28 Q26 22 32 24" fill="none" stroke="#C6F5B0" stroke-width="3" stroke-linecap="round"/>
"""


def caveira(c):
    bone = '#F3F0FA'
    teeth = ''.join(f'<path d="M{x} 70 V82" stroke="{INK}" stroke-width="2.4" stroke-linecap="round"/>' for x in (42, 50, 58))
    dots = ''.join(f'<circle cx="{x}" cy="{y}" r="2" fill="{W}"/>' for x, y in [(30, 28), (42, 20), (56, 20), (68, 28), (50, 28)])
    return f"""
<path d="M80 30 L96 24 L90 36 L98 44 L82 38 Z" {o('#E43A97', sw=2.6)}/>
<path d="M50 8 C74 8 84 26 82 44 C81 52 76 56 72 58 L72 68 Q72 84 60 84 L40 84 Q28 84 28 68 L28 58 C24 56 19 52 18 44 C16 26 26 8 50 8 Z" {o(bone)}/>
<circle cx="37" cy="48" r="10" fill="{INK}"/><circle cx="34" cy="44" r="2.6" fill="{W}"/>
<path d="M50 56 L45 66 L55 66 Z" fill="{INK}" stroke="{INK}" stroke-width="2" stroke-linejoin="round"/>
<path d="M62 40 L22 26" stroke="{INK}" stroke-width="3.4" stroke-linecap="round"/>
<ellipse cx="63" cy="48" rx="11" ry="10" {o('#2B1330', sw=2.4)}/>
{teeth}<path d="M36 70 H64" stroke="{INK}" stroke-width="2.4" stroke-linecap="round"/>
<path d="M17 36 Q50 -6 83 36 L83 44 Q50 10 17 44 Z" {o('#E43A97')}/>
{dots}
"""


def coruja(c):
    body = '#D9AE82'
    belly = ''.join(f'<path d="M{x} {y} q4 5 8 0" fill="none" stroke="#C99B6A" stroke-width="2.4" stroke-linecap="round"/>' for x, y in [(36, 70), (46, 74), (56, 70), (41, 82), (51, 82)])
    return f"""
<path d="M20 40 L18 8 L42 24 Z" {o(body)}/><path d="M80 40 L82 8 L58 24 Z" {o(body)}/>
<ellipse cx="14" cy="64" rx="9" ry="19" transform="rotate(8 14 64)" {o('#B98A5C')}/><ellipse cx="86" cy="64" rx="9" ry="19" transform="rotate(-8 86 64)" {o('#B98A5C')}/>
<ellipse cx="50" cy="56" rx="35" ry="35" {o(body)}/>
<ellipse cx="50" cy="74" rx="21" ry="16" fill="#F6E4C8"/>{belly}
<circle cx="34" cy="46" r="16" {o(W, sw=4.6)}/><circle cx="66" cy="46" r="16" {o(W, sw=4.6)}/>
<path d="M49 44 H51" stroke="{INK}" stroke-width="4.6" stroke-linecap="round"/>
<rect x="43" y="40" width="14" height="7" rx="2" fill="{W}" stroke="{INK}" stroke-width="2"/>
<circle cx="35" cy="48" r="7" fill="{INK}"/><circle cx="67" cy="48" r="7" fill="{INK}"/>
<circle cx="32.5" cy="45" r="2.4" fill="{W}"/><circle cx="64.5" cy="45" r="2.4" fill="{W}"/>
<path d="M44 60 L56 60 L50 70 Z" {o('#FF9A3C', sw=2.8)}/>
<path d="M18 46 L8 40 M82 46 L92 40" stroke="{INK}" stroke-width="3.6" stroke-linecap="round"/>
"""


def unicornio(c):
    body = '#FFF1F7'
    mane = ''.join(f'<path d="{p}" {o(col, sw=2.6)}/>' for p, col in [
        ('M22 38 C8 36 6 52 14 60 C16 52 20 46 26 44 Z', '#FB69AC'),
        ('M18 56 C6 58 6 74 16 80 C16 72 20 66 26 62 Z', '#FFBB77'),
        ('M78 38 C92 36 94 52 86 60 C84 52 80 46 74 44 Z', '#52DFEA'),
        ('M82 56 C94 58 94 74 84 80 C84 72 80 66 74 62 Z', '#CB6ADE'),
    ])
    stars = ''.join(f'<path d="M{x} {y - 5} L{x + 1.6} {y - 1.6} L{x + 5} {y} L{x + 1.6} {y + 1.6} L{x} {y + 5} L{x - 1.6} {y + 1.6} L{x - 5} {y} L{x - 1.6} {y - 1.6} Z" fill="#FFE65D" stroke="{INK}" stroke-width="1.4" stroke-linejoin="round"/>' for x, y in [(12, 20), (90, 14), (92, 88)])
    return f"""
{stars}
{mane}
<path d="M28 44 L26 22 L42 34 Z" {o(body)}/><path d="M72 44 L74 22 L58 34 Z" {o(body)}/>
<path d="M50 62 C76 62 80 40 70 30 L58 30 L50 4 L42 30 L30 30 C20 40 24 62 50 62 Z" fill="none"/>
<ellipse cx="50" cy="58" rx="28" ry="27" {o(body)}/>
<path d="M43 32 L50 2 L57 32 Z" {o('#FFE65D')}/><path d="M45 24 L55 20 M46 14 L54 10" stroke="{INK}" stroke-width="2.4" stroke-linecap="round"/>
<path d="M33 52 Q38 45 43 52 M57 52 Q62 45 67 52" fill="none" stroke="{INK}" stroke-width="3.6" stroke-linecap="round"/>
<path d="M36 50 L33 46 M64 50 L67 46" stroke="{INK}" stroke-width="2.4" stroke-linecap="round"/>
<ellipse cx="50" cy="74" rx="17" ry="12" {o('#FFD3E6', sw=2.8)}/>
<circle cx="44" cy="72" r="2" fill="{INK}"/><circle cx="56" cy="72" r="2" fill="{INK}"/>
<path d="M44 79 Q50 84 56 79" fill="none" stroke="{INK}" stroke-width="2.8" stroke-linecap="round"/>
{blush(30, 64, 5)}{blush(70, 64, 5)}
"""


# Ordem = ordem do carrossel. Os 10 primeiros eram os mascotes originais; os 5 últimos entraram para sobrar opção.
CHARACTERS = {
    'polvo': polvo, 'gato': gato, 'pintinho': pintinho, 'sapo': sapo, 'estegossauro': estegossauro,
    'tubarao': tubarao, 'robo': robo, 'fantasma': fantasma, 'monstro': monstro, 'disfarce': disfarce,
    'abacaxi': abacaxi, 'alien': alien, 'caveira': caveira, 'coruja': coruja, 'unicornio': unicornio,
}


def svg(key):
    body = re.sub(r'\s*\n\s*', '', CHARACTERS[key](key)).strip()
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -6 108 112">{body}</svg>'


if __name__ == '__main__':
    root = pathlib.Path(__file__).resolve().parent.parent
    (root / 'assets' / 'avatars').mkdir(parents=True, exist_ok=True)
    art = []
    for key in CHARACTERS:
        (root / 'assets' / 'avatars' / f'{key}.svg').write_text(svg(key) + '\n')
        art.append(f"  {key}: '{svg(key)}',")
    (root / 'src' / 'avatars' / 'art.ts').write_text(
        '// Gerado por scripts/make-avatars.py — não edite à mão.\n'
        "import type { AvatarId } from '../game/types';\n\n"
        '/** Desenho de cada mascote (SVG, viewBox -4 -6 108 112). */\n'
        'export const AVATAR_ART: Record<AvatarId, string> = {\n' + '\n'.join(art) + '\n};\n'
    )
    print('ok', len(CHARACTERS))
