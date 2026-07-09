import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { resetProfileData } from '@/lib/db/database';
import { useSession } from '@/lib/store/session';
import { useSettings } from '@/lib/store/settings';
import { accent, borders, capsLabel, fonts, ink, inkFaint, inkHead, inkSoft, line, rule, surface } from '@/lib/theme';
import { useWeather } from '@/lib/weather';

export default function SettingsScreen() {
  const router = useRouter();
  const { soundOn, musicOn, hapticsOn, toggleSound, toggleMusic, toggleHaptics } = useSettings();
  const reset = useSession((s) => s.reset);
  const [locationStatus, setLocationStatus] = useState<string>('checking…');

  useEffect(() => {
    Location.getForegroundPermissionsAsync().then(({ status }) => setLocationStatus(status));
  }, []);

  const requestLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationStatus(status);
    if (status === 'granted') useWeather.getState().refresh();
  };

  const confirmReset = () => {
    Alert.alert(
      'Start fresh?',
      'This forgets everything the app has learned about your taste. Your journal stays.',
      [
        { text: 'Keep my profile', style: 'cancel' },
        {
          text: 'Reset profile',
          style: 'destructive',
          onPress: () => {
            resetProfileData();
            reset();
            router.replace('/onboarding');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={capsLabel}>The fine print</Text>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.card}>
          <Row label="Sound" hint="Felt-piano notes, knocks, and reveals">
            <Switch
              value={soundOn}
              onValueChange={toggleSound}
              trackColor={{ true: accent, false: rule }}
              thumbColor={ink}
              accessibilityLabel="Toggle sound"
            />
          </Row>
          <View style={styles.divider} />
          <Row label="Music" hint="Quiet nocturnes that change with the hour">
            <Switch
              value={musicOn}
              onValueChange={toggleMusic}
              disabled={!soundOn}
              trackColor={{ true: accent, false: rule }}
              thumbColor={ink}
              accessibilityLabel="Toggle background music"
            />
          </Row>
          <View style={styles.divider} />
          <Row label="Haptics" hint="Little bumps that mirror the sound">
            <Switch
              value={hapticsOn}
              onValueChange={toggleHaptics}
              trackColor={{ true: accent, false: rule }}
              thumbColor={ink}
              accessibilityLabel="Toggle haptics"
            />
          </Row>
          <View style={styles.divider} />
          <Row label="Reduce motion" hint="Follows your device's accessibility setting">
            <Text style={styles.quiet}>system</Text>
          </Row>
        </View>

        <View style={styles.card}>
          <Row label="Location" hint="Rough location, only for the weather line">
            {locationStatus === 'granted' ? (
              <Text style={styles.granted}>on</Text>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={requestLocation}
                style={({ pressed }) => [styles.smallButton, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.smallButtonText}>Allow</Text>
              </Pressable>
            )}
          </Row>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={confirmReset}
          style={({ pressed }) => [styles.resetButton, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.resetText}>Reset my taste profile</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowHint}>{hint}</Text>
      </View>
      {children}
    </View>
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
  card: {
    backgroundColor: surface,
    borderWidth: 1,
    borderColor: line,
    borderRadius: borders.radius,
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: rule,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 44,
    paddingVertical: 12,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 15.5,
    fontWeight: '600',
    color: ink,
    letterSpacing: 0.2,
  },
  rowHint: {
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    color: inkSoft,
  },
  quiet: {
    fontSize: 13,
    fontWeight: '600',
    color: inkFaint,
  },
  granted: {
    ...capsLabel,
    color: accent,
  },
  smallButton: {
    borderWidth: 1,
    borderColor: line,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
    minHeight: 44,
    justifyContent: 'center',
  },
  smallButtonText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: ink,
  },
  resetButton: {
    borderWidth: 1,
    borderColor: accent,
    borderRadius: borders.radius,
    padding: 16,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  resetText: {
    fontSize: 14,
    fontWeight: '600',
    color: accent,
    letterSpacing: 0.3,
  },
});
