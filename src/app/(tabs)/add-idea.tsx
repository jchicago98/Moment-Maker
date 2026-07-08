import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton } from '@/components/BigButton';
import { Chip } from '@/components/Chip';
import { hapticReveal } from '@/lib/haptics';
import { addUserIdea } from '@/lib/momentActions';
import { borders, canvas, ink } from '@/lib/theme';
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
  const [moods, setMoods] = useState<Mood[]>([]);
  const [setting, setSetting] = useState<Idea['setting']>('either');
  const [costTier, setCostTier] = useState<Idea['costTier']>(0);
  const [durationMin, setDurationMin] = useState(60);
  const [groupFit, setGroupFit] = useState<GroupType[]>(['couple']);
  const [energy, setEnergy] = useState<Energy>(1);

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
      Alert.alert('Almost!', 'Give your idea a name first.');
      return;
    }
    if (moods.length === 0) {
      Alert.alert('One more thing', 'Pick at least one mood so we know when to deal it.');
      return;
    }
    addUserIdea({
      title: title.trim(),
      description: description.trim() || 'Your idea, your rules.',
      moods,
      setting,
      costTier,
      durationMin,
      groupFit,
      energy,
    });
    hapticReveal();
    // It's a tab now: clear the form for next time and hop back to home.
    setTitle('');
    setDescription('');
    setMoods([]);
    Alert.alert('Dealt in! 🎉', 'Your idea joined the deck — and taught us a little about you.', [
      { text: 'Nice', onPress: () => router.navigate('/') },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Add your own idea</Text>
        <Text style={styles.subtitle}>It joins the deck and teaches us what you love.</Text>

        <View style={styles.field}>
          <Text style={styles.label}>What is it?</Text>
          <TextInput
            style={styles.input}
            placeholder="Rooftop breakfast picnic"
            placeholderTextColor="#B8B0A0"
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
            placeholderTextColor="#B8B0A0"
            value={description}
            onChangeText={setDescription}
            maxLength={100}
            accessibilityLabel="Idea description"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Moods (up to 3)</Text>
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

        <BigButton label="Deal it in" onPress={save} />
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
    gap: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: ink,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 15,
    color: ink,
    opacity: 0.65,
    marginTop: -12,
  },
  field: {
    gap: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '800',
    color: ink,
  },
  input: {
    borderWidth: borders.width,
    borderColor: ink,
    borderRadius: borders.radiusSmall,
    backgroundColor: canvas,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: ink,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
