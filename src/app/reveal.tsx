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
import { playDealIn, playGiftKnock, playRevealMelody } from '@/lib/audio/soundEngine';
import { daypartWord } from '@/lib/daypart';
import { hapticReveal } from '@/lib/haptics';
import { iconEmoji } from '@/lib/icons';
import { createMoment } from '@/lib/momentActions';
import { useSession } from '@/lib/store/session';
import { borders, candy, canvas, ink } from '@/lib/theme';

function durationLabel(min: number): string {
  if (min < 60) return `${min} min`;
  if (min % 60 === 0) return `${min / 60} h`;
  return `${Math.floor(min / 60)}½ h`;
}

export default function RevealScreen() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { finalIdea, runnerUp, reset } = useSession();
  const [opened, setOpened] = useState(false);
  // Local copy so "Maybe another" can swap without touching the store.
  const [idea, setIdea] = useState(finalIdea);
  const [rerolled, setRerolled] = useState(false);

  if (!idea) {
    return <Redirect href="/" />;
  }

  const daypart = daypartWord();
  const color = candy.teal;

  const handleOpened = () => {
    setOpened(true);
    hapticReveal();
    playRevealMelody();
  };

  const letsDoIt = () => {
    createMoment(idea);
    reset();
    router.replace('/');
  };

  const maybeAnother = () => {
    if (!runnerUp || rerolled) return;
    playDealIn();
    setIdea(runnerUp);
    setRerolled(true);
  };

  const notTonight = () => {
    reset();
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safe}>
      {opened ? (
        <>
          <ScrollView contentContainerStyle={styles.revealContainer}>
            <Animated.Text
              entering={reduceMotion ? FadeIn : FadeInUp.springify()}
              style={styles.revealTitle}
            >
              Your {daypart}, brewed ✨
            </Animated.Text>

            <Animated.View
              key={idea.id}
              entering={reduceMotion ? FadeIn : FadeInUp.delay(250).springify().damping(13)}
              style={[styles.ideaCard, { backgroundColor: color.fill, borderColor: color.border }]}
            >
              <Text style={styles.ideaIcon}>{iconEmoji(idea.icon)}</Text>
              <Text style={[styles.ideaTitle, { color: color.text }]}>{idea.title}</Text>
              <Text style={[styles.ideaTip, { color: color.text }]}>{idea.description}</Text>
              <View style={styles.chipRow}>
                <View style={[styles.chip, { borderColor: color.border }]}>
                  <Text style={[styles.chipText, { color: color.text }]}>
                    {durationLabel(idea.durationMin)}
                  </Text>
                </View>
                <View style={[styles.chip, { borderColor: color.border }]}>
                  <Text style={[styles.chipText, { color: color.text }]}>
                    {idea.costTier === 0 ? 'free' : '$'.repeat(idea.costTier)}
                  </Text>
                </View>
              </View>
            </Animated.View>

            <Animated.View
              entering={reduceMotion ? FadeIn : FadeInUp.delay(600).springify()}
              style={styles.buttons}
            >
              <BigButton label="Let's do it! 🎉" onPress={letsDoIt} breathe />
              {runnerUp && !rerolled && (
                <BigButton label="Maybe another" variant="ghost" onPress={maybeAnother} />
              )}
              <Pressable
                accessibilityRole="button"
                onPress={notTonight}
                style={({ pressed }) => [styles.notTonight, pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.notTonightText}>Not tonight</Text>
              </Pressable>
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
  revealContainer: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 20,
  },
  revealTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: ink,
    textAlign: 'center',
  },
  ideaCard: {
    borderWidth: borders.width,
    borderRadius: borders.radius,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  ideaIcon: {
    fontSize: 64,
  },
  ideaTitle: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 30,
  },
  ideaTip: {
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    opacity: 0.9,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  buttons: {
    gap: 10,
  },
  notTonight: {
    alignSelf: 'center',
    padding: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  notTonightText: {
    fontSize: 14,
    fontWeight: '600',
    color: ink,
    opacity: 0.5,
  },
});
