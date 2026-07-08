import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { File, Paths } from 'expo-file-system';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getHistory, type HistoryEntry } from '@/lib/db/database';
import { hapticReveal } from '@/lib/haptics';
import { iconEmoji } from '@/lib/icons';
import { attachPhoto, ratePlan } from '@/lib/planActions';
import { borders, candyOrder, ink } from '@/lib/theme';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function HistoryScreen() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  const refresh = useCallback(() => setEntries(getHistory()), []);
  useFocusEffect(refresh);

  const rate = (planId: string, stars: 1 | 2 | 3 | 4 | 5) => {
    ratePlan(planId, stars);
    hapticReveal();
    refresh();
  };

  const pickPhoto = async (planId: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    try {
      // Copy into the app's documents so the memory outlives the picker cache.
      const dest = new File(Paths.document, `moment-${planId}.jpg`);
      if (dest.exists) dest.delete();
      new File(asset.uri).copy(dest);
      attachPhoto(planId, dest.uri);
    } catch {
      attachPhoto(planId, asset.uri);
    }
    refresh();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={entries}
        keyExtractor={(entry) => entry.plan.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>Scrapbook</Text>
            <Text style={styles.subtitle}>{"Every moment you've brewed, kept safe."}</Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            No moments yet — deal yourself in and the first one lands here. 🎁
          </Text>
        }
        renderItem={({ item, index }) => {
          const color = candyOrder[index % candyOrder.length];
          const { plan, experience } = item;
          const rating = experience?.rating;
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
              accessibilityLabel={`Open plan ${plan.title}`}
              onPress={() => router.push({ pathname: '/plan', params: { id: plan.id } })}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: color.fill, borderColor: color.border },
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.cardDate, { color: color.text }]}>{formatDate(plan.createdAt)}</Text>
                {experience?.completed && (
                  <View style={[styles.doneBadge, { borderColor: color.border }]}>
                    <Text style={[styles.doneText, { color: color.text }]}>we did it! 🎉</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.cardTitle, { color: color.text }]}>{plan.title}</Text>
              <Text style={[styles.cardSteps, { color: color.text }]} numberOfLines={1}>
                {plan.steps.map((s) => `${iconEmoji(s.icon)} ${s.title}`).join('  ·  ')}
              </Text>

              {experience?.photoUri && (
                <Image
                  source={{ uri: experience.photoUri }}
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
                      onPress={(e) => {
                        e.stopPropagation();
                        rate(plan.id, stars);
                      }}
                      hitSlop={6}
                      style={styles.star}
                    >
                      <Text style={[styles.starText, !(rating && stars <= rating) && styles.starDim]}>
                        ⭐
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {experience?.completed && !experience.photoUri && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Add a photo"
                    onPress={(e) => {
                      e.stopPropagation();
                      pickPhoto(plan.id);
                    }}
                    style={({ pressed }) => [
                      styles.photoButton,
                      { borderColor: color.border },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text style={[styles.photoButtonText, { color: color.text }]}>📷 add a photo</Text>
                  </Pressable>
                )}
              </View>
            </Pressable>
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
    gap: 6,
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
  cardTitle: {
    fontSize: 19,
    fontWeight: '800',
  },
  cardSteps: {
    fontSize: 13,
    opacity: 0.85,
  },
  photo: {
    height: 140,
    borderRadius: borders.radiusSmall,
    marginTop: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
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
