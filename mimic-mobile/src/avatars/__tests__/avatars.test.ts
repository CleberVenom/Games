import { AVATAR_IDS, MAX_PLAYERS, MAX_ROOM_PLAYERS, PLAYER_COLORS } from '../../game/types';
import { palette } from '../../theme/palette';
import { AVATAR_ART } from '../art';
import { AVATAR_LIST, AVATARS, avatarOf, freeAvatars, isAvatarId, randomFreeAvatar } from '../avatars';

/** Contraste WCAG entre duas cores #RRGGBB. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, b2] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b2;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('mascotes', () => {
  it('sobram pelo menos 5 mascotes quando a sala ou o celular estão cheios (o último a escolher ainda tem opção)', () => {
    expect(AVATAR_IDS.length - Math.max(MAX_ROOM_PLAYERS, MAX_PLAYERS)).toBeGreaterThanOrEqual(5);
  });

  it('todo mascote tem desenho SVG, nome e cor', () => {
    for (const info of AVATAR_LIST) {
      expect(AVATAR_ART[info.id]).toMatch(/^<svg [^>]*viewBox="-4 -6 108 112"/);
      expect(info.name.length).toBeGreaterThan(3);
      expect(info.tint).toMatch(/^#[0-9A-F]{6}$/i);
    }
    expect(new Set(AVATAR_LIST.map((a) => a.name)).size).toBe(AVATAR_IDS.length);
  });

  it('o nome do jogador na cor do mascote continua legível no cartão (≥ 4,5:1)', () => {
    for (const { id, tint } of AVATAR_LIST) {
      expect({ id, ratio: contrast(tint, palette.night[850]) >= 4.5 }).toEqual({ id, ratio: true });
    }
  });

  it('os 10 primeiros mascotes substituem as 10 cores antigas, uma a uma', () => {
    const colors = AVATAR_IDS.slice(0, 10).map((id) => AVATARS[id].color);
    expect(new Set(colors)).toEqual(new Set(PLAYER_COLORS));
    for (const color of PLAYER_COLORS) {
      const id = avatarOf({ color });
      expect(AVATAR_IDS.indexOf(id)).toBeLessThan(10);
      expect(AVATARS[id].color).toBe(color);
    }
  });

  it('o mascote escolhido vale; sem ele (sala antiga) vale o da cor; lixo cai no primeiro', () => {
    expect(avatarOf({ avatar: 'unicornio', color: 'cyan' })).toBe('unicornio');
    expect(avatarOf({ color: 'cyan' })).toBe('tubarao');
    expect(avatarOf({ avatar: 'nao-existe' })).toBe(AVATAR_IDS[0]);
    expect(isAvatarId('coruja')).toBe(true);
    expect(isAvatarId('violet')).toBe(false);
  });

  it('mascote ocupado sai da lista de livres; quem chega sem escolher ganha um livre', () => {
    expect(freeAvatars(['polvo', 'gato'])).toHaveLength(AVATAR_IDS.length - 2);
    expect(freeAvatars(['polvo', 'gato'])).not.toContain('polvo');
    expect(randomFreeAvatar(['polvo'], () => 0)).toBe('gato');
    expect(randomFreeAvatar(AVATAR_IDS.slice(0, -1), () => 0.99)).toBe(AVATAR_IDS[AVATAR_IDS.length - 1]);
    expect(randomFreeAvatar(AVATAR_IDS)).toBeNull();
  });
});
