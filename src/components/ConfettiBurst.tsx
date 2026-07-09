import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

// Muted celebration set: ember, cream, old gold, warm gray.
const PIECE_COLORS = ['#C25B4E', '#EAE3D6', '#A98850', '#96897A'];

interface PieceConfig {
  angle: number; // radians, mostly upward
  distance: number;
  rotation: number; // total degrees over the flight
  width: number;
  height: number;
  color: string;
  round: boolean;
}

interface Props {
  count?: number;
  durationMs?: number;
}

/**
 * A one-shot confetti burst from the center of its (absolute-fill) container.
 * Pieces fly outward, tumble, arc down under gravity, and fade — driven by a
 * single shared progress value on the UI thread.
 */
export function ConfettiBurst({ count = 28, durationMs = 1300 }: Props) {
  // Randomized one-shot burst: piece configs are deliberately impure and the
  // progress shared value is mutated on mount — opt out of the compiler.
  'use no memo';
  const progress = useSharedValue(0);

  const pieces = useMemo<PieceConfig[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        angle: -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.5,
        distance: 110 + Math.random() * 190,
        rotation: (Math.random() - 0.5) * 900,
        width: 7 + Math.random() * 6,
        height: 5 + Math.random() * 9,
        color: PIECE_COLORS[i % PIECE_COLORS.length],
        round: i % 4 === 0,
      })),
    [count]
  );

  useEffect(() => {
    progress.value = withTiming(1, { duration: durationMs, easing: Easing.out(Easing.quad) });
  }, [progress, durationMs]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={styles.origin}>
        {pieces.map((piece, i) => (
          <Piece key={i} config={piece} progress={progress} />
        ))}
      </View>
    </View>
  );
}

function Piece({ config, progress }: { config: PieceConfig; progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const p = progress.value;
    const x = Math.cos(config.angle) * config.distance * p;
    const y = Math.sin(config.angle) * config.distance * p + 320 * p * p; // gravity
    return {
      opacity: interpolate(p, [0, 0.65, 1], [1, 1, 0]),
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${config.rotation * p}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: config.width,
          height: config.height,
          borderRadius: config.round ? config.width / 2 : 2,
          backgroundColor: config.color,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  origin: {
    position: 'absolute',
    top: '38%',
    left: '50%',
    width: 1,
    height: 1,
  },
});
