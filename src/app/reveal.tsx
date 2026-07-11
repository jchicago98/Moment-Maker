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
import { IdeaEtching } from '@/components/IdeaEtching';
import { ScheduleSheet } from '@/components/ScheduleSheet';
import { playDealIn, playGiftKnock, playRevealMelody } from '@/lib/audio/soundEngine';
import { daypartWord } from '@/lib/daypart';
import { hapticReveal } from '@/lib/haptics';
import { createMoment } from '@/lib/momentActions';
import { useSession } from '@/lib/store/session';
import { accent, borders, capsLabel, fonts, ideaHue, ink, inkHead, inkSoft, line, surface } from '@/lib/theme';

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
  const [scheduling, setScheduling] = useState(false);

  if (!idea) {
    return <Redirect href="/" />;
  }

  const daypart = daypartWord();

  const handleOpened = () => {
    setOpened(true);
    hapticReveal();
    playRevealMelody();
  };

  // "Let's do it" → pick a date & time, then it becomes the pending moment.
  const confirmSchedule = (date: Date | null) => {
    setScheduling(false);
    createMoment(idea, date);
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
              style={capsLabel}
            >
              The evening edition
            </Animated.Text>

            <Animated.View
              key={idea.id}
              entering={reduceMotion ? FadeIn : FadeInUp.delay(250).springify().damping(13)}
              style={styles.ideaCard}
            >
              <IdeaEtching icon={idea.icon} hue={ideaHue(idea.moods)} size={180} opacity={0.11} />
              <Text style={[styles.meta, { color: ideaHue(idea.moods) }]}>
                {idea.moods.join(' · ')} · {durationLabel(idea.durationMin)} ·{' '}
                {idea.costTier === 0 ? 'free' : '$'.repeat(idea.costTier)}
              </Text>
              <Text style={styles.ideaTitle}>{idea.title}</Text>
              <View style={styles.cardRule} />
              <Text style={styles.ideaTip}>{idea.description}</Text>
            </Animated.View>

            <Animated.View
              entering={reduceMotion ? FadeIn : FadeInUp.delay(600).springify()}
              style={styles.buttons}
            >
              <BigButton label="Let's do it" onPress={() => setScheduling(true)} />
              {runnerUp && !rerolled && (
                <BigButton label="Maybe another" variant="ghost" onPress={maybeAnother} />
              )}
              <Pressable
                accessibilityRole="button"
                onPress={notTonight}
                style={({ pressed }) => [styles.notTonight, pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.notTonightText}>not tonight</Text>
              </Pressable>
            </Animated.View>
          </ScrollView>
          {!reduceMotion && <ConfettiBurst />}
          <ScheduleSheet
            visible={scheduling}
            ideaTitle={idea.title}
            onConfirm={confirmSchedule}
            onClose={() => setScheduling(false)}
          />
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
        withTiming(1.05, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
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
    playGiftKnock(); // 3–4 quick knocks — the gift knocking from inside

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
      <Text style={styles.readyTitle}>Your {daypart} is ready.</Text>
      <Animated.Text style={[styles.gift, giftStyle]}>🎁</Animated.Text>
      <Text style={styles.tapHint}>tap to open</Text>
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
    borderWidth: 1,
    borderColor: line,
    backgroundColor: surface,
    borderRadius: borders.radius,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  brewedText: {
    ...capsLabel,
    color: accent,
  },
  readyTitle: {
    fontFamily: fonts.serif,
    fontSize: 30,
    lineHeight: 37,
    color: inkHead,
    textAlign: 'center',
  },
  gift: {
    fontSize: 100,
    marginVertical: 12,
  },
  tapHint: {
    fontFamily: fonts.serifItalic,
    fontSize: 14,
    color: inkSoft,
  },
  revealContainer: {
    flexGrow: 1,
    padding: 26,
    justifyContent: 'center',
    gap: 18,
  },
  ideaCard: {
    backgroundColor: surface,
    borderWidth: 1,
    borderColor: line,
    borderRadius: borders.radius,
    padding: 24,
    gap: 10,
    overflow: 'hidden', // crops the etching at the card edge
  },
  meta: {
    ...capsLabel,
    fontSize: 10.5,
  },
  ideaTitle: {
    fontFamily: fonts.serif,
    fontSize: 29,
    lineHeight: 36,
    color: inkHead,
  },
  cardRule: {
    borderTopWidth: 1,
    borderTopColor: line,
  },
  ideaTip: {
    fontFamily: fonts.serifItalic,
    fontSize: 16,
    lineHeight: 25,
    color: ink,
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
    fontSize: 13,
    fontWeight: '600',
    color: inkSoft,
    letterSpacing: 0.3,
  },
});
