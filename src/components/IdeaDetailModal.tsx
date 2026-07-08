import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BigButton } from '@/components/BigButton';
import { iconEmoji } from '@/lib/icons';
import { borders, type CandyColor } from '@/lib/theme';
import type { Idea } from '@/lib/types';

interface Props {
  idea: Idea | null; // null = closed
  color: CandyColor;
  /** Omit to make the modal read-only (no pick button). */
  onPick?: () => void;
  onClose: () => void;
}

function durationLabel(min: number): string {
  if (min < 60) return `${min} min`;
  if (min % 60 === 0) return `${min / 60} h`;
  return `${Math.floor(min / 60)}½ h`;
}

const GROUP_LABELS: Record<string, string> = {
  solo: 'just me',
  couple: 'partner',
  friends: 'friends',
  family: 'family',
};

const ENERGY_LABELS = ['', 'chill', 'medium energy', 'active'];
const SETTING_LABELS = { indoor: 'indoors', outdoor: 'outdoors', either: 'in or out' };

export function IdeaDetailModal({ idea, color, onPick, onClose }: Props) {
  return (
    <Modal visible={idea !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close details">
        {idea && (
          <Pressable
            // Swallow taps on the card itself so only the backdrop dismisses.
            onPress={() => {}}
            style={[styles.card, { backgroundColor: color.fill, borderColor: color.border }]}
          >
            <ScrollView contentContainerStyle={styles.content}>
              <Text style={styles.icon}>{iconEmoji(idea.icon)}</Text>
              <Text style={[styles.title, { color: color.text }]}>{idea.title}</Text>
              <Text style={[styles.description, { color: color.text }]}>{idea.description}</Text>

              <View style={styles.chipWrap}>
                {idea.moods.map((mood) => (
                  <DetailChip key={mood} color={color} text={mood} />
                ))}
                <DetailChip color={color} text={durationLabel(idea.durationMin)} />
                <DetailChip color={color} text={idea.costTier === 0 ? 'free' : '$'.repeat(idea.costTier)} />
                <DetailChip color={color} text={SETTING_LABELS[idea.setting]} />
                <DetailChip color={color} text={ENERGY_LABELS[idea.energy]} />
                {idea.groupFit.map((group) => (
                  <DetailChip key={group} color={color} text={GROUP_LABELS[group] ?? group} />
                ))}
                {idea.timeOfDay.map((time) => (
                  <DetailChip key={time} color={color} text={time} />
                ))}
              </View>

              <View style={styles.buttons}>
                {onPick && <BigButton label="Pick this one 🎯" onPress={onPick} />}
                <BigButton label="Keep looking" variant="ghost" onPress={onClose} />
              </View>
            </ScrollView>
          </Pressable>
        )}
      </Pressable>
    </Modal>
  );
}

function DetailChip({ color, text }: { color: CandyColor; text: string }) {
  return (
    <View style={[styles.chip, { borderColor: color.border }]}>
      <Text style={[styles.chipText, { color: color.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(44, 44, 42, 0.55)', // ink at half strength
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxHeight: '80%',
    borderWidth: borders.width,
    borderRadius: borders.radius,
  },
  content: {
    padding: 22,
    gap: 10,
  },
  icon: {
    fontSize: 56,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
  },
  description: {
    fontSize: 16,
    lineHeight: 23,
    opacity: 0.9,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
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
  buttons: {
    gap: 10,
    marginTop: 12,
  },
});
