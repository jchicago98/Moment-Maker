import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/Chip';
import { IdeaDetailModal } from '@/components/IdeaDetailModal';
import { IdeaEtching } from '@/components/IdeaEtching';
import { ScheduleSheet } from '@/components/ScheduleSheet';
import { getAllIdeas } from '@/lib/db/database';
import { hapticReveal } from '@/lib/haptics';
import { createMoment } from '@/lib/momentActions';
import { accent, borders, capsLabel, fonts, ideaHue, ink, inkFaint, inkHead, inkSoft, line, surface } from '@/lib/theme';
import { ALL_MOODS, type CostTier, type Energy, type GroupType, type Idea, type Mood, type TimeOfDay } from '@/lib/types';

const costOptions: { value: CostTier; label: string }[] = [
  { value: 0, label: 'Free' },
  { value: 1, label: '$' },
  { value: 2, label: '$$' },
  { value: 3, label: '$$$' },
];

const durationOptions: { value: number; label: string }[] = [
  { value: 60, label: '≤ 1 h' },
  { value: 120, label: '≤ 2 h' },
  { value: 240, label: '≤ half day' },
];

const groupOptions: { value: GroupType; label: string }[] = [
  { value: 'solo', label: 'Just me' },
  { value: 'couple', label: 'Partner' },
  { value: 'friends', label: 'Friends' },
  { value: 'family', label: 'Family' },
];

const settingOptions: { value: Idea['setting']; label: string }[] = [
  { value: 'indoor', label: 'Indoors' },
  { value: 'outdoor', label: 'Outdoors' },
];

const energyOptions: { value: Energy; label: string }[] = [
  { value: 1, label: 'Chill' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'Active' },
];

const timeOptions: { value: TimeOfDay; label: string }[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'night', label: 'Night' },
];

function durationLabel(min: number): string {
  if (min < 60) return `${min} min`;
  if (min % 60 === 0) return `${min / 60} h`;
  return `${Math.floor(min / 60)}½ h`;
}

export default function BrowseScreen() {
  const router = useRouter();
  const [shelf, setShelf] = useState<'all' | 'mine'>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [moods, setMoods] = useState<Set<Mood>>(new Set());
  const [times, setTimes] = useState<Set<TimeOfDay>>(new Set());
  const [maxCost, setMaxCost] = useState<CostTier | null>(null);
  const [maxDuration, setMaxDuration] = useState<number | null>(null);
  const [group, setGroup] = useState<GroupType | null>(null);
  const [setting, setSetting] = useState<Idea['setting'] | null>(null);
  const [energy, setEnergy] = useState<Energy | null>(null);
  const [stayClose, setStayClose] = useState(false); // walking distance = no travel
  const [inspecting, setInspecting] = useState<Idea | null>(null);
  const [scheduling, setScheduling] = useState<Idea | null>(null);

  // Reload on focus so freshly added "My ideas" show up immediately.
  const [allIdeas, setAllIdeas] = useState<Idea[]>([]);
  useFocusEffect(useCallback(() => setAllIdeas(getAllIdeas()), []));

  const toggleMood = (mood: Mood) =>
    setMoods((current) => {
      const next = new Set(current);
      if (next.has(mood)) next.delete(mood);
      else next.add(mood);
      return next;
    });

  const toggleTime = (time: TimeOfDay) =>
    setTimes((current) => {
      const next = new Set(current);
      if (next.has(time)) next.delete(time);
      else next.add(time);
      return next;
    });

  const activeCount =
    (moods.size > 0 ? 1 : 0) +
    (times.size > 0 ? 1 : 0) +
    (maxCost !== null ? 1 : 0) +
    (maxDuration !== null ? 1 : 0) +
    (group !== null ? 1 : 0) +
    (setting !== null ? 1 : 0) +
    (energy !== null ? 1 : 0) +
    (stayClose ? 1 : 0);

  const clearAll = () => {
    setMoods(new Set());
    setTimes(new Set());
    setMaxCost(null);
    setMaxDuration(null);
    setGroup(null);
    setSetting(null);
    setEnergy(null);
    setStayClose(false);
  };

  const ideas = useMemo(
    () =>
      allIdeas.filter((idea) => {
        if (shelf === 'mine' && idea.source !== 'user') return false;
        if (moods.size > 0 && !idea.moods.some((m) => moods.has(m))) return false;
        if (times.size > 0 && !idea.timeOfDay.some((t) => times.has(t))) return false;
        if (maxCost !== null && idea.costTier > maxCost) return false;
        if (maxDuration !== null && idea.durationMin > maxDuration) return false;
        if (group && !idea.groupFit.includes(group)) return false;
        if (setting && idea.setting !== setting && idea.setting !== 'either') return false;
        if (energy && idea.energy !== energy) return false;
        if (stayClose && idea.requiresTravel) return false;
        return true;
      }),
    [allIdeas, shelf, moods, times, maxCost, maxDuration, group, setting, energy, stayClose]
  );

  // "Do this idea": schedule it, make it the pending moment, land on home.
  const doThisIdea = () => {
    if (!inspecting) return;
    setScheduling(inspecting);
    setInspecting(null);
  };

  const confirmSchedule = (date: Date | null) => {
    if (!scheduling) return;
    createMoment(scheduling, date);
    hapticReveal();
    setScheduling(null);
    router.navigate('/');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={ideas}
        keyExtractor={(idea) => idea.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>The collection</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={filtersOpen ? 'Hide filters' : 'Show filters'}
                onPress={() => setFiltersOpen(!filtersOpen)}
                style={({ pressed }) => [styles.filtersLink, pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.filtersLinkText}>
                  Filters{activeCount > 0 ? ` · ${activeCount}` : ''} {filtersOpen ? '↑' : '↓'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.shelfRow}>
              <ShelfTab label="All ideas" active={shelf === 'all'} onPress={() => setShelf('all')} />
              <ShelfTab label="My ideas" active={shelf === 'mine'} onPress={() => setShelf('mine')} />
              <Text style={styles.count}>{ideas.length}</Text>
            </View>

            {filtersOpen && (
              <View style={styles.panel}>
                <FilterRow label="Moods — pick any">
                  {ALL_MOODS.map((m) => (
                    <Chip key={m} label={m} selected={moods.has(m)} onPress={() => toggleMood(m)} />
                  ))}
                </FilterRow>
                <FilterRow label="Time of day — pick any">
                  {timeOptions.map((t) => (
                    <Chip
                      key={t.value}
                      label={t.label}
                      selected={times.has(t.value)}
                      onPress={() => toggleTime(t.value)}
                    />
                  ))}
                </FilterRow>
                <FilterRow label="Budget">
                  {costOptions.map((c) => (
                    <Chip
                      key={c.value}
                      label={c.label}
                      selected={maxCost === c.value}
                      onPress={() => setMaxCost(maxCost === c.value ? null : c.value)}
                    />
                  ))}
                </FilterRow>
                <FilterRow label="Length">
                  {durationOptions.map((d) => (
                    <Chip
                      key={d.value}
                      label={d.label}
                      selected={maxDuration === d.value}
                      onPress={() => setMaxDuration(maxDuration === d.value ? null : d.value)}
                    />
                  ))}
                </FilterRow>
                <FilterRow label="Who">
                  {groupOptions.map((g) => (
                    <Chip
                      key={g.value}
                      label={g.label}
                      selected={group === g.value}
                      onPress={() => setGroup(group === g.value ? null : g.value)}
                    />
                  ))}
                </FilterRow>
                <FilterRow label="Where">
                  {settingOptions.map((s) => (
                    <Chip
                      key={s.value}
                      label={s.label}
                      selected={setting === s.value}
                      onPress={() => setSetting(setting === s.value ? null : s.value)}
                    />
                  ))}
                  <Chip
                    label="Walking distance"
                    selected={stayClose}
                    onPress={() => setStayClose(!stayClose)}
                  />
                </FilterRow>
                <FilterRow label="Energy">
                  {energyOptions.map((e) => (
                    <Chip
                      key={e.value}
                      label={e.label}
                      selected={energy === e.value}
                      onPress={() => setEnergy(energy === e.value ? null : e.value)}
                    />
                  ))}
                </FilterRow>
                {activeCount > 0 && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={clearAll}
                    style={({ pressed }) => [styles.clearLink, pressed && { opacity: 0.6 }]}
                  >
                    <Text style={styles.clearText}>clear all filters</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          shelf === 'mine' && activeCount === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.empty}>Nothing of your own yet.</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.navigate('/add-idea')}
                style={({ pressed }) => [styles.emptyLink, pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.emptyLinkText}>Add your first one →</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.empty}>Nothing matches that combination — loosen a filter or two.</Text>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.title}. Tap for details.`}
            onPress={() => setInspecting(item)}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
          >
            <IdeaEtching icon={item.icon} hue={ideaHue(item.moods)} size={78} opacity={0.13} />
            <View style={styles.rowText}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={[styles.rowMeta, { color: ideaHue(item.moods) }]}>
                {item.moods[0]} · {durationLabel(item.durationMin)} ·{' '}
                {item.costTier === 0 ? 'free' : '$'.repeat(item.costTier)}
                {item.source === 'user' ? ' · yours' : ''}
              </Text>
            </View>
            <Text style={styles.rowGo}>›</Text>
          </Pressable>
        )}
      />

      <IdeaDetailModal
        idea={inspecting}
        actionLabel="Do this idea"
        onAction={doThisIdea}
        onClose={() => setInspecting(null)}
      />
      <ScheduleSheet
        visible={scheduling !== null}
        ideaTitle={scheduling?.title ?? ''}
        onConfirm={confirmSchedule}
        onClose={() => setScheduling(null)}
      />
    </SafeAreaView>
  );
}

function ShelfTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.shelfTab, pressed && { opacity: 0.7 }]}
    >
      <Text style={[styles.shelfTabText, active && styles.shelfTabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.filterRow}>
      <Text style={styles.filterLabel}>{label}</Text>
      <View style={styles.filterChips}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  list: {
    padding: 24,
    gap: 10,
  },
  header: {
    gap: 12,
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 8,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 28,
    color: inkHead,
  },
  filtersLink: {
    minHeight: 44,
    justifyContent: 'center',
  },
  filtersLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: accent,
    letterSpacing: 0.3,
  },
  shelfRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 18,
    borderBottomWidth: 1,
    borderBottomColor: line,
    paddingBottom: 2,
  },
  shelfTab: {
    minHeight: 40,
    justifyContent: 'center',
  },
  shelfTabText: {
    ...capsLabel,
    color: inkFaint,
    paddingBottom: 6,
  },
  shelfTabTextActive: {
    color: ink,
    borderBottomWidth: 2,
    borderBottomColor: accent,
  },
  count: {
    marginLeft: 'auto',
    ...capsLabel,
    fontVariant: ['tabular-nums'],
  },
  panel: {
    borderWidth: 1,
    borderColor: line,
    borderRadius: borders.radius,
    backgroundColor: surface,
    padding: 16,
    gap: 13,
  },
  filterRow: {
    gap: 7,
  },
  filterLabel: {
    ...capsLabel,
    fontSize: 10.5,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  clearLink: {
    alignSelf: 'center',
    padding: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  clearText: {
    fontFamily: fonts.serifItalic,
    fontSize: 13.5,
    color: inkSoft,
  },
  emptyWrap: {
    alignItems: 'center',
    gap: 4,
    marginTop: 24,
  },
  empty: {
    fontFamily: fonts.serifItalic,
    textAlign: 'center',
    color: inkSoft,
    fontSize: 15,
    marginTop: 24,
    lineHeight: 23,
  },
  emptyLink: {
    padding: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  emptyLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: accent,
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: surface,
    borderWidth: 1,
    borderColor: line,
    borderRadius: borders.radius,
    paddingVertical: 15,
    paddingHorizontal: 15,
    overflow: 'hidden', // crops the etching at the row edge
  },
  rowText: {
    flex: 1,
    gap: 3,
  },
  rowTitle: {
    fontFamily: fonts.serif,
    fontSize: 16.5,
    color: inkHead,
  },
  rowMeta: {
    ...capsLabel,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  rowGo: {
    fontSize: 20,
    color: inkFaint,
  },
});
