import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconBox } from '@/components/IconBox';
import { getDoneMoments, type MomentWithIdea } from '@/lib/db/database';
import { hapticReveal } from '@/lib/haptics';
import { iconEmoji } from '@/lib/icons';
import { pickAndAttachPhoto, rateMoment } from '@/lib/momentActions';
import { accent, borders, capsLabel, fonts, inkHead, inkSoft, line, rule, surface } from '@/lib/theme';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function JournalScreen() {
  const reduceMotion = useReducedMotion();
  const [entries, setEntries] = useState<MomentWithIdea[]>([]);

  const refresh = useCallback(() => setEntries(getDoneMoments()), []);
  useFocusEffect(refresh);

  const rate = (momentId: string, stars: 1 | 2 | 3 | 4 | 5) => {
    rateMoment(momentId, stars);
    hapticReveal();
    refresh();
  };

  const addPhoto = async (momentId: string) => {
    if (await pickAndAttachPhoto(momentId)) refresh();
  };

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
          const rating = moment.rating;
          return (
            <Animated.View
              entering={
                reduceMotion
                  ? undefined
                  : FadeInUp.delay(Math.min(index, 6) * 70).springify().damping(15)
              }
            >
              <View style={styles.card}>
                <View style={styles.cardBody}>
                  <IconBox emoji={iconEmoji(idea.icon)} size="s" />
                  <View style={styles.cardTextWrap}>
                    <Text style={styles.cardDate}>
                      {formatDate(moment.confirmedAt ?? moment.createdAt)}
                    </Text>
                    <Text style={styles.cardTitle}>{idea.title}</Text>
                  </View>
                </View>

                {moment.photoUri && (
                  <Image
                    source={{ uri: moment.photoUri }}
                    style={styles.photo}
                    contentFit="cover"
                    accessibilityLabel="Your photo of this moment"
                  />
                )}

                <View style={styles.cardFooter}>
                  <View style={styles.starRow}>
                    {([1, 2, 3, 4, 5] as const).map((stars) => (
                      <Pressable
                        key={stars}
                        accessibilityRole="button"
                        accessibilityLabel={`Rate ${stars} star${stars > 1 ? 's' : ''}`}
                        onPress={() => rate(moment.id, stars)}
                        hitSlop={6}
                        style={styles.star}
                      >
                        <Text
                          style={[styles.starText, !(rating && stars <= rating) && styles.starDim]}
                        >
                          ★
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  {!moment.photoUri && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Add a photo"
                      onPress={() => addPhoto(moment.id)}
                      style={({ pressed }) => [styles.photoLink, pressed && { opacity: 0.6 }]}
                    >
                      <Text style={styles.photoLinkText}>Add a photograph →</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </Animated.View>
          );
        }}
      />
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
    gap: 12,
  },
  cardBody: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  cardTextWrap: {
    flex: 1,
    gap: 3,
  },
  cardDate: {
    ...capsLabel,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  cardTitle: {
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 23,
    color: inkHead,
  },
  photo: {
    height: 150,
    borderRadius: borders.radiusSmall,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  starRow: {
    flexDirection: 'row',
  },
  star: {
    minWidth: 32,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starText: {
    fontSize: 18,
    color: accent,
  },
  starDim: {
    color: rule,
  },
  photoLink: {
    minHeight: 44,
    justifyContent: 'center',
  },
  photoLinkText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: accent,
    letterSpacing: 0.3,
  },
});
