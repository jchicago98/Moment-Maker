// Haptics mirror sound (CLAUDE.md §4): light on pickup, medium on throw,
// success on reveal. Intensity scales with throw velocity where the platform
// allows (expo-haptics exposes discrete styles, so we step Light→Medium→Heavy).

import * as ExpoHaptics from 'expo-haptics';

import { useSettings } from '@/lib/store/settings';

function enabled(): boolean {
  return useSettings.getState().hapticsOn;
}

export function hapticPickup(): void {
  if (!enabled()) return;
  ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light);
}

/** intensity 0..1 (normalized throw velocity). */
export function hapticThrow(intensity = 0.5): void {
  if (!enabled()) return;
  const style =
    intensity > 0.75
      ? ExpoHaptics.ImpactFeedbackStyle.Heavy
      : ExpoHaptics.ImpactFeedbackStyle.Medium;
  ExpoHaptics.impactAsync(style);
}

export function hapticReveal(): void {
  if (!enabled()) return;
  ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Success);
}
