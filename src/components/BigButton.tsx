import { Pressable, StyleSheet, Text } from 'react-native';
import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { accent, borders, canvas, ink } from '@/lib/theme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  /** Gentle idle "breathe" for hero buttons. Skipped under reduce-motion. */
  breathe?: boolean;
}

export function BigButton({ label, onPress, variant = 'primary', breathe = false }: Props) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const primary = variant === 'primary';

  useEffect(() => {
    if (breathe && !reduceMotion) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.025, { duration: 1300, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) })
        ),
        -1
      );
    } else {
      scale.value = 1;
    }
  }, [breathe, reduceMotion, scale]);

  const breatheStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={breatheStyle}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          primary ? styles.primary : styles.ghost,
          pressed && { transform: [{ scale: 0.97 }] },
        ]}
      >
        <Text style={[styles.label, primary ? styles.primaryLabel : styles.ghostLabel]}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: borders.width,
    borderRadius: borders.radius,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: accent,
    borderColor: ink,
    shadowColor: ink,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  ghost: {
    backgroundColor: canvas,
    borderColor: ink,
  },
  label: {
    fontSize: 18,
    fontWeight: '800',
  },
  primaryLabel: {
    color: canvas,
  },
  ghostLabel: {
    color: ink,
  },
});
