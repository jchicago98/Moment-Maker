import * as Haptics from 'expo-haptics';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInUp,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton } from '@/components/BigButton';
import { daypartWord } from '@/lib/daypart';
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
  const { plan, reset } = useSession();
  const [opened, setOpened] = useState(false);

  if (!plan) {
    return <Redirect href="/" />;
  }

  const daypart = daypartWord();

  const startMoment = () => {
    reset();
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safe}>
      {opened ? (
        <ScrollView contentContainerStyle={styles.planContainer}>
          <Animated.Text entering={FadeInUp.springify()} style={styles.planTitle}>
            {plan.title} ✨
          </Animated.Text>

          {plan.steps.map((step, i) => {
            const color = candyOrder[i % candyOrder.length];
            return (
              <Animated.View
                key={`${step.title}-${i}`}
                entering={FadeInUp.delay(250 + i * 200).springify().damping(14)}
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
            entering={FadeInUp.delay(250 + plan.steps.length * 200 + 150).springify()}
            style={styles.planFooter}
          >
            <Text style={styles.totalText}>{totalLabel(plan.totalMin, plan.costTier)}</Text>
            <BigButton label={`Start my ${daypart}`} onPress={startMoment} />
          </Animated.View>
        </ScrollView>
      ) : (
        <GiftBox daypart={daypart} onOpened={() => setOpened(true)} />
      )}
    </SafeAreaView>
  );
}

function GiftBox({ daypart, onOpened }: { daypart: string; onOpened: () => void }) {
  const breathe = useSharedValue(1);
  const shake = useSharedValue(0);
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    breathe.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) })
      ),
      -1
    );
  }, [breathe]);

  const giftStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathe.value }, { rotate: `${shake.value}deg` }],
  }));

  const open = () => {
    if (shaking) return;
    setShaking(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Quick 0.4s eager shake — short on purpose; a long shake deflates anticipation.
    const tick = 50;
    shake.value = withSequence(
      withTiming(-7, { duration: tick }),
      withTiming(7, { duration: tick }),
      withTiming(-7, { duration: tick }),
      withTiming(7, { duration: tick }),
      withTiming(-5, { duration: tick }),
      withTiming(5, { duration: tick }),
      withTiming(0, { duration: tick * 2 }, (finished) => {
        if (finished) runOnJS(onOpened)();
      })
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
