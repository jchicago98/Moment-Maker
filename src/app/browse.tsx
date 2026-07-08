import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/Chip';
import { getAllIdeas } from '@/lib/db/database';
import { iconEmoji } from '@/lib/icons';
import { borders, candy, candyOrder, ink } from '@/lib/theme';
import { currentChip, currentOutlook } from '@/lib/weather';
import type { CostTier, Energy, GroupType, Idea, Mood, TimeOfDay } from '@/lib/types';

const moodOptions: Mood[] = ['cozy', 'active', 'silly', 'romantic', 'adventurous', 'creative', 'chill', 'social', 'tasty', 'calm'];

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
  { value: 1440, label: 'Any length' },
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
  const [mood, setMood] = useState<Mood | null>(null);
  const [maxCost, setMaxCost] = useState<CostTier | null>(null);
  const [maxDuration, setMaxDuration] = useState<number | null>(null);
  const [group, setGroup] = useState<GroupType | null>(null);
  const [setting, setSetting] = useState<Idea['setting'] | null>(null);
  const [energy, setEnergy] = useState<Energy | null>(null);
  const [stayClose, setStayClose] = useState(false); // walking distance = no travel
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay | null>(null);

  const allIdeas = useMemo(() => getAllIdeas(), []);
  const weatherChip = currentChip();
  const badWeather = currentOutlook() === 'bad';

  const ideas = useMemo(
    () =>
      allIdeas.filter((idea) => {
        if (mood && !idea.moods.includes(mood)) return false;
        if (maxCost !== null && idea.costTier > maxCost) return false;
        if (maxDuration !== null && idea.durationMin > maxDuration) return false;
        if (group && !idea.groupFit.includes(group)) return false;
        if (setting && idea.setting !== setting && idea.setting !== 'either') return false;
        if (energy && idea.energy !== energy) return false;
        if (stayClose && idea.requiresTravel) return false;
        if (timeOfDay && !idea.timeOfDay.includes(timeOfDay)) return false;
        return true;
      }),
    [allIdeas, mood, maxCost, maxDuration, group, setting, energy, stayClose, timeOfDay]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={ideas}
        keyExtractor={(idea) => idea.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Browse ideas</Text>
            <Text style={styles.count}>
              {ideas.length} idea{ideas.length === 1 ? '' : 's'}
            </Text>

            <FilterRow label="Mood">
              {moodOptions.map((m) => (
                <Chip key={m} label={m} selected={mood === m} onPress={() => setMood(mood === m ? null : m)} />
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
            <FilterRow label="Time">
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
              <Chip label="🚶 Walking distance" selected={stayClose} onPress={() => setStayClose(!stayClose)} />
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
            <FilterRow label="When">
              {timeOptions.map((t) => (
                <Chip
                  key={t.value}
                  label={t.label}
                  selected={timeOfDay === t.value}
                  onPress={() => setTimeOfDay(timeOfDay === t.value ? null : t.value)}
                />
              ))}
            </FilterRow>
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
              <View style={styles.cardBody}>
                <Text style={[styles.cardTitle, { color: color.text }]}>{item.title}</Text>
                <Text style={[styles.cardTip, { color: color.text }]} numberOfLines={2}>
                  {item.description}
                </Text>
                <View style={styles.badgeRow}>
                  <Badge color={color.border} text={durationLabel(item.durationMin)} />
                  <Badge color={color.border} text={item.costTier === 0 ? 'free' : '$'.repeat(item.costTier)} />
                  {item.source === 'user' && <Badge color={color.border} text="yours ✨" />}
                  {outdoor && weatherChip && <Badge color={color.border} text={weatherChip} />}
                  {outdoor && item.weatherSensitive && badWeather && (
                    <Badge color={candy.coral.border} text="☔ better indoors today" />
                  )}
                </View>
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
  header: {
    gap: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: ink,
    marginTop: 8,
  },
  count: {
    fontSize: 14,
    color: ink,
    opacity: 0.6,
    marginTop: -8,
  },
  filterRow: {
    gap: 6,
  },
  filterLabel: {
    fontSize: 13,
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
  empty: {
    textAlign: 'center',
    color: ink,
    opacity: 0.6,
    fontSize: 15,
    marginTop: 24,
  },
  card: {
    flexDirection: 'row',
    gap: 12,
    borderWidth: borders.width,
    borderRadius: borders.radius,
    padding: 14,
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 34,
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  cardTip: {
    fontSize: 13,
    opacity: 0.85,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  badge: {
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
