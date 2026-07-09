import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { accent, capsLabel, rule } from '@/lib/theme';

interface Props {
  round: number; // 0-based, completed picks
  totalRounds: number;
}

/** Editorial progress header: ROUND 2 OF 5 ······················ 40% */
export function BrewMeter({ round, totalRounds }: Props) {
  const progress = totalRounds > 0 ? round / totalRounds : 0;
  const percent = Math.round(progress * 100);
  const fill = useSharedValue(progress);

  useEffect(() => {
    fill.value = withTiming(progress, { duration: 350 });
  }, [progress, fill]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.min(1, Math.max(0, fill.value)) * 100}%`,
  }));

  return (
    <View accessibilityLabel={`Round ${Math.min(round + 1, totalRounds)} of ${totalRounds}, ${percent} percent brewed`}>
      <View style={styles.row}>
        <Text style={capsLabel}>
          Round {Math.min(round + 1, totalRounds)} of {totalRounds}
        </Text>
        <Text style={styles.percent}>{percent}%</Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, fillStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  percent: {
    ...capsLabel,
    color: accent,
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 2,
    backgroundColor: rule,
  },
  fill: {
    height: 2,
    backgroundColor: accent,
  },
});
