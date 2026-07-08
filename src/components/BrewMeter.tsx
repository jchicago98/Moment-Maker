import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import { accent, borders, canvas, ink } from '@/lib/theme';

const SEGMENTS = 5; // one per pick, never more (§5.3)

interface Props {
  progress: number; // 0..1
  daypart: string; // "evening", "afternoon", …
}

export function BrewMeter({ progress, daypart }: Props) {
  const fill = useSharedValue(progress);

  useEffect(() => {
    fill.value = withSpring(progress, { damping: 16, stiffness: 140 });
  }, [progress, fill]);

  const percent = Math.round(progress * 100);
  const filledCount = Math.round(progress * SEGMENTS);

  return (
    <View
      style={styles.wrap}
      accessibilityLabel={`Your ${daypart} is ${percent} percent brewed`}
    >
      <Text style={styles.gift}>🎁</Text>
      <View style={styles.middle}>
        <Text style={styles.label}>Your {daypart} is brewing…</Text>
        <View style={styles.segments}>
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <Segment key={i} filled={i < filledCount} />
          ))}
        </View>
      </View>
      <Text style={styles.percent}>{percent}%</Text>
    </View>
  );
}

function Segment({ filled }: { filled: boolean }) {
  const scale: SharedValue<number> = useSharedValue(filled ? 1 : 0);

  useEffect(() => {
    scale.value = withSpring(filled ? 1 : 0, { damping: 11, stiffness: 180 });
  }, [filled, scale]);

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: scale.value,
  }));

  return (
    <View style={styles.segment}>
      <Animated.View style={[styles.segmentFill, fillStyle]} />
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
  middle: {
    flex: 1,
    gap: 7,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: ink,
  },
  segments: {
    flexDirection: 'row',
    gap: 6,
  },
  segment: {
    flex: 1,
    height: 16,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: ink,
    backgroundColor: canvas,
    overflow: 'hidden',
    padding: 2,
  },
  segmentFill: {
    flex: 1,
    borderRadius: 3,
    backgroundColor: accent,
  },
  percent: {
    fontSize: 20,
    fontWeight: '900',
    color: ink,
    minWidth: 52,
    textAlign: 'right',
  },
});
