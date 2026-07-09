import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import { accent, accentGradient, inkSoft, softShadow, surface } from '@/lib/theme';

const SEGMENTS = 5; // one per pick, never more (§5.3)

interface Props {
  progress: number; // 0..1
  daypart: string; // "evening", "afternoon", …
}

export function BrewMeter({ progress, daypart }: Props) {
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
      <Animated.View style={[styles.segmentFill, fillStyle]}>
        <LinearGradient
          colors={accentGradient}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.segmentGradient}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: surface,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 13,
    ...softShadow,
  },
  gift: {
    fontSize: 28,
  },
  middle: {
    flex: 1,
    gap: 7,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: inkSoft,
    letterSpacing: 0.2,
  },
  segments: {
    flexDirection: 'row',
    gap: 6,
  },
  segment: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(75, 67, 86, 0.08)',
    overflow: 'hidden',
  },
  segmentFill: {
    flex: 1,
    borderRadius: 6,
    overflow: 'hidden',
  },
  segmentGradient: {
    flex: 1,
  },
  percent: {
    fontSize: 19,
    fontWeight: '800',
    color: accent,
    minWidth: 50,
    textAlign: 'right',
  },
});
