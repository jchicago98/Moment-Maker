import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton } from '@/components/BigButton';
import { Chip } from '@/components/Chip';
import { IconBox } from '@/components/IconBox';
import { hapticReveal } from '@/lib/haptics';
import { addUserIdea } from '@/lib/momentActions';
import { borders, capsLabel, fonts, iconWell, ink, inkHead, line, surface } from '@/lib/theme';
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
    setIcon('✨');
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

        <View style={styles.iconSection}>
          <IconBox emoji={icon} size="m" />
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
  iconSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: surface,
    borderWidth: 1,
    borderColor: line,
    borderRadius: borders.radius,
    padding: 16,
  },
  iconGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  iconChoice: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconChoiceActive: {
    backgroundColor: iconWell,
    borderWidth: 1,
    borderColor: line,
  },
  iconChoiceText: {
    fontSize: 17,
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
