import { Redirect, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrewMeter } from '@/components/BrewMeter';
import { DraggableIdeaCard } from '@/components/DraggableIdeaCard';
import { IdeaDetailModal } from '@/components/IdeaDetailModal';
import { playDealIn, playThrowLock } from '@/lib/audio/soundEngine';
import { hapticThrow } from '@/lib/haptics';
import { useSession } from '@/lib/store/session';
import { accent, cardTilt, fonts, inkFaint, inkSoft } from '@/lib/theme';
import type { Idea } from '@/lib/types';

// How long the losing card's fade and the winner's flight get to breathe
// before the next pair deals in.
const RESOLVE_MS = 300;

export default function PickerScreen() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { currentPair, round, totalRounds, pick, surpriseMe } = useSession();
  const [pendingWinner, setPendingWinner] = useState<Idea | null>(null);
  const [inspecting, setInspecting] = useState<Idea | null>(null);
  const resolveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resolving = pendingWinner !== null;

  useEffect(() => {
    if (currentPair) playDealIn();
  }, [round, currentPair]);

  useEffect(() => {
    return () => {
      if (resolveTimer.current) clearTimeout(resolveTimer.current);
    };
  }, []);

  if (!currentPair) {
    return <Redirect href="/" />;
  }

  const [ideaA, ideaB] = currentPair;

  const handlePick = (winner: Idea, loser: Idea, throwVelocity: number) => {
    if (resolving) return;
    setPendingWinner(winner);
    resolveTimer.current = setTimeout(() => {
      // Synchronous: logs the event, updates the profile, computes the next
      // most informative pair (or generates the final idea after round 5).
      pick(winner, loser, throwVelocity);
      if (useSession.getState().finalIdea) {
        router.replace('/reveal');
      } else {
        setPendingWinner(null);
      }
    }, RESOLVE_MS);
  };

  const inspect = (idea: Idea) => {
    if (resolving) return;
    setInspecting(idea);
  };

  const pickFromModal = () => {
    if (!inspecting) return;
    const winner = inspecting;
    const loser = winner.id === ideaA.id ? ideaB : ideaA;
    setInspecting(null);
    playThrowLock(0.4);
    hapticThrow(0.4);
    handlePick(winner, loser, 0);
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
        <BrewMeter round={round} totalRounds={totalRounds} />
      </View>

      <View style={styles.arena}>
        <Animated.View key={`${round}-a`} entering={dealIn} style={styles.cardA}>
          <DraggableIdeaCard
            idea={ideaA}
            tilt={-cardTilt}
            side="top"
            resolution={resolutionFor(ideaA)}
            dragEnabled={!resolving && !reduceMotion}
            reduceMotion={reduceMotion}
            onPick={(velocity) => handlePick(ideaA, ideaB, velocity)}
            onInspect={() => inspect(ideaA)}
          />
        </Animated.View>

        <Text style={styles.or}>— or —</Text>

        <Animated.View key={`${round}-b`} entering={dealInDelayed} style={styles.cardB}>
          <DraggableIdeaCard
            idea={ideaB}
            tilt={cardTilt}
            side="bottom"
            resolution={resolutionFor(ideaB)}
            dragEnabled={!resolving && !reduceMotion}
            reduceMotion={reduceMotion}
            onPick={(velocity) => handlePick(ideaB, ideaA, velocity)}
            onInspect={() => inspect(ideaB)}
          />
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.hint}>
          {reduceMotion ? 'tap a card to read it and pick' : 'tap to read · throw to choose'}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Just surprise me"
          onPress={handleSurprise}
          style={({ pressed }) => [styles.surprise, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.surpriseText}>or let us surprise you →</Text>
        </Pressable>
      </View>

      <IdeaDetailModal
        idea={inspecting}
        actionLabel="Pick this one"
        onAction={pickFromModal}
        onClose={() => setInspecting(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    marginTop: 16,
  },
  arena: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  cardA: {
    alignItems: 'flex-start',
  },
  cardB: {
    alignItems: 'flex-end',
  },
  or: {
    fontFamily: fonts.serifItalic,
    fontSize: 14,
    color: inkFaint,
    textAlign: 'center',
    marginVertical: 4,
  },
  footer: {
    alignItems: 'center',
    gap: 2,
    paddingBottom: 16,
  },
  hint: {
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    color: inkSoft,
  },
  surprise: {
    minHeight: 44,
    justifyContent: 'center',
  },
  surpriseText: {
    fontSize: 13,
    fontWeight: '600',
    color: accent,
    letterSpacing: 0.3,
  },
});
