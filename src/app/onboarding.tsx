import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DraggableIdeaCard } from '@/components/DraggableIdeaCard';
import { VsBadge } from '@/components/VsBadge';
import { applyPickUpdate, createEmptyProfile } from '@/lib/algorithm/learning';
import { playDealIn } from '@/lib/audio/soundEngine';
import { getIdeasByIds, saveProfile } from '@/lib/db/database';
import { borders, candyOrder, canvas, cardTilt, ink } from '@/lib/theme';
import type { Idea, UserProfile } from '@/lib/types';

// Six contrasting pairs spanning the profile's dimensions: energy/setting,
// social/cost, mood axes, time of day. Quiz picks are seeded at double
// strength so the very first real session already feels personal (§7.3).
const QUIZ_PAIRS: [string, string][] = [
  ['seed-057', 'seed-007'], // couch fort double feature vs sunset bike loop
  ['seed-063', 'seed-009'], // candlelit dinner vs living room karaoke
  ['seed-098', 'seed-047'], // paint-along vs homemade taco crawl
  ['seed-011', 'seed-003'], // sunrise walk vs midnight pancakes
  ['seed-078', 'seed-101'], // cloud-watching vs fancy hotel lobby drinks
  ['seed-040', 'seed-032'], // trail hike vs puzzle night
];

const QUIZ_FACTOR = 2;
const RESOLVE_MS = 300;

export default function OnboardingScreen() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [pendingWinner, setPendingWinner] = useState<Idea | null>(null);
  const profileRef = useRef<UserProfile>(createEmptyProfile());
  const resolveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pairs = useMemo(
    () =>
      QUIZ_PAIRS.map(([a, b]) => {
        const ideas = getIdeasByIds([a, b]);
        return ideas.length === 2 ? (ideas as [Idea, Idea]) : null;
      }).filter((p): p is [Idea, Idea] => p !== null),
    []
  );

  useEffect(() => {
    if (step < pairs.length) playDealIn();
  }, [step, pairs.length]);

  useEffect(() => {
    return () => {
      if (resolveTimer.current) clearTimeout(resolveTimer.current);
    };
  }, []);

  const finish = () => {
    saveProfile(profileRef.current); // profile presence = onboarded
    router.replace('/');
  };

  const handlePick = (winner: Idea, loser: Idea) => {
    if (pendingWinner) return;
    setPendingWinner(winner);
    profileRef.current = applyPickUpdate(profileRef.current, winner, loser, {
      factor: QUIZ_FACTOR,
    });

    resolveTimer.current = setTimeout(() => {
      if (step + 1 >= pairs.length) {
        finish();
      } else {
        setStep(step + 1);
        setPendingWinner(null);
      }
    }, RESOLVE_MS);
  };

  // Seed data missing (shouldn't happen) — don't trap the user.
  useEffect(() => {
    if (pairs.length === 0) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairs.length]);

  if (pairs.length === 0) {
    return null;
  }

  const [ideaA, ideaB] = pairs[Math.min(step, pairs.length - 1)];
  const colorA = candyOrder[step % candyOrder.length];
  const colorB = candyOrder[(step + 2) % candyOrder.length];
  const resolving = pendingWinner !== null;

  const dealIn = reduceMotion ? FadeIn : FadeInDown.springify().damping(14);
  const dealInDelayed = reduceMotion ? FadeIn : FadeInDown.delay(120).springify().damping(14);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Let&apos;s get to know you</Text>
          <Text style={styles.subtitle}>
            {reduceMotion ? 'Tap' : 'Throw'} your favorite — {pairs.length} quick picks
          </Text>
        </View>
        <View style={styles.stepBadge}>
          <Text style={styles.stepText}>
            {Math.min(step + 1, pairs.length)} / {pairs.length}
          </Text>
        </View>
      </View>

      <View style={styles.arena}>
        <Animated.View key={`${step}-a`} entering={dealIn} style={styles.cardA}>
          <DraggableIdeaCard
            idea={ideaA}
            color={colorA}
            tilt={-cardTilt}
            side="top"
            resolution={pendingWinner ? (pendingWinner.id === ideaA.id ? 'winner' : 'loser') : null}
            dragEnabled={!resolving && !reduceMotion}
            reduceMotion={reduceMotion}
            onPick={() => handlePick(ideaA, ideaB)}
          />
        </Animated.View>

        <View style={styles.vsWrap}>
          <VsBadge />
        </View>

        <Animated.View key={`${step}-b`} entering={dealInDelayed} style={styles.cardB}>
          <DraggableIdeaCard
            idea={ideaB}
            color={colorB}
            tilt={cardTilt}
            side="bottom"
            resolution={pendingWinner ? (pendingWinner.id === ideaB.id ? 'winner' : 'loser') : null}
            dragEnabled={!resolving && !reduceMotion}
            reduceMotion={reduceMotion}
            onPick={() => handlePick(ideaB, ideaA)}
          />
        </Animated.View>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={finish}
        style={({ pressed }) => [styles.skip, pressed && { opacity: 0.6 }]}
      >
        <Text style={styles.skipText}>Skip for now</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 12,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: ink,
  },
  subtitle: {
    fontSize: 14,
    color: ink,
    opacity: 0.65,
    marginTop: 2,
  },
  stepBadge: {
    backgroundColor: ink,
    borderRadius: borders.radiusSmall,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  stepText: {
    color: canvas,
    fontWeight: '900',
    fontSize: 15,
  },
  arena: {
    flex: 1,
    justifyContent: 'center',
    gap: 18,
  },
  cardA: {
    alignItems: 'flex-start',
  },
  cardB: {
    alignItems: 'flex-end',
  },
  vsWrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  skip: {
    alignSelf: 'center',
    padding: 12,
    marginBottom: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: ink,
    opacity: 0.5,
  },
});
