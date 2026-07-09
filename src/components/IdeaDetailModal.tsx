import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BigButton } from '@/components/BigButton';
import { IconHalo } from '@/components/IconHalo';
import { iconEmoji } from '@/lib/icons';
import { accent, borders, candy, ink, inkSoft, softShadow, surface } from '@/lib/theme';
import { currentChip, currentOutlook } from '@/lib/weather';
import type { Idea } from '@/lib/types';

interface Props {
  idea: Idea | null; // null = closed
  /** Primary action ("Pick this one 🎯", "Do this idea 💫"). Omit for read-only. */
  actionLabel?: string;
  onAction?: () => void;
  onClose: () => void;
}

function durationLabel(min: number): string {
  if (min < 60) return `${min} min`;
  if (min % 60 === 0) return `${min / 60} h`;
  return `${Math.floor(min / 60)}½ h`;
}

export function IdeaDetailModal({ idea, actionLabel, onAction, onClose }: Props) {
  const weatherChip = idea?.setting === 'outdoor' ? currentChip() : null;
  const badWeather =
    idea?.setting === 'outdoor' && idea.weatherSensitive && currentOutlook() === 'bad';

  const openMap = () => {
    if (!idea) return;
    Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(idea.title)}`
    );
  };

  return (
    <Modal visible={idea !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close details">
        {idea && (
          <Pressable
            // Swallow taps on the card itself so only the backdrop dismisses.
            onPress={() => {}}
            style={styles.card}
          >
            <ScrollView contentContainerStyle={styles.content}>
              <View style={styles.haloWrap}>
                <IconHalo emoji={iconEmoji(idea.icon)} size="l" />
              </View>
              <Text style={styles.title}>{idea.title}</Text>
              <Text style={styles.moods}>{idea.moods.join(' · ')}</Text>
              <Text style={styles.description}>{idea.description}</Text>

              <View style={styles.chipWrap}>
                <InfoChip text={durationLabel(idea.durationMin)} />
                <InfoChip text={idea.costTier === 0 ? 'free' : '$'.repeat(idea.costTier)} />
                {weatherChip && <InfoChip text={weatherChip} />}
                {badWeather && <InfoChip text="☔ better indoors today" tone="warn" />}
              </View>

              {idea.requiresTravel && (
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={`Find ${idea.title} nearby on the map`}
                  onPress={openMap}
                  style={({ pressed }) => [styles.mapLink, pressed && { opacity: 0.6 }]}
                >
                  <Text style={styles.mapLinkText}>📍 find nearby</Text>
                </Pressable>
              )}

              <View style={styles.buttons}>
                {actionLabel && onAction && <BigButton label={actionLabel} onPress={onAction} />}
                <BigButton label="Keep looking" variant="ghost" onPress={onClose} />
              </View>
            </ScrollView>
          </Pressable>
        )}
      </Pressable>
    </Modal>
  );
}

function InfoChip({ text, tone = 'neutral' }: { text: string; tone?: 'neutral' | 'warn' }) {
  return (
    <View style={[styles.chip, tone === 'warn' && styles.chipWarn]}>
      <Text style={[styles.chipText, tone === 'warn' && styles.chipTextWarn]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(75, 67, 86, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxHeight: '82%',
    backgroundColor: surface,
    borderRadius: borders.radius,
    ...softShadow,
  },
  content: {
    padding: 26,
    gap: 8,
    alignItems: 'center',
  },
  haloWrap: {
    marginBottom: 4,
  },
  title: {
    fontSize: 23,
    fontWeight: '700',
    lineHeight: 30,
    color: ink,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  moods: {
    fontSize: 14,
    fontWeight: '600',
    color: accent,
    letterSpacing: 0.4,
  },
  description: {
    fontSize: 15,
    lineHeight: 23,
    color: inkSoft,
    textAlign: 'center',
    marginTop: 4,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(75, 67, 86, 0.07)',
  },
  chipWarn: {
    backgroundColor: candy.coral.fill,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: ink,
  },
  chipTextWarn: {
    color: candy.coral.text,
  },
  mapLink: {
    padding: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  mapLinkText: {
    fontSize: 14,
    fontWeight: '700',
    color: accent,
  },
  buttons: {
    alignSelf: 'stretch',
    gap: 10,
    marginTop: 12,
  },
});
