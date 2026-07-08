import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton } from '@/components/BigButton';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import { playDealIn, playRevealMelody } from '@/lib/audio/soundEngine';
import { getExperienceForPlan, getIdeasByIds, getPlanById } from '@/lib/db/database';
import { hapticReveal } from '@/lib/haptics';
import { iconEmoji } from '@/lib/icons';
import { completePlan, ratePlan, swapPlanStep } from '@/lib/planActions';
import { borders, candyOrder, ink } from '@/lib/theme';
import type { Plan } from '@/lib/types';

function totalLabel(totalMin: number, costTier: number): string {
  const hours = totalMin / 60;
  const time = totalMin < 60 ? `${totalMin} min` : `about ${Math.round(hours * 2) / 2} h`;
  const cost = costTier === 0 ? 'free' : '$'.repeat(costTier);
  return `${time} · ${cost}`;
}

export default function PlanScreen() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [completed, setCompleted] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setPlan(getPlanById(id));
    const experience = getExperienceForPlan(id);
    setCompleted(experience?.completed ?? false);
    setRating(experience?.rating ?? null);
  }, [id]);

  useFocusEffect(load);

  if (!plan) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.missing}>
          <Text style={styles.missingText}>That plan wandered off.</Text>
          <BigButton label="Back home" onPress={() => router.replace('/')} />
        </View>
      </SafeAreaView>
    );
  }

  const travelIds = new Set(
    getIdeasByIds(plan.ideaIds)
      .filter((i) => i.requiresTravel)
      .map((i) => i.id)
  );

  const swap = (index: number) => {
    const updated = swapPlanStep(plan.id, index);
    if (updated) {
      playDealIn();
      setPlan(updated);
    }
  };

  const openMap = (title: string) => {
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(title)}`);
  };

  const weDidIt = () => {
    completePlan(plan.id); // mild positive signal even before any rating
    hapticReveal();
    playRevealMelody();
    setCompleted(true);
    setCelebrate(true);
  };

  const rate = (stars: 1 | 2 | 3 | 4 | 5) => {
    ratePlan(plan.id, stars);
    hapticReveal();
    setRating(stars);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{plan.title}</Text>
        <Text style={styles.total}>{totalLabel(plan.totalMin, plan.costTier)}</Text>

        {plan.steps.map((step, i) => {
          const color = candyOrder[i % candyOrder.length];
          const ideaId = plan.ideaIds[i];
          return (
            <View
              key={`${ideaId}-${i}`}
              style={[styles.stepCard, { backgroundColor: color.fill, borderColor: color.border }]}
            >
              <View style={styles.stepHeader}>
                <Text style={[styles.stepTime, { color: color.text }]}>{step.time}</Text>
                {!completed && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Swap ${step.title} for something else`}
                    onPress={() => swap(i)}
                    hitSlop={8}
                    style={({ pressed }) => [pressed && { opacity: 0.6 }]}
                  >
                    <Text style={[styles.swapText, { color: color.text }]}>🔄 swap</Text>
                  </Pressable>
                )}
              </View>
              <View style={styles.stepBody}>
                <Text style={styles.stepIcon}>{iconEmoji(step.icon)}</Text>
                <View style={styles.stepTextWrap}>
                  <Text style={[styles.stepTitle, { color: color.text }]}>{step.title}</Text>
                  <Text style={[styles.stepTip, { color: color.text }]}>{step.tip}</Text>
                  {travelIds.has(ideaId) && (
                    <Pressable
                      accessibilityRole="link"
                      accessibilityLabel={`Find ${step.title} nearby on the map`}
                      onPress={() => openMap(step.title)}
                      hitSlop={6}
                      style={({ pressed }) => [pressed && { opacity: 0.6 }]}
                    >
                      <Text style={[styles.mapLink, { color: color.text }]}>📍 find nearby</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          );
        })}

        {completed ? (
          <View style={styles.ratingBlock}>
            <Text style={styles.ratingPrompt}>
              {rating ? 'A moment for the scrapbook ✨' : 'How was it?'}
            </Text>
            <View style={styles.starRow}>
              {([1, 2, 3, 4, 5] as const).map((stars) => (
                <Pressable
                  key={stars}
                  accessibilityRole="button"
                  accessibilityLabel={`Rate ${stars} star${stars > 1 ? 's' : ''}`}
                  onPress={() => rate(stars)}
                  style={styles.star}
                >
                  <Text style={[styles.starText, !(rating && stars <= rating) && styles.starDim]}>⭐</Text>
                </Pressable>
              ))}
            </View>
            <BigButton label="Back home" variant="ghost" onPress={() => router.replace('/')} />
          </View>
        ) : (
          <View style={styles.footer}>
            <BigButton label="We did it! 🎉" onPress={weDidIt} />
            <BigButton label="Back home" variant="ghost" onPress={() => router.replace('/')} />
          </View>
        )}
      </ScrollView>
      {celebrate && !reduceMotion && <ConfettiBurst />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    padding: 24,
    gap: 14,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  missingText: {
    fontSize: 17,
    fontWeight: '700',
    color: ink,
    opacity: 0.7,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: ink,
    marginTop: 8,
  },
  total: {
    fontSize: 15,
    fontWeight: '700',
    color: ink,
    opacity: 0.7,
    marginTop: -8,
  },
  stepCard: {
    borderWidth: borders.width,
    borderRadius: borders.radius,
    padding: 16,
    gap: 8,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepTime: {
    fontSize: 13,
    fontWeight: '800',
    opacity: 0.75,
  },
  swapText: {
    fontSize: 13,
    fontWeight: '800',
  },
  stepBody: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  stepIcon: {
    fontSize: 34,
  },
  stepTextWrap: {
    flex: 1,
    gap: 3,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  stepTip: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.85,
  },
  mapLink: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  ratingBlock: {
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  ratingPrompt: {
    fontSize: 17,
    fontWeight: '800',
    color: ink,
  },
  starRow: {
    flexDirection: 'row',
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
  starDim: {
    opacity: 0.25,
  },
  footer: {
    gap: 10,
    marginTop: 8,
  },
});
