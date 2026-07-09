import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton } from '@/components/BigButton';
import { Chip } from '@/components/Chip';
import { useSession } from '@/lib/store/session';
import { capsLabel, fonts, inkHead, inkSoft } from '@/lib/theme';
import type { CostTier, GroupType } from '@/lib/types';

const groups: { value: GroupType; label: string }[] = [
  { value: 'solo', label: 'Just me' },
  { value: 'couple', label: 'Partner' },
  { value: 'friends', label: 'Friends' },
  { value: 'family', label: 'Family' },
];

const times: { value: number; label: string }[] = [
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
  { value: 300, label: 'Half day' },
  { value: 480, label: 'All day' },
];

const budgets: { value: CostTier; label: string }[] = [
  { value: 0, label: 'Free' },
  { value: 1, label: '$' },
  { value: 2, label: '$$' },
  { value: 3, label: '$$$' },
];

export default function SetupScreen() {
  const router = useRouter();
  const { setup, setSetup, startSession } = useSession();

  const dealMeIn = () => {
    if (startSession()) {
      router.replace('/picker');
    } else {
      Alert.alert(
        'Hmm',
        "We couldn't find enough ideas for that combo. Try a bigger budget or more time?"
      );
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={capsLabel}>Setting the scene</Text>
        <Text style={styles.title}>Three quick questions.</Text>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{"Who's playing?"}</Text>
          <View style={styles.chipRow}>
            {groups.map((g) => (
              <Chip
                key={g.value}
                label={g.label}
                selected={setup.group === g.value}
                onPress={() => setSetup({ group: g.value })}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>How much time?</Text>
          <View style={styles.chipRow}>
            {times.map((t) => (
              <Chip
                key={t.value}
                label={t.label}
                selected={setup.timeBudgetMin === t.value}
                onPress={() => setSetup({ timeBudgetMin: t.value })}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Budget</Text>
          <View style={styles.chipRow}>
            {budgets.map((b) => (
              <Chip
                key={b.value}
                label={b.label}
                selected={setup.costCap === b.value}
                onPress={() => setSetup({ costCap: b.value })}
              />
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <BigButton label="Deal me in" onPress={dealMeIn} />
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backLink, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.backText}>never mind</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    padding: 26,
    gap: 22,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 30,
    lineHeight: 37,
    color: inkHead,
    marginTop: -12,
  },
  section: {
    gap: 11,
  },
  sectionLabel: {
    ...capsLabel,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  footer: {
    marginTop: 12,
    gap: 6,
  },
  backLink: {
    alignSelf: 'center',
    padding: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  backText: {
    fontFamily: fonts.serifItalic,
    fontSize: 14,
    color: inkSoft,
  },
});
