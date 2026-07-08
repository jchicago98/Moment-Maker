import { StyleSheet, Text, View } from 'react-native';
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

import { playPickup, playThrowLock, playTick } from '@/lib/audio/soundEngine';
import { hapticPickup, hapticThrow } from '@/lib/haptics';
import { iconEmoji } from '@/lib/icons';
import { borders, type CandyColor } from '@/lib/theme';
import type { Idea } from '@/lib/types';

// Lock-in thresholds (CLAUDE.md §5.3): velocity OR displacement wins.
const THROW_VELOCITY = 900; // px/s
const THROW_DISTANCE = 120; // pt
const FLY_DISTANCE = 1000; // px, comfortably off any screen
const MAX_TICK_SPEED = 2500; // px/s ≈ intensity 1.0

export type CardResolution = 'winner' | 'loser' | null;

interface Props {
  idea: Idea;
  color: CandyColor;
  tilt: number; // static deal tilt, degrees
  side: 'top' | 'bottom';
  resolution: CardResolution;
  dragEnabled: boolean;
  reduceMotion: boolean;
  /** Live weather chip ("72° clear"), shown on outdoor ideas only. */
  weatherChip?: string | null;
  /** Fired once when this card is locked in (thrown or tapped). */
  onPick: (throwVelocity: number) => void;
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
  color,
  tilt,
  side,
  resolution,
  dragEnabled,
  reduceMotion,
  weatherChip,
  onPick,
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
      runOnJS(lockFeedback)(0.4);
      runOnJS(onPick)(0);
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

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        accessible
        accessibilityRole="button"
        accessibilityLabel={`Pick ${idea.title}. Throw it off screen or tap to choose.`}
        style={[styles.card, { backgroundColor: color.fill, borderColor: color.border }, animatedStyle]}
      >
        <Text style={styles.icon}>{iconEmoji(idea.icon)}</Text>
        <Text style={[styles.title, { color: color.text }]}>{idea.title}</Text>
        <Text style={[styles.description, { color: color.text }]} numberOfLines={2}>
          {idea.description}
        </Text>
        <View style={styles.chipRow}>
          <View style={[styles.chip, { borderColor: color.border }]}>
            <Text style={[styles.chipText, { color: color.text }]}>
              {durationLabel(idea.durationMin)}
            </Text>
          </View>
          <View style={[styles.chip, { borderColor: color.border }]}>
            <Text style={[styles.chipText, { color: color.text }]}>{costLabel(idea.costTier)}</Text>
          </View>
          {idea.setting === 'outdoor' && weatherChip && (
            <View style={[styles.chip, { borderColor: color.border }]}>
              <Text style={[styles.chipText, { color: color.text }]}>{weatherChip}</Text>
            </View>
          )}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

function durationLabel(min: number): string {
  if (min < 60) return `${min} min`;
  if (min % 60 === 0) return `${min / 60} h`;
  return `${Math.floor(min / 60)}½ h`;
}

function costLabel(tier: number): string {
  return tier === 0 ? 'free' : '$'.repeat(tier);
}

const styles = StyleSheet.create({
  card: {
    width: '78%',
    borderWidth: borders.width,
    borderRadius: borders.radius,
    padding: 18,
    gap: 6,
  },
  icon: {
    fontSize: 44,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 25,
  },
  description: {
    fontSize: 14,
    lineHeight: 19,
    opacity: 0.85,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
