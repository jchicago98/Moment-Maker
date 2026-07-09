import { Pressable, StyleSheet, Text } from 'react-native';

import { accent, ink } from '@/lib/theme';

interface Props {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function Chip({ label, selected, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.selected,
        pressed && { transform: [{ scale: 0.96 }] },
      ]}
    >
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    minHeight: 44,
    justifyContent: 'center',
  },
  selected: {
    backgroundColor: accent,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: ink,
    letterSpacing: 0.2,
  },
  selectedLabel: {
    color: '#FFFFFF',
  },
});
