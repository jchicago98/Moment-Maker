import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BigButton } from '@/components/BigButton';
import { accent, borders, capsLabel, fonts, ink, inkHead, inkSoft, line, surface, warnFill, warnText } from '@/lib/theme';
import { currentChip, currentOutlook } from '@/lib/weather';
import type { Idea } from '@/lib/types';

interface Props {
  idea: Idea | null; // null = closed
  /** Primary action ("Pick this one", "Do this idea"). Omit for read-only. */
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
              <Text style={styles.meta}>
                {idea.moods.join(' · ')} · {durationLabel(idea.durationMin)} ·{' '}
                {idea.costTier === 0 ? 'free' : '$'.repeat(idea.costTier)}
              </Text>
              <Text style={styles.title}>{idea.title}</Text>
              <View style={styles.rule} />
              <Text style={styles.description}>{idea.description}</Text>

              {(weatherChip || badWeather) && (
                <View style={styles.chipWrap}>
                  {weatherChip && <InfoChip text={weatherChip} />}
                  {badWeather && <InfoChip text="☔ better indoors today" tone="warn" />}
                </View>
              )}

              {idea.requiresTravel && (
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={`Find ${idea.title} nearby on the map`}
                  onPress={openMap}
                  style={({ pressed }) => [styles.mapLink, pressed && { opacity: 0.6 }]}
                >
                  <Text style={styles.mapLinkText}>Find nearby →</Text>
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
    backgroundColor: 'rgba(10, 8, 6, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxHeight: '82%',
    backgroundColor: surface,
    borderWidth: 1,
    borderColor: line,
    borderRadius: borders.radius,
  },
  content: {
    padding: 26,
    gap: 10,
  },
  meta: {
    ...capsLabel,
    fontSize: 10.5,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 27,
    lineHeight: 34,
    color: inkHead,
  },
  rule: {
    borderTopWidth: 1,
    borderTopColor: line,
    marginVertical: 4,
  },
  description: {
    fontFamily: fonts.serifItalic,
    fontSize: 16,
    lineHeight: 25,
    color: ink,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  chip: {
    borderWidth: 1,
    borderColor: line,
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  chipWarn: {
    backgroundColor: warnFill,
    borderColor: warnFill,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: inkSoft,
  },
  chipTextWarn: {
    color: warnText,
  },
  mapLink: {
    minHeight: 44,
    justifyContent: 'center',
  },
  mapLinkText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: accent,
    letterSpacing: 0.3,
  },
  buttons: {
    gap: 10,
    marginTop: 12,
  },
});
