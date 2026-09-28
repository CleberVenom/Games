import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const enabled = Platform.OS !== 'web';

export function hapticTap() {
  if (enabled) void Haptics.selectionAsync();
}

export function hapticImpact() {
  if (enabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

export function hapticResult(good: boolean) {
  if (enabled) {
    void Haptics.notificationAsync(
      good ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
    );
  }
}
