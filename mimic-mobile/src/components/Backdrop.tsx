import { StyleSheet, View } from 'react-native';

import { gradients, palette, withAlpha } from '../theme/tokens';
import { Gradient } from './Gradient';

/** Fundo azul-noturno com brilhos neon difusos, atrás do conteúdo da tela. */
export function Backdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Gradient
        colors={[palette.night[900], palette.night[950], palette.night[950]]}
        className="flex-1"
      />
      <Orb color={gradients.primary[0]} size={260} top={-110} left={-90} />
      <Orb color={gradients.listen[0]} size={220} top={60} right={-120} />
      <Orb color={gradients.primary[1]} size={240} bottom={-140} left={40} />
    </View>
  );
}

interface OrbProps {
  color: string;
  size: number;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
}

function Orb({ color, size, ...position }: OrbProps) {
  return (
    <View
      style={{
        position: 'absolute',
        ...position,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: withAlpha(color, 0.1),
        boxShadow: `0px 0px ${size * 0.6}px ${size * 0.25}px ${withAlpha(color, 0.12)}`,
      }}
    />
  );
}
