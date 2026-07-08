import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton } from '@/components/BigButton';
import { Chip } from '@/components/Chip';
import { getLatestUnratedPlan, hasProfile } from '@/lib/db/database';
import { hapticReveal } from '@/lib/haptics';
import { useSession } from '@/lib/store/session';
import { useSettings } from '@/lib/store/settings';
import { borders, candy, ink } from '@/lib/theme';
import type { CostTier, GroupType, Plan } from '@/lib/types';

const groups: { value: GroupType; label: string }[] = [
  { value: 'solo', label: 'Just me' },
  { value: 'couple', label: 'Partner' },
  { value: 'friends', label: 'Friends' },
  { value: 'family', label: 'Family' },
];

const times: { value: number; label: string }[] = [
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
  { value: 300, label: 'Half day' },
  { value: 480, label: 'All day' },
];

const budgets: { value: CostTier; label: string }[] = [
  { value: 0, label: 'Free' },
  { value: 1, label: '$' },
  { value: 2, label: '$$' },
  { value: 3, label: '$$$' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { setup, setSetup, startSession, rateLastPlan } = useSession();
  const { soundOn, toggleSound } = useSettings();
  const [unratedPlan, setUnratedPlan] = useState<Plan | null>(null);
  const [justRated, setJustRated] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setUnratedPlan(getLatestUnratedPlan());
      setJustRated(false);
    }, [])
  );

  // First launch: the onboarding quiz seeds the profile (its presence in the
  // DB doubles as the onboarded flag). Synchronous SQLite read — no flicker.
  if (!hasProfile()) {
    return <Redirect href="/onboarding" />;
  }

  const rate = (stars: 1 | 2 | 3 | 4 | 5) => {
    if (!unratedPlan) return;
    rateLastPlan(unratedPlan.id, stars); // ratings are the strongest signal (§7.1)
    hapticReveal();
    setJustRated(true);
  };

  const dealMeIn = () => {
    if (startSession()) {
      router.push('/picker');
    } else {
      Alert.alert(
        'Hmm',
        "We couldn't find enough ideas for that combo. Try a bigger budget or more time?"
      );
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Moment maker</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={soundOn ? 'Mute sound' : 'Unmute sound'}
            onPress={toggleSound}
            style={({ pressed }) => [styles.soundToggle, pressed && { transform: [{ scale: 0.94 }] }]}
          >
            <Text style={styles.soundIcon}>{soundOn ? '🔊' : '🔇'}</Text>
          </Pressable>
        </View>
        <Text style={styles.tagline}>{'"What should we do today?" — solved.'}</Text>

        {unratedPlan && (
          <View style={styles.ratingCard}>
            {justRated ? (
              <Text style={styles.ratingTitle}>Noted! Your next plan just got smarter ✨</Text>
            ) : (
              <>
                <Text style={styles.ratingTitle}>How was it?</Text>
                <Text style={styles.ratingSubtitle}>{unratedPlan.title}</Text>
                <View style={styles.starRow}>
                  {([1, 2, 3, 4, 5] as const).map((stars) => (
                    <Pressable
                      key={stars}
                      accessibilityRole="button"
                      accessibilityLabel={`Rate ${stars} star${stars > 1 ? 's' : ''}`}
                      onPress={() => rate(stars)}
                      style={({ pressed }) => [styles.star, pressed && { transform: [{ scale: 1.2 }] }]}
                    >
                      <Text style={styles.starText}>⭐</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{"Who's playing?"}</Text>
          <View style={styles.chipRow}>
            {groups.map((g) => (
              <Chip
                key={g.value}
                label={g.label}
                selected={setup.group === g.value}
                onPress={() => setSetup({ group: g.value })}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>How much time?</Text>
          <View style={styles.chipRow}>
            {times.map((t) => (
              <Chip
                key={t.value}
                label={t.label}
                selected={setup.timeBudgetMin === t.value}
                onPress={() => setSetup({ timeBudgetMin: t.value })}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Budget</Text>
          <View style={styles.chipRow}>
            {budgets.map((b) => (
              <Chip
                key={b.value}
                label={b.label}
                selected={setup.costCap === b.value}
                onPress={() => setSetup({ costCap: b.value })}
              />
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <BigButton label="Deal me in 🃏" onPress={dealMeIn} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    padding: 24,
    gap: 24,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 12,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: ink,
    flexShrink: 1,
  },
  soundToggle: {
    borderWidth: borders.width,
    borderColor: ink,
    borderRadius: 999,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundIcon: {
    fontSize: 20,
  },
  tagline: {
    fontSize: 16,
    color: ink,
    opacity: 0.7,
    marginTop: -14,
  },
  ratingCard: {
    borderWidth: borders.width,
    borderColor: candy.purple.border,
    backgroundColor: candy.purple.fill,
    borderRadius: borders.radius,
    padding: 16,
    gap: 6,
  },
  ratingTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: candy.purple.text,
  },
  ratingSubtitle: {
    fontSize: 14,
    color: candy.purple.text,
    opacity: 0.8,
  },
  starRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  star: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starText: {
    fontSize: 26,
  },
  section: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: ink,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  footer: {
    marginTop: 12,
  },
});
