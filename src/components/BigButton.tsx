import { Pressable, StyleSheet, Text } from 'react-native';

import { ground, ink, borders } from '@/lib/theme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
}

export function BigButton({ label, onPress, variant = 'primary' }: Props) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.primary : styles.ghost,
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={[styles.label, primary ? styles.primaryLabel : styles.ghostLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: borders.radius,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    minHeight: 54,
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: ink, // cream on the dark ground
  },
  ghost: {
    borderWidth: 1,
    borderColor: '#4A443A',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  primaryLabel: {
    color: ground,
  },
  ghostLabel: {
    color: ink,
  },
});
