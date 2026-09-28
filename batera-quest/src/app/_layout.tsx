import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useProfileHydrated } from '../store/profile';
import { lockPortrait } from '../ui/orientation';
import { colors } from '../ui/theme';

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.surface, primary: colors.accent, text: colors.text, border: colors.border },
};

export default function RootLayout() {
  const hydrated = useProfileHydrated();

  useEffect(() => {
    lockPortrait();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider value={theme}>
        <StatusBar style="light" />
        {hydrated ? (
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
            <Stack.Screen name="play" options={{ gestureEnabled: false, animation: 'fade' }} />
            <Stack.Screen name="results" options={{ gestureEnabled: false, animation: 'fade' }} />
          </Stack>
        ) : (
          <View style={{ flex: 1, backgroundColor: colors.bg }} />
        )}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
