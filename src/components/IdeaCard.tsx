import { Pressable, StyleSheet, Text, View } from 'react-native';

import { iconEmoji } from '@/lib/icons';
import { borders, type CandyColor } from '@/lib/theme';
import type { Idea } from '@/lib/types';

interface Props {
  idea: Idea;
  color: CandyColor;
  tilt: number; // degrees
  onPick: () => void;
}

function durationLabel(min: number): string {
  if (min < 60) return `${min} min`;
  if (min % 60 === 0) return `${min / 60} h`;
  return `${Math.floor(min / 60)}½ h`;
}

function costLabel(tier: number): string {
  return tier === 0 ? 'free' : '$'.repeat(tier);
}

export function IdeaCard({ idea, color, tilt, onPick }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Pick ${idea.title}`}
      onPress={onPick}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: color.fill,
          borderColor: color.border,
          transform: [{ rotate: `${tilt}deg` }, { scale: pressed ? 0.97 : 1 }],
        },
      ]}
    >
      <Text style={styles.icon}>{iconEmoji(idea.icon)}</Text>
      <Text style={[styles.title, { color: color.text }]}>{idea.title}</Text>
      <Text style={[styles.description, { color: color.text }]} numberOfLines={2}>
        {idea.description}
      </Text>
      <View style={styles.chipRow}>
        <View style={[styles.chip, { borderColor: color.border }]}>
          <Text style={[styles.chipText, { color: color.text }]}>
            {durationLabel(idea.durationMin)}
          </Text>
        </View>
        <View style={[styles.chip, { borderColor: color.border }]}>
          <Text style={[styles.chipText, { color: color.text }]}>
            {costLabel(idea.costTier)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '78%',
    borderWidth: borders.width,
    borderRadius: borders.radius,
    padding: 18,
    gap: 6,
  },
  icon: {
    fontSize: 44,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 25,
  },
  description: {
    fontSize: 14,
    lineHeight: 19,
    opacity: 0.85,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
