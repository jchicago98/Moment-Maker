import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { accent, borders, canvas, ink } from '@/lib/theme';

interface Props {
  progress: number; // 0..1
  daypart: string; // "evening", "afternoon", …
}

export function BrewMeter({ progress, daypart }: Props) {
  const fill = useSharedValue(progress);

  useEffect(() => {
    fill.value = withSpring(progress, { damping: 16, stiffness: 140 });
  }, [progress, fill]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.min(1, Math.max(0, fill.value)) * 100}%`,
  }));

  return (
    <View style={styles.wrap} accessibilityLabel={`Plan ${Math.round(progress * 100)} percent brewed`}>
      <Text style={styles.gift}>🎁</Text>
      <View style={styles.right}>
        <Text style={styles.label}>Your {daypart} is brewing…</Text>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, fillStyle]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: canvas,
    borderWidth: borders.width,
    borderColor: ink,
    borderRadius: borders.radius,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  gift: {
    fontSize: 30,
  },
  right: {
    flex: 1,
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: ink,
  },
  track: {
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: ink,
    overflow: 'hidden',
    backgroundColor: canvas,
  },
  fill: {
    height: '100%',
    backgroundColor: accent,
    borderRadius: 5,
  },
});
