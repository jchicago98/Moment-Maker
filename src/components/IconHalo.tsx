import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text } from 'react-native';

import { haloGradient } from '@/lib/theme';

const SIZES = {
  s: { circle: 52, font: 26 },
  m: { circle: 84, font: 42 },
  l: { circle: 128, font: 64 },
} as const;

interface Props {
  emoji: string;
  size?: keyof typeof SIZES;
}

/** An emoji on a soft circular gradient — the bird-thumbnail treatment. */
export function IconHalo({ emoji, size = 'm' }: Props) {
  const { circle, font } = SIZES[size];
  return (
    <LinearGradient
      colors={haloGradient}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={[styles.halo, { width: circle, height: circle, borderRadius: circle / 2 }]}
    >
      <Text style={{ fontSize: font, lineHeight: font * 1.25 }}>{emoji}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  halo: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
