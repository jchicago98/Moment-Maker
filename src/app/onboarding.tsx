import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DraggableIdeaCard } from '@/components/DraggableIdeaCard';
import { IdeaDetailModal } from '@/components/IdeaDetailModal';
import { VsBadge } from '@/components/VsBadge';
import { applyPickUpdate, createEmptyProfile } from '@/lib/algorithm/learning';
import { playDealIn } from '@/lib/audio/soundEngine';
import { getIdeasByIds, saveProfile } from '@/lib/db/database';
import { accent, cardTilt, ink, inkSoft, softShadow, surface } from '@/lib/theme';
import { useWeather } from '@/lib/weather';
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
  const [inspecting, setInspecting] = useState<Idea | null>(null);
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

  const finish = async () => {
    saveProfile(profileRef.current); // profile presence = onboarded
    // Rough location, asked once here (§5.1) — used only for weather. Denial
    // is fine; the app silently behaves as "weather unknown".
    try {
      await Location.requestForegroundPermissionsAsync();
      useWeather.getState().refresh();
    } catch {
      // never block onboarding on a permission dialog hiccup
    }
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

  const pickFromModal = (pair: [Idea, Idea]) => {
    if (!inspecting) return;
    const winner = inspecting;
    const loser = winner.id === pair[0].id ? pair[1] : pair[0];
    setInspecting(null);
    handlePick(winner, loser);
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
            tilt={-cardTilt}
            side="top"
            resolution={pendingWinner ? (pendingWinner.id === ideaA.id ? 'winner' : 'loser') : null}
            dragEnabled={!resolving && !reduceMotion}
            reduceMotion={reduceMotion}
            onPick={() => handlePick(ideaA, ideaB)}
            onInspect={() => !resolving && setInspecting(ideaA)}
          />
        </Animated.View>

        <View style={styles.vsWrap}>
          <VsBadge />
        </View>

        <Animated.View key={`${step}-b`} entering={dealInDelayed} style={styles.cardB}>
          <DraggableIdeaCard
            idea={ideaB}
            tilt={cardTilt}
            side="bottom"
            resolution={pendingWinner ? (pendingWinner.id === ideaB.id ? 'winner' : 'loser') : null}
            dragEnabled={!resolving && !reduceMotion}
            reduceMotion={reduceMotion}
            onPick={() => handlePick(ideaB, ideaA)}
            onInspect={() => !resolving && setInspecting(ideaB)}
          />
        </Animated.View>
      </View>

      <IdeaDetailModal
        idea={inspecting}
        actionLabel="Pick this one 🎯"
        onAction={() => pickFromModal([ideaA, ideaB])}
        onClose={() => setInspecting(null)}
      />

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
    fontSize: 23,
    fontWeight: '700',
    color: ink,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 14,
    color: inkSoft,
    marginTop: 2,
  },
  stepBadge: {
    backgroundColor: surface,
    borderRadius: 999,
    paddingHorizontal: 15,
    paddingVertical: 9,
    ...softShadow,
    shadowOpacity: 0.08,
  },
  stepText: {
    color: accent,
    fontWeight: '800',
    fontSize: 14,
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
    color: inkSoft,
  },
});
