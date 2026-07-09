import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconHalo } from '@/components/IconHalo';
import { getDoneMoments, type MomentWithIdea } from '@/lib/db/database';
import { hapticReveal } from '@/lib/haptics';
import { iconEmoji } from '@/lib/icons';
import { pickAndAttachPhoto, rateMoment } from '@/lib/momentActions';
import { accent, borders, ink, inkSoft, softShadow, surface } from '@/lib/theme';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function HistoryScreen() {
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
          <View>
            <Text style={styles.title}>Scrapbook</Text>
            <Text style={styles.subtitle}>The moments you actually made 🎉</Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            Nothing here yet — moments land on this shelf once you tell us they happened. 🎁
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
                  <IconHalo emoji={iconEmoji(idea.icon)} size="s" />
                  <View style={styles.cardTextWrap}>
                    <Text style={styles.cardDate}>
                      {formatDate(moment.confirmedAt ?? moment.createdAt)}
                    </Text>
                    <Text style={styles.cardTitle}>{idea.title}</Text>
                    <Text style={styles.cardMoods}>{idea.moods.join(' · ')}</Text>
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
                          ⭐
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  {!moment.photoUri && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Add a photo"
                      onPress={() => addPhoto(moment.id)}
                      style={({ pressed }) => [styles.photoButton, pressed && { opacity: 0.7 }]}
                    >
                      <Text style={styles.photoButtonText}>📷 add a photo</Text>
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
    padding: 22,
    gap: 14,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: ink,
    marginTop: 8,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 15,
    color: inkSoft,
    marginTop: 2,
    marginBottom: 8,
  },
  empty: {
    textAlign: 'center',
    color: inkSoft,
    fontSize: 15,
    marginTop: 32,
    lineHeight: 22,
  },
  card: {
    backgroundColor: surface,
    borderRadius: borders.radius,
    padding: 18,
    gap: 10,
    ...softShadow,
    shadowOpacity: 0.09,
  },
  cardBody: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  cardTextWrap: {
    flex: 1,
    gap: 2,
  },
  cardDate: {
    fontSize: 12,
    fontWeight: '700',
    color: inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: ink,
    lineHeight: 22,
  },
  cardMoods: {
    fontSize: 13,
    fontWeight: '600',
    color: accent,
    letterSpacing: 0.3,
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
    minWidth: 34,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starText: {
    fontSize: 19,
  },
  starDim: {
    opacity: 0.22,
  },
  photoButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(75, 67, 86, 0.06)',
    minHeight: 44,
    justifyContent: 'center',
  },
  photoButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: ink,
  },
});
