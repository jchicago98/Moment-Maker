import { Redirect, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrewMeter } from '@/components/BrewMeter';
import { DraggableIdeaCard } from '@/components/DraggableIdeaCard';
import { VsBadge } from '@/components/VsBadge';
import { playDealIn, playThrowLock } from '@/lib/audio/soundEngine';
import { daypartWord } from '@/lib/daypart';
import { hapticThrow } from '@/lib/haptics';
import { useSession } from '@/lib/store/session';
import { borders, candyOrder, canvas, cardTilt, ink } from '@/lib/theme';
import type { Idea } from '@/lib/types';

// How long the losing card's fade and the winner's flight get to breathe
// before the next pair deals in.
const RESOLVE_MS = 300;

export default function PickerScreen() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { pairs, round, pick, surpriseMe } = useSession();
  const [pendingWinner, setPendingWinner] = useState<Idea | null>(null);
  const resolveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resolving = pendingWinner !== null;

  useEffect(() => {
    if (pairs.length > 0 && round < pairs.length) playDealIn();
  }, [round, pairs.length]);

  useEffect(() => {
    return () => {
      if (resolveTimer.current) clearTimeout(resolveTimer.current);
    };
  }, []);

  if (pairs.length === 0) {
    return <Redirect href="/" />;
  }

  // Round can briefly equal pairs.length after the final pick, before navigation.
  const pair = pairs[Math.min(round, pairs.length - 1)];
  const [ideaA, ideaB] = pair;
  const colorA = candyOrder[round % candyOrder.length];
  const colorB = candyOrder[(round + 2) % candyOrder.length];

  const handlePick = (winner: Idea, loser: Idea, throwVelocity: number) => {
    if (resolving) return;
    setPendingWinner(winner);
    const isLast = round + 1 >= pairs.length;
    resolveTimer.current = setTimeout(() => {
      pick(winner, loser, throwVelocity);
      if (isLast) {
        router.replace('/reveal');
      } else {
        setPendingWinner(null);
      }
    }, RESOLVE_MS);
  };

  const handleSurprise = () => {
    if (resolving) return;
    playThrowLock(0.5);
    hapticThrow(0.5);
    surpriseMe();
    router.replace('/reveal');
  };

  const resolutionFor = (idea: Idea) => {
    if (!pendingWinner) return null;
    return pendingWinner.id === idea.id ? 'winner' : 'loser';
  };

  const dealIn = reduceMotion ? FadeIn : FadeInDown.springify().damping(14);
  const dealInDelayed = reduceMotion ? FadeIn : FadeInDown.delay(120).springify().damping(14);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.roundBadge}>
          <Text style={styles.roundText}>
            {Math.min(round + 1, pairs.length)} / {pairs.length}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Just surprise me"
          onPress={handleSurprise}
          style={({ pressed }) => [styles.surprisePill, pressed && { transform: [{ scale: 0.96 }] }]}
        >
          <Text style={styles.surpriseText}>🎲 Just surprise me</Text>
        </Pressable>
      </View>

      <Text style={styles.prompt}>
        {reduceMotion ? 'Tap the one that sparks joy' : 'Throw one to pick!'}
      </Text>

      <View style={styles.arena}>
        <Animated.View key={`${round}-a`} entering={dealIn} style={styles.cardA}>
          <DraggableIdeaCard
            idea={ideaA}
            color={colorA}
            tilt={-cardTilt}
            side="top"
            resolution={resolutionFor(ideaA)}
            dragEnabled={!resolving && !reduceMotion}
            reduceMotion={reduceMotion}
            onPick={(velocity) => handlePick(ideaA, ideaB, velocity)}
          />
        </Animated.View>

        <View style={styles.vsWrap}>
          <VsBadge />
        </View>

        <Animated.View key={`${round}-b`} entering={dealInDelayed} style={styles.cardB}>
          <DraggableIdeaCard
            idea={ideaB}
            color={colorB}
            tilt={cardTilt}
            side="bottom"
            resolution={resolutionFor(ideaB)}
            dragEnabled={!resolving && !reduceMotion}
            reduceMotion={reduceMotion}
            onPick={(velocity) => handlePick(ideaB, ideaA, velocity)}
          />
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <BrewMeter progress={round / pairs.length} daypart={daypartWord()} />
      </View>
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
    alignItems: 'center',
    marginTop: 8,
  },
  roundBadge: {
    backgroundColor: ink,
    borderRadius: borders.radiusSmall,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  roundText: {
    color: canvas,
    fontWeight: '900',
    fontSize: 15,
  },
  surprisePill: {
    borderWidth: borders.width,
    borderColor: ink,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: canvas,
    minHeight: 44,
    justifyContent: 'center',
  },
  surpriseText: {
    fontWeight: '700',
    color: ink,
    fontSize: 14,
  },
  prompt: {
    textAlign: 'center',
    color: ink,
    opacity: 0.65,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 14,
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
  footer: {
    paddingBottom: 12,
  },
});
