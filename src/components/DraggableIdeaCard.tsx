import { StyleSheet, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { IdeaEtching } from '@/components/IdeaEtching';
import { playThrowLock } from '@/lib/audio/soundEngine';
import { hapticPickup, hapticThrow } from '@/lib/haptics';
import { borders, capsLabel, fonts, ideaHue, inkHead, inkSoft, line, surface } from '@/lib/theme';
import type { Idea } from '@/lib/types';

// Lock-in thresholds (CLAUDE.md §5.3): velocity OR displacement wins.
const THROW_VELOCITY = 900; // px/s
const THROW_DISTANCE = 120; // pt
const FLY_DISTANCE = 1000; // px, comfortably off any screen
const MAX_THROW_SPEED = 2500; // px/s ≈ intensity 1.0

export type CardResolution = 'winner' | 'loser' | null;

interface Props {
  idea: Idea;
  tilt: number; // static deal tilt, degrees
  side: 'top' | 'bottom';
  resolution: CardResolution;
  dragEnabled: boolean;
  reduceMotion: boolean;
  /** Fired once when this card is locked in by a throw. */
  onPick: (throwVelocity: number) => void;
  /** Tap = peek: opens the detail view (picking happens there or by throw). */
  onInspect: () => void;
}

function lockFeedback(intensity: number): void {
  playThrowLock(intensity);
  hapticThrow(intensity);
}

function durationLabel(min: number): string {
  if (min < 60) return `${min} min`;
  if (min % 60 === 0) return `${min / 60} h`;
  return `${Math.floor(min / 60)}½ h`;
}

function categoryLine(idea: Idea): string {
  const cost = idea.costTier === 0 ? 'free' : '$'.repeat(idea.costTier);
  return `${idea.moods[0]} · ${durationLabel(idea.durationMin)} · ${cost}`;
}

export function DraggableIdeaCard({
  idea,
  tilt,
  side,
  resolution,
  dragEnabled,
  reduceMotion,
  onPick,
  onInspect,
}: Props) {
  // Reanimated gesture worklets mutate shared values from render-scoped
  // closures — a pattern the React Compiler can't reason about. Opt out.
  'use no memo';
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const held = useSharedValue(false);
  const flew = useSharedValue(false);
  const opacity = useSharedValue(1);

  // Parent resolves the round: the loser fades; a tap-picked winner still
  // gets its little victory flight (unless motion is reduced).
  useEffect(() => {
    if (resolution === 'loser') {
      opacity.value = withTiming(0, { duration: 220 });
    } else if (resolution === 'winner' && !flew.value) {
      if (reduceMotion) {
        opacity.value = withTiming(0, { duration: 220 });
      } else {
        flew.value = true;
        const dir = side === 'top' ? -1 : 1;
        tx.value = withTiming(dir * FLY_DISTANCE * 0.8, {
          duration: 260,
          easing: Easing.in(Easing.quad),
        });
        ty.value = withTiming(dir * FLY_DISTANCE * 0.4, {
          duration: 260,
          easing: Easing.in(Easing.quad),
        });
      }
    }
  }, [resolution, reduceMotion, side, opacity, flew, tx, ty]);

  const pan = Gesture.Pan()
    .enabled(dragEnabled)
    .minDistance(8)
    .onBegin(() => {
      held.value = true;
      // Dragging is silent — a light haptic is the only pickup feedback.
      runOnJS(hapticPickup)();
    })
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY;
    })
    .onEnd((e) => {
      const speed = Math.hypot(e.velocityX, e.velocityY);
      const displacement = Math.hypot(tx.value, ty.value);

      if (speed > THROW_VELOCITY || displacement > THROW_DISTANCE) {
        // Locked in — fling it off-screen along the throw direction.
        flew.value = true;
        const useVelocity = speed > 200;
        const nx = (useVelocity ? e.velocityX / speed : tx.value / displacement) || 0;
        const ny = (useVelocity ? e.velocityY / speed : ty.value / displacement) || 1;
        tx.value = withTiming(nx * FLY_DISTANCE, { duration: 220, easing: Easing.out(Easing.quad) });
        ty.value = withTiming(ny * FLY_DISTANCE, { duration: 220, easing: Easing.out(Easing.quad) });
        const intensity = Math.min(1, speed / MAX_THROW_SPEED);
        runOnJS(lockFeedback)(intensity);
        runOnJS(onPick)(speed);
      } else {
        // Gentle release — spring home with a bounce.
        tx.value = withSpring(0, { damping: 12, stiffness: 160 });
        ty.value = withSpring(0, { damping: 12, stiffness: 160 });
      }
    })
    .onFinalize(() => {
      held.value = false;
    });

  const tap = Gesture.Tap().onEnd((_e, success) => {
    if (success) {
      runOnJS(onInspect)();
    }
  });

  const gesture = Gesture.Race(pan, tap);

  const animatedStyle = useAnimatedStyle(() => {
    // A touch of live rotation while dragging keeps the card feeling physical;
    // stay within the ±5° legibility budget plus a small drag allowance.
    const dragTilt = Math.max(-8, Math.min(8, tx.value / 30));
    return {
      opacity: opacity.value,
      zIndex: held.value ? 10 : 1,
      transform: [
        { translateX: tx.value },
        { translateY: ty.value },
        { rotate: `${tilt + dragTilt}deg` },
        { scale: withSpring(held.value ? 1.04 : 1, { damping: 14, stiffness: 200 }) },
      ],
    };
  });

  // Editorial face: the idea's own etching ghosted in its mood ink, category
  // line in the same ink, serif title, italic one-liner. Details live in the
  // tap-to-peek modal.
  const hue = ideaHue(idea.moods);
  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${idea.title}. Tap to read more, throw off screen to pick.`}
        style={[styles.card, animatedStyle]}
      >
        <IdeaEtching icon={idea.icon} hue={hue} size={120} />
        <Text style={[styles.category, { color: hue }]}>{categoryLine(idea)}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {idea.title}
        </Text>
        <Text style={styles.desc} numberOfLines={1}>
          {idea.description}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '80%',
    backgroundColor: surface,
    borderWidth: 1,
    borderColor: line,
    borderRadius: borders.radius,
    paddingVertical: 18,
    paddingHorizontal: 18,
    gap: 7,
    overflow: 'hidden', // crops the etching at the card edge
  },
  category: {
    ...capsLabel,
    fontSize: 10.5,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 21,
    lineHeight: 26,
    color: inkHead,
  },
  desc: {
    fontFamily: fonts.serifItalic,
    fontSize: 13.5,
    color: inkSoft,
  },
});
