import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/Chip';
import { getAllIdeas } from '@/lib/db/database';
import { iconEmoji } from '@/lib/icons';
import { borders, candy, candyOrder, canvas, ink } from '@/lib/theme';
import { currentChip, currentOutlook } from '@/lib/weather';
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [moods, setMoods] = useState<Set<Mood>>(new Set());
  const [times, setTimes] = useState<Set<TimeOfDay>>(new Set());
  const [maxCost, setMaxCost] = useState<CostTier | null>(null);
  const [maxDuration, setMaxDuration] = useState<number | null>(null);
  const [group, setGroup] = useState<GroupType | null>(null);
  const [setting, setSetting] = useState<Idea['setting'] | null>(null);
  const [energy, setEnergy] = useState<Energy | null>(null);
  const [stayClose, setStayClose] = useState(false); // walking distance = no travel

  const allIdeas = useMemo(() => getAllIdeas(), []);
  const weatherChip = currentChip();
  const badWeather = currentOutlook() === 'bad';

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
    [allIdeas, moods, times, maxCost, maxDuration, group, setting, energy, stayClose]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={ideas}
        keyExtractor={(idea) => idea.id}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Browse</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={filtersOpen ? 'Hide filters' : 'Show filters'}
                onPress={() => setFiltersOpen(!filtersOpen)}
                style={({ pressed }) => [
                  styles.filtersPill,
                  activeCount > 0 && styles.filtersPillActive,
                  pressed && { transform: [{ scale: 0.96 }] },
                ]}
              >
                <Text style={[styles.filtersPillText, activeCount > 0 && styles.filtersPillTextActive]}>
                  Filters {activeCount > 0 ? `· ${activeCount}` : ''} {filtersOpen ? '⌃' : '⌄'}
                </Text>
              </Pressable>
            </View>
            <Text style={styles.count}>
              {ideas.length} idea{ideas.length === 1 ? '' : 's'}
            </Text>

            {filtersOpen && (
              <View style={styles.panel}>
                <FilterRow label="Moods (pick any)">
                  {ALL_MOODS.map((m) => (
                    <Chip key={m} label={m} selected={moods.has(m)} onPress={() => toggleMood(m)} />
                  ))}
                </FilterRow>
                <FilterRow label="Time of day (pick any)">
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
                    label="🚶 Walking distance"
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
          <Text style={styles.empty}>Nothing matches that combo — loosen a filter or two.</Text>
        }
        renderItem={({ item, index }) => {
          const color = candyOrder[index % candyOrder.length];
          const outdoor = item.setting === 'outdoor';
          return (
            <View style={[styles.card, { backgroundColor: color.fill, borderColor: color.border }]}>
              <Text style={styles.cardIcon}>{iconEmoji(item.icon)}</Text>
              <Text style={[styles.cardTitle, { color: color.text }]} numberOfLines={3}>
                {item.title}
              </Text>
              <View style={styles.badgeRow}>
                <Badge color={color.border} text={durationLabel(item.durationMin)} />
                <Badge color={color.border} text={item.costTier === 0 ? 'free' : '$'.repeat(item.costTier)} />
                {item.source === 'user' && <Badge color={color.border} text="yours ✨" />}
                {outdoor && weatherChip && <Badge color={color.border} text={weatherChip} />}
                {outdoor && item.weatherSensitive && badWeather && (
                  <Badge color={candy.coral.border} text="☔ indoors today" />
                )}
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
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

function Badge({ color, text }: { color: string; text: string }) {
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  list: {
    padding: 20,
    gap: 12,
  },
  column: {
    gap: 12,
  },
  header: {
    gap: 8,
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: ink,
  },
  filtersPill: {
    borderWidth: borders.width,
    borderColor: ink,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: canvas,
    minHeight: 44,
    justifyContent: 'center',
  },
  filtersPillActive: {
    backgroundColor: candy.teal.fill,
    borderColor: candy.teal.border,
  },
  filtersPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: ink,
  },
  filtersPillTextActive: {
    color: candy.teal.text,
  },
  count: {
    fontSize: 14,
    color: ink,
    opacity: 0.6,
  },
  panel: {
    borderWidth: borders.width,
    borderColor: ink,
    borderRadius: borders.radius,
    backgroundColor: canvas,
    padding: 14,
    gap: 12,
    marginTop: 4,
  },
  filterRow: {
    gap: 6,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: ink,
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    fontSize: 13,
    fontWeight: '700',
    color: ink,
    opacity: 0.5,
  },
  empty: {
    textAlign: 'center',
    color: ink,
    opacity: 0.6,
    fontSize: 15,
    marginTop: 24,
  },
  card: {
    flex: 1,
    borderWidth: borders.width,
    borderRadius: borders.radius,
    padding: 14,
    gap: 6,
    minHeight: 150,
  },
  cardIcon: {
    fontSize: 32,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 19,
    flexGrow: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  badge: {
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
