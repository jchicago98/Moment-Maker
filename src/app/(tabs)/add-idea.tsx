import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton } from '@/components/BigButton';
import { Chip } from '@/components/Chip';
import { IconHalo } from '@/components/IconHalo';
import { hapticReveal } from '@/lib/haptics';
import { addUserIdea } from '@/lib/momentActions';
import { borders, ink, inkSoft, softShadow, surface } from '@/lib/theme';
import { ALL_MOODS, type Energy, type GroupType, type Idea, type Mood } from '@/lib/types';

const ICON_CHOICES = [
  '✨', '🍕', '🎨', '🎬', '🥾', '🎲', '📚', '🎤',
  '🧺', '🌅', '🏕️', '🍦', '🎮', '🌊', '🚴', '📸',
  '🎭', '🧘', '🍰', '🌮', '🎳', '🛶', '🌸', '🔥',
];

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
  const [icon, setIcon] = useState('✨');
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
    setIcon('✨');
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

        <View style={styles.iconSection}>
          <IconHalo emoji={icon} size="m" />
          <View style={styles.iconGrid}>
            {ICON_CHOICES.map((emoji) => (
              <Pressable
                key={emoji}
                accessibilityRole="button"
                accessibilityLabel={`Use ${emoji} as the icon`}
                accessibilityState={{ selected: icon === emoji }}
                onPress={() => setIcon(emoji)}
                style={[styles.iconChoice, icon === emoji && styles.iconChoiceActive]}
              >
                <Text style={styles.iconChoiceText}>{emoji}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>What is it?</Text>
          <TextInput
            style={styles.input}
            placeholder="Rooftop breakfast picnic"
            placeholderTextColor="rgba(75, 67, 86, 0.35)"
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
            placeholderTextColor="rgba(75, 67, 86, 0.35)"
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
    fontSize: 27,
    fontWeight: '700',
    color: ink,
    marginTop: 8,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 15,
    color: inkSoft,
    marginTop: -12,
  },
  iconSection: {
    alignItems: 'center',
    gap: 14,
    backgroundColor: surface,
    borderRadius: borders.radius,
    padding: 18,
    ...softShadow,
    shadowOpacity: 0.08,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  iconChoice: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconChoiceActive: {
    backgroundColor: 'rgba(231, 109, 142, 0.18)',
  },
  iconChoiceText: {
    fontSize: 20,
  },
  field: {
    gap: 10,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: ink,
    letterSpacing: 0.2,
  },
  input: {
    borderRadius: borders.radiusSmall,
    backgroundColor: surface,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    color: ink,
    ...softShadow,
    shadowOpacity: 0.06,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
