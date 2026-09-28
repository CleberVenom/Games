import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from './theme';

export function Screen({ children, scroll = true, padded = true }: { children: ReactNode; scroll?: boolean; padded?: boolean }) {
  const content = <View style={[padded && styles.padded]}>{children}</View>;
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      {scroll ? <ScrollView contentContainerStyle={styles.scrollContent}>{content}</ScrollView> : <View style={{ flex: 1 }}>{children}</View>}
    </SafeAreaView>
  );
}

export function H1({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.h1, style]}>{children}</Text>;
}

export function H2({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.h2, style]}>{children}</Text>;
}

export function P({ children, style, muted }: { children: ReactNode; style?: StyleProp<TextStyle>; muted?: boolean }) {
  return <Text style={[styles.p, muted && { color: colors.muted }, style]}>{children}</Text>;
}

export function Card({ children, style, onPress, accent }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; accent?: string }) {
  const cardStyle = [styles.card, accent ? { borderColor: accent } : null, style];
  if (!onPress) return <View style={cardStyle}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [cardStyle, pressed && { opacity: 0.75 }]}>
      {children}
    </Pressable>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'ghost' && styles.buttonGhost,
        (pressed || disabled) && { opacity: disabled ? 0.4 : 0.8 },
        style,
      ]}
    >
      <Text style={[styles.buttonText, variant !== 'primary' && { color: colors.text }]}>{title}</Text>
    </Pressable>
  );
}

export function ProgressBar({ ratio, color = colors.accent, height = 8 }: { ratio: number; color?: string; height?: number }) {
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <View style={{ width: `${Math.max(0, Math.min(1, ratio)) * 100}%`, height, borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

export function Stars({ count, size = 16, total = 5 }: { count: number; size?: number; total?: number }) {
  return (
    <Text style={{ fontSize: size, letterSpacing: 1, color: colors.star }} accessibilityLabel={`${count} de ${total} estrelas`}>
      {Array.from({ length: total }, (_, i) => (i < count ? '★' : '☆')).join('')}
    </Text>
  );
}

export function Pill({ text, color = colors.surface2, textColor = colors.text }: { text: string; color?: string; textColor?: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: color }]}>
      <Text style={[styles.pillText, { color: textColor }]}>{text}</Text>
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: 32 },
  padded: { paddingHorizontal: 16, paddingTop: 12 },
  h1: { color: colors.text, fontSize: 26, fontWeight: '900', marginBottom: 8 },
  h2: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 6 },
  p: { color: colors.text, fontSize: 15, lineHeight: 22 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  button: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  buttonPrimary: { backgroundColor: colors.accent },
  buttonSecondary: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  buttonGhost: { backgroundColor: 'transparent' },
  buttonText: { color: '#1A0E00', fontSize: 16, fontWeight: '900', letterSpacing: 0.3 },
  track: { backgroundColor: colors.surface2, overflow: 'hidden', width: '100%' },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  pillText: { fontSize: 12, fontWeight: '800' },
});
