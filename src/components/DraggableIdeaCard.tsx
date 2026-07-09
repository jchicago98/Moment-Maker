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

import { IconHalo } from '@/components/IconHalo';
import { playPickup, playThrowLock, playTick } from '@/lib/audio/soundEngine';
import { hapticPickup, hapticThrow } from '@/lib/haptics';
import { iconEmoji } from '@/lib/icons';
import { borders, ink, softShadow, surface } from '@/lib/theme';
import type { Idea } from '@/lib/types';

// Lock-in thresholds (CLAUDE.md §5.3): velocity OR displacement wins.
const THROW_VELOCITY = 900; // px/s
const THROW_DISTANCE = 120; // pt
const FLY_DISTANCE = 1000; // px, comfortably off any screen
const MAX_TICK_SPEED = 2500; // px/s ≈ intensity 1.0

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

function pickupFeedback(): void {
  playPickup();
  hapticPickup();
}

function lockFeedback(intensity: number): void {
  playThrowLock(intensity);
  hapticThrow(intensity);
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
  const lastTick = useSharedValue(0);

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
      runOnJS(pickupFeedback)();
    })
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY;

      // Marimba ticks: rate and pitch scale with drag velocity — sparse low
      // plinks for slow drags, a rapid rising flurry for confident flings.
      const speed = Math.hypot(e.velocityX, e.velocityY);
      const interval = Math.max(70, 400 - speed * 0.15);
      const now = Date.now();
      if (now - lastTick.value > interval) {
        lastTick.value = now;
        runOnJS(playTick)(Math.min(1, speed / MAX_TICK_SPEED));
      }
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
        const intensity = Math.min(1, speed / MAX_TICK_SPEED);
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
        { scale: withSpring(held.value ? 1.05 : 1, { damping: 14, stiffness: 200 }) },
      ],
    };
  });

  // Minimal face: halo + name. Everything else lives in the detail modal.
  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${idea.title}. Tap to read more, throw off screen to pick.`}
        style={[styles.card, animatedStyle]}
      >
        <IconHalo emoji={iconEmoji(idea.icon)} size="m" />
        <Text style={styles.title} numberOfLines={2}>
          {idea.title}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '74%',
    backgroundColor: surface,
    borderRadius: borders.radius,
    paddingVertical: 20,
    paddingHorizontal: 18,
    alignItems: 'center',
    gap: 12,
    ...softShadow,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    color: ink,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
