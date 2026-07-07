import * as Haptics from 'expo-haptics';
import { Redirect, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrewMeter } from '@/components/BrewMeter';
import { IdeaCard } from '@/components/IdeaCard';
import { VsBadge } from '@/components/VsBadge';
import { daypartWord } from '@/lib/daypart';
import { useSession } from '@/lib/store/session';
import { borders, candyOrder, canvas, cardTilt, ink } from '@/lib/theme';
import type { Idea } from '@/lib/types';

export default function PickerScreen() {
  const router = useRouter();
  const { pairs, round, pick, surpriseMe } = useSession();

  if (pairs.length === 0) {
    return <Redirect href="/" />;
  }

  // Round can briefly equal pairs.length after the final pick, before navigation.
  const pair = pairs[Math.min(round, pairs.length - 1)];
  const [ideaA, ideaB] = pair;
  const colorA = candyOrder[round % candyOrder.length];
  const colorB = candyOrder[(round + 2) % candyOrder.length];

  const handlePick = (winner: Idea, loser: Idea) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const isLast = round + 1 >= pairs.length;
    pick(winner, loser);
    if (isLast) router.replace('/reveal');
  };

  const handleSurprise = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    surpriseMe();
    router.replace('/reveal');
  };

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

      <Text style={styles.prompt}>Tap the one that sparks joy</Text>

      <View style={styles.arena}>
        <Animated.View
          key={`${round}-a`}
          entering={FadeInDown.springify().damping(14)}
          style={styles.cardA}
        >
          <IdeaCard idea={ideaA} color={colorA} tilt={-cardTilt} onPick={() => handlePick(ideaA, ideaB)} />
        </Animated.View>

        <View style={styles.vsWrap}>
          <VsBadge />
        </View>

        <Animated.View
          key={`${round}-b`}
          entering={FadeInDown.delay(120).springify().damping(14)}
          style={styles.cardB}
        >
          <IdeaCard idea={ideaB} color={colorB} tilt={cardTilt} onPick={() => handlePick(ideaB, ideaA)} />
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
