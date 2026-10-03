import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import type { Pack, PackSource } from '../game/packs';
import { glow, gradients, palette, withAlpha } from '../theme/tokens';
import { Gradient } from './Gradient';
import { Icon, IconName } from './Icon';
import { PressableScale } from './PressableScale';

const SOURCE_BADGE: Record<PackSource, { label: string; color: string }> = {
  official: { label: 'Oficial', color: palette.cyan[400] },
  personal: { label: 'Pessoal', color: palette.amber[400] },
  custom: { label: 'Meu pack', color: palette.tangerine[400] },
};

const GAP = 12;

interface Props {
  packs: Pack[];
  selected: ReadonlySet<string>;
  onToggle: (packId: string) => void;
  /** Mostra os botões de criar, baixar e editar packs (escondidos na sala online, que não sai da tela). */
  editable?: boolean;
}

/** Grade de packs de sons: toque para marcar/desmarcar; packs criados no app têm botão de editar. */
export function PackPicker({ packs, selected, onToggle, editable = true }: Props) {
  const [width, setWidth] = useState(0);
  const tile = width > 0 ? (width - GAP) / 2 : 0;

  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap" style={{ gap: GAP }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {tile > 0 &&
          packs.map((p) => (
            <PackTile
              key={p.id}
              pack={p}
              width={tile}
              on={selected.has(p.id)}
              onPress={() => onToggle(p.id)}
              editable={editable && p.source === 'custom'}
            />
          ))}
      </View>
      {editable && (
        <>
          <PressableScale
            onPress={() => router.push('/pack/new')}
            accessibilityRole="button"
            className="h-14 flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-tangerine-400/40 bg-tangerine-500/5">
            <Icon name="add" size={20} color={palette.tangerine[300]} />
            <Text className="font-label text-sm text-tangerine-300">Criar pack (gravar ou importar sons)</Text>
          </PressableScale>
          <PressableScale
            onPress={() => router.push('/pack/baixar')}
            accessibilityRole="button"
            className="h-14 flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-cyan-400/40 bg-cyan-500/5">
            <Icon name="cloud-download" size={20} color={palette.cyan[300]} />
            <Text className="font-label text-sm text-cyan-300">Baixar pack de amigo (código)</Text>
          </PressableScale>
        </>
      )}
    </View>
  );
}

interface TileProps {
  pack: Pack;
  width: number;
  on: boolean;
  onPress: () => void;
  editable: boolean;
}

function PackTile({ pack, width, on, onPress, editable }: TileProps) {
  const badge = SOURCE_BADGE[pack.source];
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="checkbox"
      aria-checked={on}
      accessibilityLabel={`${pack.title}, ${pack.sounds.length} sons`}
      pressedScale={0.96}
      className="gap-3 rounded-3xl border p-4"
      style={{
        width,
        borderColor: on ? withAlpha(palette.fuchsia[400], 0.7) : 'rgba(255, 255, 255, 0.06)',
        backgroundColor: on ? withAlpha(palette.fuchsia[500], 0.14) : 'rgba(255, 255, 255, 0.03)',
        boxShadow: on ? glow(palette.fuchsia[500], 24, 0.25, 4) : undefined,
      }}>
      <View className="flex-row items-start justify-between">
        <Gradient
          colors={on ? gradients.primary : [palette.night[600], palette.night[700]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="h-11 w-11 items-center justify-center overflow-hidden rounded-2xl">
          <Icon name={pack.icon as IconName} size={22} color={on ? palette.mist[50] : palette.mist[400]} />
        </Gradient>
        {editable ? (
          <PressableScale
            onPress={() => router.push({ pathname: '/pack/[id]', params: { id: pack.id } })}
            accessibilityRole="button"
            accessibilityLabel={`Editar ${pack.title}`}
            className="h-9 w-9 items-center justify-center rounded-xl bg-white/5">
            <Icon name="pencil" size={15} color={palette.mist[200]} />
          </PressableScale>
        ) : (
          <Icon
            name={on ? 'checkmark-circle' : 'ellipse-outline'}
            size={22}
            color={on ? palette.fuchsia[300] : palette.mist[500]}
          />
        )}
      </View>
      <View className="gap-1">
        <Text className="font-heading text-base leading-5 text-mist-50" numberOfLines={2}>
          {pack.title}
        </Text>
        <Text className="font-body text-xs leading-4 text-mist-400" numberOfLines={2}>
          {pack.sounds.length} {pack.sounds.length === 1 ? 'som' : 'sons'} · {pack.description}
        </Text>
      </View>
      <View className="flex-row items-center justify-between">
        <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: withAlpha(badge.color, 0.14) }}>
          <Text className="font-label text-[10px] uppercase tracking-[1px]" style={{ color: badge.color }}>
            {badge.label}
          </Text>
        </View>
        {editable && (
          <Icon
            name={on ? 'checkmark-circle' : 'ellipse-outline'}
            size={20}
            color={on ? palette.fuchsia[300] : palette.mist[500]}
          />
        )}
      </View>
    </PressableScale>
  );
}
