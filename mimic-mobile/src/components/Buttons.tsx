import { Text } from 'react-native';

import { glow, gradients, palette } from '../theme/tokens';
import { Gradient } from './Gradient';
import { Icon, IconName } from './Icon';
import { PressableScale } from './PressableScale';

interface ButtonProps {
  label: string;
  icon?: IconName;
  onPress: () => void;
  disabled?: boolean;
}

/** Botão principal: gradiente neon com brilho colorido. */
export function GradientButton({ label, icon, onPress, disabled }: ButtonProps) {
  const [from] = gradients.primary;
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      className={disabled ? 'opacity-40' : ''}
      style={{ borderRadius: 20, boxShadow: disabled ? undefined : glow(from, 28, 0.5, 10) }}>
      <Gradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="h-14 flex-row items-center justify-center gap-2.5 overflow-hidden rounded-[20px] px-6">
        <Text className="font-heading text-base text-mist-50">{label}</Text>
        {icon && <Icon name={icon} size={20} color={palette.mist[50]} />}
      </Gradient>
    </PressableScale>
  );
}
