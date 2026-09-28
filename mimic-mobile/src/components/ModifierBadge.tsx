import { Text, View } from 'react-native';

import type { Modifier, ModifierId, ModifierKind } from '../game/modifiers';
import { glow, palette, withAlpha } from '../theme/tokens';
import { Gradient } from './Gradient';
import { Icon, IconName } from './Icon';

type Stops = readonly [string, string];

export const KIND_STYLE: Record<ModifierKind, { label: string; colors: Stops; accent: string }> = {
  bonus: { label: 'Bônus', colors: [palette.mint[400], palette.cyan[500]], accent: palette.mint[400] },
  sound: { label: 'Sabotagem de som', colors: [palette.pink[400], palette.violet[600]], accent: palette.pink[400] },
  rule: { label: 'Sabotagem de regra', colors: [palette.amber[400], palette.coral[400]], accent: palette.amber[400] },
  neutral: { label: 'Neutro', colors: [palette.night[500], palette.night[700]], accent: palette.mist[400] },
};

export const MODIFIER_ICON: Record<ModifierId, IconName> = {
  double: 'diamond',
  plus15: 'add-circle',
  echo: 'radio',
  distortion: 'pulse',
  fast: 'speedometer',
  telephone: 'call',
  noReplay: 'ban',
  shortTime: 'timer',
  nothing: 'cafe',
};

/** Selo compacto do efeito da roleta que vale no turno. */
export function ModifierBadge({ modifier }: { modifier: Modifier }) {
  const { accent } = KIND_STYLE[modifier.kind];
  return (
    <View
      className="flex-row items-center gap-1.5 rounded-full border px-3 py-1.5"
      style={{ borderColor: withAlpha(accent, 0.4), backgroundColor: withAlpha(accent, 0.12) }}
      accessibilityLabel={`Efeito da roleta: ${modifier.title}`}>
      <Icon name={MODIFIER_ICON[modifier.id]} size={13} color={accent} />
      <Text className="font-label text-xs" style={{ color: accent }}>
        {modifier.title}
      </Text>
    </View>
  );
}

/** Cartão do efeito: ícone em gradiente, tipo, nome e explicação. */
export function ModifierCard({ modifier, caption }: { modifier: Modifier; caption?: string }) {
  const style = KIND_STYLE[modifier.kind];
  return (
    <View
      className="flex-row items-center gap-4 rounded-3xl border p-4"
      style={{
        borderColor: withAlpha(style.accent, 0.3),
        backgroundColor: withAlpha(style.accent, 0.08),
        boxShadow: glow(style.accent, 32, 0.2, 6),
      }}>
      <Gradient
        colors={style.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="h-14 w-14 items-center justify-center overflow-hidden rounded-2xl">
        <Icon name={MODIFIER_ICON[modifier.id]} size={26} color={palette.mist[50]} />
      </Gradient>
      <View className="flex-1 gap-0.5">
        <Text className="font-label text-[11px] uppercase tracking-[2px]" style={{ color: style.accent }}>
          {caption ?? style.label}
        </Text>
        <Text className="font-heading text-lg text-mist-50">{modifier.title}</Text>
        <Text className="font-body text-sm text-mist-200">{modifier.description}</Text>
      </View>
    </View>
  );
}
