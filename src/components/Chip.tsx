import { Pressable, StyleSheet, Text } from 'react-native';

import { ground, ink, line, surface } from '@/lib/theme';

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
      style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && { opacity: 0.75 }]}
    >
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: line,
    backgroundColor: surface,
    paddingHorizontal: 15,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  selected: {
    backgroundColor: ink, // cream fill, like the primary button
    borderColor: ink,
  },
  label: {
    fontSize: 13.5,
    fontWeight: '600',
    color: ink,
    letterSpacing: 0.2,
  },
  selectedLabel: {
    color: ground,
  },
});
