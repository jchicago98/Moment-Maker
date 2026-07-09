import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { accentGradient, ink, softShadow, surface } from '@/lib/theme';

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
          styles.wrap,
          primary ? styles.primaryShadow : styles.ghost,
          pressed && { transform: [{ scale: 0.97 }] },
        ]}
      >
        {primary ? (
          <LinearGradient
            colors={accentGradient}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.gradient}
          >
            <Text style={styles.primaryLabel}>{label}</Text>
          </LinearGradient>
        ) : (
          <Text style={styles.ghostLabel}>{label}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 999,
    minHeight: 56,
    justifyContent: 'center',
    overflow: 'visible',
  },
  primaryShadow: {
    ...softShadow,
    shadowColor: '#D4527E',
    shadowOpacity: 0.35,
  },
  gradient: {
    borderRadius: 999,
    paddingVertical: 17,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  ghost: {
    backgroundColor: surface,
    paddingVertical: 17,
    paddingHorizontal: 24,
    alignItems: 'center',
    ...softShadow,
    shadowOpacity: 0.08,
  },
  primaryLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  ghostLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: ink,
    letterSpacing: 0.3,
  },
});
