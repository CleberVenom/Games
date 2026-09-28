import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import { ComponentProps } from 'react';
import { ColorValue } from 'react-native';

import { colors } from '../../ui/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const icon = (name: IconName) =>
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color} size={size} />;
  };

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Palco', tabBarIcon: icon('flame') }} />
      <Tabs.Screen name="lessons" options={{ title: 'Aulas', tabBarIcon: icon('school') }} />
      <Tabs.Screen name="songs" options={{ title: 'Músicas', tabBarIcon: icon('musical-notes') }} />
      <Tabs.Screen name="kits" options={{ title: 'Kits', tabBarIcon: icon('disc') }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: icon('person') }} />
    </Tabs>
  );
}
