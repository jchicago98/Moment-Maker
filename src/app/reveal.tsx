import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton } from '@/components/BigButton';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import { playGiftKnock, playRevealMelody } from '@/lib/audio/soundEngine';
import { daypartWord } from '@/lib/daypart';
import { hapticReveal } from '@/lib/haptics';
import { iconEmoji } from '@/lib/icons';
import { useSession } from '@/lib/store/session';
import { borders, candyOrder, canvas, ink } from '@/lib/theme';

function totalLabel(totalMin: number, costTier: number): string {
  const hours = totalMin / 60;
  const time = totalMin < 60 ? `${totalMin} min` : `about ${Math.round(hours * 2) / 2} h`;
  const cost = costTier === 0 ? 'free' : '$'.repeat(costTier);
  return `${time} · ${cost}`;
}

export default function RevealScreen() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { plan, reset } = useSession();
  const [opened, setOpened] = useState(false);

  if (!plan) {
    return <Redirect href="/" />;
  }

  const daypart = daypartWord();

  const handleOpened = () => {
    setOpened(true);
    hapticReveal();
    playRevealMelody();
  };

  const startMoment = () => {
    const planId = plan.id;
    reset();
    router.replace({ pathname: '/plan', params: { id: planId } });
  };

  const cardEnter = (delayMs: number) =>
    reduceMotion ? FadeIn.delay(delayMs) : FadeInUp.delay(delayMs).springify().damping(14);

  return (
    <SafeAreaView style={styles.safe}>
      {opened ? (
        <>
          <ScrollView contentContainerStyle={styles.planContainer}>
            <Animated.Text entering={cardEnter(0)} style={styles.planTitle}>
              {plan.title} ✨
            </Animated.Text>

            {plan.steps.map((step, i) => {
              const color = candyOrder[i % candyOrder.length];
              return (
                <Animated.View
                  key={`${step.title}-${i}`}
                  entering={cardEnter(250 + i * 200)}
                  style={[styles.stepCard, { backgroundColor: color.fill, borderColor: color.border }]}
                >
                  <Text style={styles.stepTime}>{step.time}</Text>
                  <View style={styles.stepBody}>
                    <Text style={styles.stepIcon}>{iconEmoji(step.icon)}</Text>
                    <View style={styles.stepTextWrap}>
                      <Text style={[styles.stepTitle, { color: color.text }]}>{step.title}</Text>
                      <Text style={[styles.stepTip, { color: color.text }]}>{step.tip}</Text>
                    </View>
                  </View>
                </Animated.View>
              );
            })}

            <Animated.View
              entering={cardEnter(250 + plan.steps.length * 200 + 150)}
              style={styles.planFooter}
            >
              <Text style={styles.totalText}>{totalLabel(plan.totalMin, plan.costTier)}</Text>
              <BigButton label={`Start my ${daypart}`} onPress={startMoment} />
            </Animated.View>
          </ScrollView>
          {!reduceMotion && <ConfettiBurst />}
        </>
      ) : (
        <GiftBox daypart={daypart} reduceMotion={reduceMotion} onOpened={handleOpened} />
      )}
    </SafeAreaView>
  );
}

interface GiftBoxProps {
  daypart: string;
  reduceMotion: boolean;
  onOpened: () => void;
}

function GiftBox({ daypart, reduceMotion, onOpened }: GiftBoxProps) {
  // Shared-value choreography in the press handler — opt out of the compiler.
  'use no memo';
  const breathe = useSharedValue(1);
  const shake = useSharedValue(0);
  const pop = useSharedValue(1);
  const fade = useSharedValue(1);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (reduceMotion) return;
    breathe.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) })
      ),
      -1
    );
  }, [breathe, reduceMotion]);

  const giftStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [
      { scale: breathe.value * pop.value },
      { rotate: `${shake.value}deg` },
    ],
  }));

  const open = () => {
    if (opening) return;
    setOpening(true);
    playGiftKnock(); // 3–4 woodblock knocks — the gift knocking from inside

    if (reduceMotion) {
      onOpened();
      return;
    }

    // Quick 0.4s eager shake — short on purpose; a long shake deflates
    // anticipation. Then the lid pops and the box scales away.
    const tick = 50;
    shake.value = withSequence(
      withTiming(-7, { duration: tick }),
      withTiming(7, { duration: tick }),
      withTiming(-7, { duration: tick }),
      withTiming(7, { duration: tick }),
      withTiming(-5, { duration: tick }),
      withTiming(5, { duration: tick }),
      withTiming(0, { duration: tick * 2 })
    );
    pop.value = withSequence(
      withTiming(1, { duration: tick * 8 }),
      withTiming(1.25, { duration: 120, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) }, (finished) => {
        if (finished) runOnJS(onOpened)();
      })
    );
    fade.value = withSequence(
      withTiming(1, { duration: tick * 8 + 120 }),
      withTiming(0, { duration: 200 })
    );
  };

  return (
    <Pressable
      style={styles.giftWrap}
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel="Tap to open your gift"
    >
      <View style={styles.brewedBadge}>
        <Text style={styles.brewedText}>100% brewed</Text>
      </View>
      <Text style={styles.readyTitle}>Your {daypart} is ready</Text>
      <Animated.Text style={[styles.gift, giftStyle]}>🎁</Animated.Text>
      <Text style={styles.tapHint}>Tap to open</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  giftWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    padding: 24,
  },
  brewedBadge: {
    backgroundColor: ink,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  brewedText: {
    color: canvas,
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  readyTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: ink,
    textAlign: 'center',
  },
  gift: {
    fontSize: 110,
    marginVertical: 12,
  },
  tapHint: {
    fontSize: 16,
    fontWeight: '600',
    color: ink,
    opacity: 0.6,
  },
  planContainer: {
    padding: 24,
    gap: 16,
  },
  planTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: ink,
    marginTop: 8,
    marginBottom: 4,
  },
  stepCard: {
    borderWidth: borders.width,
    borderRadius: borders.radius,
    padding: 16,
    gap: 8,
  },
  stepTime: {
    fontSize: 13,
    fontWeight: '800',
    color: ink,
    opacity: 0.75,
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
  planFooter: {
    gap: 14,
    marginTop: 8,
  },
  totalText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: ink,
    opacity: 0.8,
  },
});
