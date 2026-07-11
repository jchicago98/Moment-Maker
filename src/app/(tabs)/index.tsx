import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton } from '@/components/BigButton';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import { ScheduleSheet } from '@/components/ScheduleSheet';
import {
  getDoneMoments,
  getPendingMoment,
  hasProfile,
  type MomentWithIdea,
} from '@/lib/db/database';
import { hapticReveal } from '@/lib/haptics';
import {
  confirmMoment,
  dismissMoment,
  pickAndAttachPhoto,
  rateMoment,
  readyToAsk,
  rescheduleMoment,
} from '@/lib/momentActions';
import { IdeaEtching } from '@/components/IdeaEtching';
import { accent, capsLabel, daypartOf, fonts, ideaHue, ink, inkFaint, inkHead, inkSoft, rule } from '@/lib/theme';
import { currentChip } from '@/lib/weather';
import type { Moment } from '@/lib/types';

function dateline(): string {
  const now = new Date();
  const day = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  const weather = currentChip();
  return weather ? `${day} · ${weather}` : day;
}

/** The eyebrow above a planned moment, derived from its schedule — never a
 * hardcoded "This evening" at nine in the morning. */
function momentEyebrow(moment: Moment): string {
  if (!moment.scheduledFor) return 'Up next';
  const date = new Date(moment.scheduledFor);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (date.toDateString() === today.toDateString()) {
    const daypart = daypartOf(date);
    if (daypart === 'morning') return 'This morning';
    if (daypart === 'day') return 'This afternoon';
    if (daypart === 'dusk') return 'This evening';
    return 'Tonight';
  }
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return `For ${date.toLocaleDateString([], { weekday: 'long' })}`;
}

function scheduleLine(scheduledFor?: string): string {
  if (!scheduledFor) return 'whenever you’re ready';
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
  const [lastDone, setLastDone] = useState<MomentWithIdea | null>(null);
  // After "We did it": a short celebration state with stars + photo.
  const [celebrating, setCelebrating] = useState<MomentWithIdea | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setPending(getPendingMoment());
      setLastDone(getDoneMoments()[0] ?? null);
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

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={capsLabel}>{dateline()}</Text>

        {celebrating ? (
          <View style={[styles.block, styles.etched]}>
            <IdeaEtching
              icon={celebrating.idea.icon}
              hue={ideaHue(celebrating.idea.moods)}
              size={230}
              opacity={0.09}
            />
            <Text style={styles.headline}>Into the journal it goes.</Text>
            <Text style={styles.sub}>{celebrating.idea.title}</Text>
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
                    ★
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={addPhoto}
              style={({ pressed }) => [styles.textAction, pressed && { opacity: 0.6 }]}
            >
              <Text style={styles.textActionLabel}>
                {hasPhoto ? 'Photo saved' : 'Add a photograph →'}
              </Text>
            </Pressable>
          </View>
        ) : pending ? (
          <View style={[styles.block, styles.etched]}>
            <IdeaEtching
              icon={pending.idea.icon}
              hue={ideaHue(pending.idea.moods)}
              size={230}
              opacity={0.09}
            />
            <Text style={[capsLabel, { color: ideaHue(pending.idea.moods) }]}>
              {asking ? 'Checking in' : momentEyebrow(pending.moment)}
            </Text>
            <Text style={styles.headline}>
              {asking ? `So — did “${pending.idea.title}” happen?` : pending.idea.title}
            </Text>
            {!asking && (
              <>
                <Text style={styles.sub}>{pending.idea.description}</Text>
                <Text style={styles.schedule}>{scheduleLine(pending.moment.scheduledFor)}</Text>
              </>
            )}
            {asking ? (
              <View style={styles.buttons}>
                <BigButton label="We did it" onPress={weDidIt} />
                <BigButton label="Not this time" variant="ghost" onPress={notThisTime} />
              </View>
            ) : (
              <View style={styles.actionRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setScheduling(true)}
                  style={({ pressed }) => [styles.textAction, pressed && { opacity: 0.6 }]}
                >
                  <Text style={styles.textActionLabel}>Edit time</Text>
                </Pressable>
                <Text style={styles.actionDivider}>·</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={weDidIt}
                  style={({ pressed }) => [styles.textAction, pressed && { opacity: 0.6 }]}
                >
                  <Text style={styles.textActionLabel}>Mark as done</Text>
                </Pressable>
                <Text style={styles.actionDivider}>·</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={notThisTime}
                  style={({ pressed }) => [styles.textAction, pressed && { opacity: 0.6 }]}
                >
                  <Text style={[styles.textActionLabel, { color: inkFaint }]}>Let it go</Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.block}>
            <Text style={styles.headline}>What should we do tonight?</Text>
            <Text style={styles.sub}>Five quick choices and we’ll have an answer.</Text>
            <View style={styles.buttons}>
              <BigButton label="Help me decide" onPress={() => router.push('/setup')} />
              <BigButton
                label="Browse the collection"
                variant="ghost"
                onPress={() => router.navigate('/browse')}
              />
            </View>
          </View>
        )}

        {lastDone && !celebrating && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open your journal"
            onPress={() => router.navigate('/history')}
            style={({ pressed }) => [styles.lastTime, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.lastTimeText} numberOfLines={1}>
              Last time — {lastDone.idea.title}
            </Text>
            <Text style={styles.lastTimeStars}>
              {lastDone.moment.rating ? '★'.repeat(lastDone.moment.rating) : '→'}
            </Text>
          </Pressable>
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
  container: {
    flex: 1,
    paddingHorizontal: 26,
    paddingTop: 18,
    paddingBottom: 20,
  },
  block: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
  },
  etched: {
    overflow: 'hidden', // crops the ghost drawing at the block edge
  },
  headline: {
    fontFamily: fonts.serif,
    fontSize: 33,
    lineHeight: 40,
    color: inkHead,
  },
  sub: {
    fontFamily: fonts.serifItalic,
    fontSize: 15.5,
    lineHeight: 23,
    color: inkSoft,
  },
  schedule: {
    fontSize: 15,
    fontWeight: '600',
    color: ink,
    fontVariant: ['tabular-nums'],
  },
  buttons: {
    gap: 10,
    marginTop: 14,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  textAction: {
    minHeight: 44,
    justifyContent: 'center',
  },
  textActionLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    color: accent,
    letterSpacing: 0.3,
  },
  actionDivider: {
    color: inkFaint,
  },
  lastTime: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: rule,
    paddingTop: 16,
    minHeight: 44,
  },
  lastTimeText: {
    flex: 1,
    fontSize: 13.5,
    color: inkSoft,
  },
  lastTimeStars: {
    fontSize: 13.5,
    color: accent,
    letterSpacing: 2,
  },
  starRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  star: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starText: {
    fontSize: 26,
    color: accent,
  },
  starDim: {
    color: rule,
  },
});
