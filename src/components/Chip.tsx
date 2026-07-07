import { Pressable, StyleSheet, Text } from 'react-native';

import { borders, candy, canvas, ink } from '@/lib/theme';

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
    borderWidth: borders.width,
    borderColor: ink,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: canvas,
    minHeight: 44,
    justifyContent: 'center',
  },
  selected: {
    backgroundColor: candy.teal.fill,
    borderColor: candy.teal.border,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: ink,
  },
  selectedLabel: {
    color: candy.teal.text,
  },
});
