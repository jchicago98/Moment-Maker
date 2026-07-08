import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton } from '@/components/BigButton';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import { daypartWord } from '@/lib/daypart';
import { getPendingMoment, hasProfile, type MomentWithIdea } from '@/lib/db/database';
import { hapticReveal } from '@/lib/haptics';
import { iconEmoji } from '@/lib/icons';
import {
  confirmMoment,
  dismissMoment,
  pickAndAttachPhoto,
  rateMoment,
  readyToAsk,
} from '@/lib/momentActions';
import { borders, candy, ink } from '@/lib/theme';

function greeting(): string {
  const daypart = daypartWord();
  if (daypart === 'night') return 'Up late? ✨';
  return `Good ${daypart} ✨`;
}

export default function HomeScreen() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [pending, setPending] = useState<MomentWithIdea | null>(null);
  // After "We did it!": a short celebration state with stars + photo.
  const [celebrating, setCelebrating] = useState<MomentWithIdea | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [hasPhoto, setHasPhoto] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setPending(getPendingMoment());
      setCelebrating(null);
      setRating(null);
      setHasPhoto(false);
    }, [])
  );

  if (!hasProfile()) {
    return <Redirect href="/onboarding" />;
  }

  const weDidIt = () => {
    if (!pending) return;
    confirmMoment(pending.moment.id);
    hapticReveal();
    setCelebrating(pending);
    setPending(null);
  };

  const notThisTime = () => {
    if (!pending) return;
    dismissMoment(pending.moment.id);
    setPending(null);
  };

  const rate = (stars: 1 | 2 | 3 | 4 | 5) => {
    if (!celebrating) return;
    rateMoment(celebrating.moment.id, stars);
    hapticReveal();
    setRating(stars);
  };

  const addPhoto = async () => {
    if (!celebrating) return;
    if (await pickAndAttachPhoto(celebrating.moment.id)) setHasPhoto(true);
  };

  const asking = pending !== null && readyToAsk(pending.moment);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.greeting}>{greeting()}</Text>

        {celebrating ? (
          <View style={[styles.momentCard, styles.doneCard]}>
            <Text style={styles.momentIcon}>{iconEmoji(celebrating.idea.icon)}</Text>
            <Text style={styles.momentTitle}>Stamped into your scrapbook! 🎉</Text>
            <Text style={styles.momentTip}>{rating ? 'A moment well made.' : 'How was it?'}</Text>
            <View style={styles.starRow}>
              {([1, 2, 3, 4, 5] as const).map((stars) => (
                <Pressable
                  key={stars}
                  accessibilityRole="button"
                  accessibilityLabel={`Rate ${stars} star${stars > 1 ? 's' : ''}`}
                  onPress={() => rate(stars)}
                  style={styles.star}
                >
                  <Text style={[styles.starText, !(rating && stars <= rating) && styles.starDim]}>
                    ⭐
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={addPhoto}
              style={({ pressed }) => [styles.photoButton, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.photoButtonText}>
                {hasPhoto ? '📷 photo saved!' : '📷 add a photo'}
              </Text>
            </Pressable>
          </View>
        ) : pending ? (
          <>
            <View style={[styles.momentCard, asking && styles.askCard]}>
              <Text style={styles.momentLabel}>
                {asking ? 'Checking in…' : "Tonight's moment"}
              </Text>
              <Text style={styles.momentIcon}>{iconEmoji(pending.idea.icon)}</Text>
              <Text style={styles.momentTitle}>
                {asking ? `So… did "${pending.idea.title}" happen?` : pending.idea.title}
              </Text>
              <Text style={styles.momentTip}>{pending.idea.description}</Text>
              {asking && (
                <View style={styles.askButtons}>
                  <BigButton label="We did it! 🎉" onPress={weDidIt} />
                  <BigButton label="Not this time 💤" variant="ghost" onPress={notThisTime} />
                </View>
              )}
            </View>
            {!asking && (
              <Pressable
                accessibilityRole="button"
                onPress={notThisTime}
                style={({ pressed }) => [styles.smallLink, pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.smallLinkText}>brew something else</Text>
              </Pressable>
            )}
          </>
        ) : (
          <View style={styles.prompt}>
            <Text style={styles.promptTitle}>What should we do today?</Text>
            <View style={styles.promptButtons}>
              <BigButton label="Help me pick 🃏" onPress={() => router.push('/setup')} breathe />
              <BigButton
                label="I'll browse 🧭"
                variant="ghost"
                onPress={() => router.navigate('/browse')}
              />
            </View>
          </View>
        )}
      </View>
      {celebrating && !reduceMotion && <ConfettiBurst />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 20,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '800',
    color: ink,
    opacity: 0.6,
    textAlign: 'center',
  },
  prompt: {
    gap: 24,
  },
  promptTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: ink,
    textAlign: 'center',
    lineHeight: 42,
  },
  promptButtons: {
    gap: 12,
  },
  momentCard: {
    borderWidth: borders.width,
    borderColor: candy.purple.border,
    backgroundColor: candy.purple.fill,
    borderRadius: borders.radius,
    padding: 22,
    alignItems: 'center',
    gap: 8,
  },
  askCard: {
    borderColor: candy.amber.border,
    backgroundColor: candy.amber.fill,
  },
  doneCard: {
    borderColor: candy.teal.border,
    backgroundColor: candy.teal.fill,
  },
  momentLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: ink,
    opacity: 0.6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  momentIcon: {
    fontSize: 54,
  },
  momentTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: ink,
    textAlign: 'center',
    lineHeight: 28,
  },
  momentTip: {
    fontSize: 14,
    color: ink,
    opacity: 0.75,
    textAlign: 'center',
    lineHeight: 19,
  },
  askButtons: {
    alignSelf: 'stretch',
    gap: 10,
    marginTop: 8,
  },
  smallLink: {
    alignSelf: 'center',
    padding: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  smallLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: ink,
    opacity: 0.5,
  },
  starRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  star: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starText: {
    fontSize: 24,
  },
  starDim: {
    opacity: 0.3,
  },
  photoButton: {
    borderWidth: 2,
    borderColor: candy.teal.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  photoButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: candy.teal.text,
  },
});
