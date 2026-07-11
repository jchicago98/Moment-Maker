import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IdeaEtching } from '@/components/IdeaEtching';
import { JournalEntrySheet } from '@/components/JournalEntrySheet';
import { getDoneMoments, type MomentWithIdea } from '@/lib/db/database';
import { accent, borders, capsLabel, fonts, ideaHue, inkFaint, inkHead, inkSoft, line, rule, surface } from '@/lib/theme';

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const day = date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${time}`;
}

export default function JournalScreen() {
  const reduceMotion = useReducedMotion();
  const [entries, setEntries] = useState<MomentWithIdea[]>([]);
  const [openEntry, setOpenEntry] = useState<MomentWithIdea | null>(null);

  const refresh = useCallback(() => {
    const done = getDoneMoments();
    setEntries(done);
    // Keep the open sheet in sync (e.g. after a photo or rating change).
    setOpenEntry((current) =>
      current ? (done.find((e) => e.moment.id === current.moment.id) ?? null) : null
    );
  }, []);
  useFocusEffect(refresh);

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={entries}
        keyExtractor={(entry) => entry.moment.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={capsLabel}>A record of evenings well spent</Text>
            <Text style={styles.title}>The journal</Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            Empty for now — entries appear once you tell us an idea actually happened.
          </Text>
        }
        renderItem={({ item, index }) => {
          const { moment, idea } = item;
          const hue = ideaHue(idea.moods);
          return (
            <Animated.View
              entering={
                reduceMotion
                  ? undefined
                  : FadeInUp.delay(Math.min(index, 6) * 70).springify().damping(15)
              }
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open journal entry for ${idea.title}`}
                onPress={() => setOpenEntry(item)}
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }]}
              >
                <IdeaEtching icon={idea.icon} hue={hue} size={110} opacity={0.11} />
                <Text style={[styles.cardDate, { color: hue }]}>
                  {formatDateTime(moment.confirmedAt ?? moment.createdAt)}
                </Text>
                <Text style={styles.cardTitle}>{idea.title}</Text>
                {moment.rating ? (
                  <Text style={styles.stars}>
                    {'★'.repeat(moment.rating)}
                    <Text style={styles.starsDim}>{'★'.repeat(5 - moment.rating)}</Text>
                  </Text>
                ) : null}
                {moment.note ? (
                  <Text style={styles.note} numberOfLines={2}>
                    “{moment.note}”
                  </Text>
                ) : (
                  <Text style={styles.noteHint}>add a note for future you →</Text>
                )}
              </Pressable>
            </Animated.View>
          );
        }}
      />

      <JournalEntrySheet entry={openEntry} onChanged={refresh} onClose={() => setOpenEntry(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  list: {
    padding: 24,
    gap: 12,
  },
  header: {
    gap: 8,
    marginTop: 8,
    marginBottom: 10,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 28,
    color: inkHead,
    marginTop: -4,
  },
  empty: {
    fontFamily: fonts.serifItalic,
    textAlign: 'center',
    color: inkSoft,
    fontSize: 15,
    marginTop: 32,
    lineHeight: 23,
  },
  card: {
    backgroundColor: surface,
    borderWidth: 1,
    borderColor: line,
    borderRadius: borders.radius,
    padding: 16,
    gap: 6,
    overflow: 'hidden', // crops the etching at the card edge
  },
  cardDate: {
    ...capsLabel,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  cardTitle: {
    fontFamily: fonts.serif,
    fontSize: 19,
    lineHeight: 24,
    color: inkHead,
  },
  stars: {
    fontSize: 13,
    letterSpacing: 2.5,
    color: accent,
  },
  starsDim: {
    color: rule,
  },
  note: {
    fontFamily: fonts.serifItalic,
    fontSize: 13.5,
    lineHeight: 20,
    color: inkSoft,
    borderTopWidth: 1,
    borderTopColor: rule,
    paddingTop: 9,
    marginTop: 4,
  },
  noteHint: {
    fontSize: 12,
    fontWeight: '600',
    color: inkFaint,
    letterSpacing: 0.3,
    marginTop: 4,
  },
});
