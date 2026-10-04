import { Text, View } from 'react-native';

import { MAX_ROUNDS, MIN_ROUNDS, roundsText } from '../game/match';
import { glow, palette, withAlpha } from '../theme/tokens';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';

const OPTIONS = Array.from({ length: MAX_ROUNDS - MIN_ROUNDS + 1 }, (_, i) => MIN_ROUNDS + i);

/** Escolha de 1 a 5 rodadas: tela inicial (partida no mesmo celular) e lobby da sala online (anfitrião). */
export function RoundsPicker({ value, onChange }: { value: number; onChange: (rounds: number) => void }) {
  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between px-1">
        <View className="flex-row items-center gap-2">
          <Icon name="repeat" size={18} color={palette.fuchsia[300]} />
          <Text className="font-heading text-lg text-mist-50">Rodadas</Text>
        </View>
        <Text className="font-label text-sm text-mist-400">{roundsText(value)}</Text>
      </View>
      <View accessibilityRole="radiogroup" className="flex-row gap-2">
        {OPTIONS.map((n) => {
          const on = n === value;
          return (
            <PressableScale
              key={n}
              onPress={() => onChange(n)}
              accessibilityRole="radio"
              aria-checked={on}
              accessibilityLabel={roundsText(n)}
              className="h-14 flex-1 items-center justify-center rounded-2xl border"
              style={{
                borderColor: on ? withAlpha(palette.fuchsia[400], 0.8) : 'rgba(255, 255, 255, 0.06)',
                backgroundColor: on ? withAlpha(palette.fuchsia[500], 0.2) : 'rgba(255, 255, 255, 0.04)',
                boxShadow: on ? glow(palette.fuchsia[500], 22, 0.3, 6) : undefined,
              }}>
              <Text className="font-display text-xl" style={{ color: on ? palette.fuchsia[300] : palette.mist[400] }}>
                {n}
              </Text>
            </PressableScale>
          );
        })}
      </View>
      <Text className="px-1 font-body text-xs text-mist-500">Cada jogador imita uma vez por rodada.</Text>
    </View>
  );
}
