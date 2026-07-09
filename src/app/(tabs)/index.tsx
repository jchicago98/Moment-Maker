import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton } from '@/components/BigButton';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import { IconHalo } from '@/components/IconHalo';
import { ScheduleSheet } from '@/components/ScheduleSheet';
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
  rescheduleMoment,
} from '@/lib/momentActions';
import { accent, borders, daypartEmoji, daypartOf, ink, inkSoft, softShadow, surface } from '@/lib/theme';
import { currentChip } from '@/lib/weather';

function greeting(): string {
  const daypart = daypartWord();
  if (daypart === 'night') return 'Up late?';
  return `Good ${daypart}`;
}

function scheduleLine(scheduledFor?: string): string {
  if (!scheduledFor) return 'whenever you’re ready ✨';
  const date = new Date(scheduledFor);
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (date.toDateString() === today.toDateString()) return `Today · ${time}`;
  if (date.toDateString() === tomorrow.toDateString()) return `Tomorrow · ${time}`;
  const day = date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  return `${day} · ${time}`;
}

export default function HomeScreen() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [pending, setPending] = useState<MomentWithIdea | null>(null);
  // After "We did it!": a short celebration state with stars + photo.
  const [celebrating, setCelebrating] = useState<MomentWithIdea | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setPending(getPendingMoment());
      setCelebrating(null);
      setRating(null);
      setHasPhoto(false);
      setScheduling(false);
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

  const reschedule = (date: Date | null) => {
    setScheduling(false);
    if (!pending) return;
    rescheduleMoment(pending.moment.id, date);
    setPending(getPendingMoment());
  };

  const asking = pending !== null && readyToAsk(pending.moment);
  const weather = currentChip();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topRow}>
        <Text style={styles.greeting}>{greeting()}</Text>
        {weather && <Text style={styles.weather}>{weather}</Text>}
      </View>

      <View style={styles.container}>
        {celebrating ? (
          <View style={styles.card}>
            <IconHalo emoji={iconEmoji(celebrating.idea.icon)} size="l" />
            <Text style={styles.cardTitle}>Stamped into your scrapbook!</Text>
            <Text style={styles.cardSub}>{rating ? 'A moment well made.' : 'How was it?'}</Text>
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
              style={({ pressed }) => [styles.softPill, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.softPillText}>
                {hasPhoto ? '📷 photo saved!' : '📷 add a photo'}
              </Text>
            </Pressable>
          </View>
        ) : pending ? (
          <>
            <View style={styles.card}>
              <Text style={styles.eyebrow}>{asking ? 'Checking in' : 'Up next'}</Text>
              <IconHalo emoji={iconEmoji(pending.idea.icon)} size="l" />
              <Text style={styles.cardTitle}>
                {asking ? `So… did “${pending.idea.title}” happen?` : pending.idea.title}
              </Text>
              <Text style={styles.moods}>{pending.idea.moods.join(' · ')}</Text>
              {!asking && (
                <Text style={styles.schedule}>{scheduleLine(pending.moment.scheduledFor)}</Text>
              )}
              {asking ? (
                <View style={styles.askButtons}>
                  <BigButton label="We did it! 🎉" onPress={weDidIt} />
                  <BigButton label="Not this time 💤" variant="ghost" onPress={notThisTime} />
                </View>
              ) : (
                <View style={styles.momentActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setScheduling(true)}
                    style={({ pressed }) => [styles.softPill, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={styles.softPillText}>🕰 edit time</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={weDidIt}
                    style={({ pressed }) => [styles.softPill, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={styles.softPillText}>✓ mark as done</Text>
                  </Pressable>
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
            <IconHalo emoji={daypartEmoji[daypartOf()]} size="l" />
            <Text style={styles.promptTitle}>What should we{'\n'}do today?</Text>
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

      {pending && (
        <ScheduleSheet
          visible={scheduling}
          ideaTitle={pending.idea.title}
          initial={pending.moment.scheduledFor ? new Date(pending.moment.scheduledFor) : null}
          onConfirm={reschedule}
          onClose={() => setScheduling(false)}
        />
      )}
      {celebrating && !reduceMotion && <ConfettiBurst />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 14,
  },
  greeting: {
    fontSize: 15,
    fontWeight: '600',
    color: inkSoft,
    letterSpacing: 0.3,
  },
  weather: {
    fontSize: 13,
    fontWeight: '600',
    color: inkSoft,
  },
  container: {
    flex: 1,
    padding: 28,
    justifyContent: 'center',
    gap: 18,
  },
  prompt: {
    alignItems: 'center',
    gap: 24,
  },
  promptTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: ink,
    textAlign: 'center',
    lineHeight: 42,
    letterSpacing: 0.3,
  },
  promptButtons: {
    alignSelf: 'stretch',
    gap: 12,
  },
  card: {
    backgroundColor: surface,
    borderRadius: borders.radius,
    padding: 26,
    alignItems: 'center',
    gap: 8,
    ...softShadow,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: ink,
    textAlign: 'center',
    lineHeight: 29,
    letterSpacing: 0.2,
    marginTop: 6,
  },
  cardSub: {
    fontSize: 14,
    color: inkSoft,
  },
  moods: {
    fontSize: 14,
    fontWeight: '600',
    color: accent,
    letterSpacing: 0.4,
  },
  schedule: {
    fontSize: 15,
    fontWeight: '600',
    color: ink,
    marginTop: 2,
  },
  askButtons: {
    alignSelf: 'stretch',
    gap: 10,
    marginTop: 12,
  },
  momentActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  softPill: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(75, 67, 86, 0.06)',
    minHeight: 44,
    justifyContent: 'center',
  },
  softPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: ink,
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
    color: inkSoft,
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
});
