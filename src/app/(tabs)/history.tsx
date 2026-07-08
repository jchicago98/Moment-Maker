import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getDoneMoments, type MomentWithIdea } from '@/lib/db/database';
import { hapticReveal } from '@/lib/haptics';
import { iconEmoji } from '@/lib/icons';
import { pickAndAttachPhoto, rateMoment } from '@/lib/momentActions';
import { borders, candyOrder, ink } from '@/lib/theme';

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
            <Text style={styles.subtitle}>The moments you actually made. 🎉</Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            Nothing here yet — moments land on this shelf once you tell us they happened. 🎁
          </Text>
        }
        renderItem={({ item, index }) => {
          const color = candyOrder[index % candyOrder.length];
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
              <View
                style={[styles.card, { backgroundColor: color.fill, borderColor: color.border }]}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardDate, { color: color.text }]}>
                    {formatDate(moment.confirmedAt ?? moment.createdAt)}
                  </Text>
                  <View style={[styles.doneBadge, { borderColor: color.border }]}>
                    <Text style={[styles.doneText, { color: color.text }]}>we did it!</Text>
                  </View>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardIcon}>{iconEmoji(idea.icon)}</Text>
                  <View style={styles.cardTextWrap}>
                    <Text style={[styles.cardTitle, { color: color.text }]}>{idea.title}</Text>
                    <Text style={[styles.cardTip, { color: color.text }]} numberOfLines={2}>
                      {idea.description}
                    </Text>
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
                      style={({ pressed }) => [
                        styles.photoButton,
                        { borderColor: color.border },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Text style={[styles.photoButtonText, { color: color.text }]}>
                        📷 add a photo
                      </Text>
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
    padding: 20,
    gap: 14,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: ink,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 15,
    color: ink,
    opacity: 0.65,
    marginTop: 2,
    marginBottom: 8,
  },
  empty: {
    textAlign: 'center',
    color: ink,
    opacity: 0.6,
    fontSize: 15,
    marginTop: 32,
    lineHeight: 22,
  },
  card: {
    borderWidth: borders.width,
    borderRadius: borders.radius,
    padding: 16,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDate: {
    fontSize: 13,
    fontWeight: '800',
    opacity: 0.75,
  },
  doneBadge: {
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  doneText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cardBody: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 38,
  },
  cardTextWrap: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  cardTip: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.85,
  },
  photo: {
    height: 140,
    borderRadius: borders.radiusSmall,
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
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
    fontSize: 20,
  },
  starDim: {
    opacity: 0.25,
  },
  photoButton: {
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 44,
    justifyContent: 'center',
  },
  photoButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
