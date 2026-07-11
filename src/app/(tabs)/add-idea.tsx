import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton } from '@/components/BigButton';
import { Chip } from '@/components/Chip';
import { IdeaEtching } from '@/components/IdeaEtching';
import { hapticReveal } from '@/lib/haptics';
import { ideaIcon, WATERMARK_CHOICES } from '@/lib/icons';
import { addUserIdea } from '@/lib/momentActions';
import { accent, borders, capsLabel, fonts, ideaHue, ink, inkHead, inkSoft, line, surface } from '@/lib/theme';
import { ALL_MOODS, type Energy, type GroupType, type Idea, type Mood } from '@/lib/types';

const settings: { value: Idea['setting']; label: string }[] = [
  { value: 'indoor', label: 'Indoors' },
  { value: 'outdoor', label: 'Outdoors' },
  { value: 'either', label: 'Either' },
];

const costs: { value: Idea['costTier']; label: string }[] = [
  { value: 0, label: 'Free' },
  { value: 1, label: '$' },
  { value: 2, label: '$$' },
  { value: 3, label: '$$$' },
];

const durations: { value: number; label: string }[] = [
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 240, label: 'Half day' },
];

const groups: { value: GroupType; label: string }[] = [
  { value: 'solo', label: 'Just me' },
  { value: 'couple', label: 'Partner' },
  { value: 'friends', label: 'Friends' },
  { value: 'family', label: 'Family' },
];

const energies: { value: Energy; label: string }[] = [
  { value: 1, label: 'Chill' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'Active' },
];

export default function AddIdeaScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('sparkles');
  const [moods, setMoods] = useState<Mood[]>([]);
  const [setting, setSetting] = useState<Idea['setting']>('either');
  const [costTier, setCostTier] = useState<Idea['costTier']>(0);
  const [durationMin, setDurationMin] = useState(60);
  const [groupFit, setGroupFit] = useState<GroupType[]>(['couple']);
  const [energy, setEnergy] = useState<Energy>(1);

  const previewHue = moods.length > 0 ? ideaHue(moods) : accent;

  const toggleMood = (mood: Mood) => {
    setMoods((current) =>
      current.includes(mood)
        ? current.filter((m) => m !== mood)
        : current.length < 3
          ? [...current, mood]
          : current // 1–3 moods, like every idea in the deck
    );
  };

  const toggleGroup = (group: GroupType) => {
    setGroupFit((current) =>
      current.includes(group)
        ? current.length > 1
          ? current.filter((g) => g !== group)
          : current
        : [...current, group]
    );
  };

  const save = () => {
    if (title.trim().length < 3) {
      Alert.alert('Almost', 'Give your idea a name first.');
      return;
    }
    if (moods.length === 0) {
      Alert.alert('One more thing', 'Pick at least one mood so we know when to deal it.');
      return;
    }
    addUserIdea({
      title: title.trim(),
      description: description.trim() || 'Your idea, your rules.',
      icon,
      moods,
      setting,
      costTier,
      durationMin,
      groupFit,
      energy,
    });
    hapticReveal();
    // It's a tab: clear the form for next time and hop back to home.
    setTitle('');
    setDescription('');
    setIcon('sparkles');
    setMoods([]);
    Alert.alert('Added to the collection', 'It joins the deck — and taught us a little about you.', [
      { text: 'Lovely', onPress: () => router.navigate('/') },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={capsLabel}>A contribution of your own</Text>
        <Text style={styles.title}>Add an idea</Text>

        {/* Live preview: the idea exactly as it will appear in the deck. */}
        <View style={styles.preview}>
          <IdeaEtching icon={icon} hue={previewHue} size={110} opacity={0.13} />
          <Text style={[styles.previewCategory, { color: previewHue }]}>
            {moods.length > 0 ? moods.join(' · ') : 'your idea'}
          </Text>
          <Text style={styles.previewTitle} numberOfLines={2}>
            {title.trim() || 'Rooftop breakfast picnic'}
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Watermark</Text>
          <View style={styles.iconGrid}>
            {WATERMARK_CHOICES.map((name) => {
              const Drawing = ideaIcon(name);
              const selected = icon === name;
              return (
                <Pressable
                  key={name}
                  accessibilityRole="button"
                  accessibilityLabel={`Use the ${name} drawing as the watermark`}
                  accessibilityState={{ selected }}
                  onPress={() => setIcon(name)}
                  style={[styles.iconChoice, selected && styles.iconChoiceActive]}
                >
                  <Drawing size={20} color={selected ? previewHue : inkSoft} strokeWidth={1.6} />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>What is it?</Text>
          <TextInput
            style={styles.input}
            placeholder="Rooftop breakfast picnic"
            placeholderTextColor="#59524A"
            value={title}
            onChangeText={setTitle}
            maxLength={60}
            accessibilityLabel="Idea title"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>One-line tip (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Bring the good jam."
            placeholderTextColor="#59524A"
            value={description}
            onChangeText={setDescription}
            maxLength={100}
            accessibilityLabel="Idea description"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Moods — up to 3</Text>
          <View style={styles.chipRow}>
            {ALL_MOODS.map((mood) => (
              <Chip key={mood} label={mood} selected={moods.includes(mood)} onPress={() => toggleMood(mood)} />
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Where?</Text>
          <View style={styles.chipRow}>
            {settings.map((s) => (
              <Chip key={s.value} label={s.label} selected={setting === s.value} onPress={() => setSetting(s.value)} />
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Cost</Text>
          <View style={styles.chipRow}>
            {costs.map((c) => (
              <Chip key={c.value} label={c.label} selected={costTier === c.value} onPress={() => setCostTier(c.value)} />
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>How long?</Text>
          <View style={styles.chipRow}>
            {durations.map((d) => (
              <Chip
                key={d.value}
                label={d.label}
                selected={durationMin === d.value}
                onPress={() => setDurationMin(d.value)}
              />
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Good with</Text>
          <View style={styles.chipRow}>
            {groups.map((g) => (
              <Chip
                key={g.value}
                label={g.label}
                selected={groupFit.includes(g.value)}
                onPress={() => toggleGroup(g.value)}
              />
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Energy</Text>
          <View style={styles.chipRow}>
            {energies.map((e) => (
              <Chip key={e.value} label={e.label} selected={energy === e.value} onPress={() => setEnergy(e.value)} />
            ))}
          </View>
        </View>

        <BigButton label="Add to the collection" onPress={save} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    padding: 24,
    gap: 18,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 28,
    color: inkHead,
    marginTop: -10,
  },
  preview: {
    backgroundColor: surface,
    borderWidth: 1,
    borderColor: line,
    borderRadius: borders.radius,
    padding: 18,
    gap: 7,
    overflow: 'hidden', // crops the etching at the card edge
  },
  previewCategory: {
    ...capsLabel,
    fontSize: 10.5,
  },
  previewTitle: {
    fontFamily: fonts.serif,
    fontSize: 21,
    lineHeight: 26,
    color: inkHead,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  iconChoice: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconChoiceActive: {
    borderWidth: 1,
    borderColor: line,
    backgroundColor: 'rgba(0, 0, 0, 0.16)',
  },
  field: {
    gap: 9,
  },
  label: {
    ...capsLabel,
  },
  input: {
    borderWidth: 1,
    borderColor: line,
    borderRadius: borders.radiusSmall,
    backgroundColor: surface,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontSize: 15.5,
    color: ink,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
