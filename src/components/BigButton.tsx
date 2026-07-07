import { Pressable, StyleSheet, Text } from 'react-native';

import { accent, borders, canvas, ink } from '@/lib/theme';

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
        pressed && { transform: [{ scale: 0.97 }] },
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
