import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { resetProfileData } from '@/lib/db/database';
import { useSession } from '@/lib/store/session';
import { useSettings } from '@/lib/store/settings';
import { borders, candy, canvas, ink } from '@/lib/theme';
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
      'This forgets everything the app has learned about your taste. Your scrapbook stays.',
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
        <Text style={styles.title}>Settings</Text>

        <View style={styles.card}>
          <Row label="Sound" hint="Marimba ticks, knocks, and reveals">
            <Switch
              value={soundOn}
              onValueChange={toggleSound}
              trackColor={{ true: candy.teal.fill, false: '#D8D2C6' }}
              thumbColor={canvas}
              accessibilityLabel="Toggle sound"
            />
          </Row>
          <Row label="Haptics" hint="Little bumps that mirror the sound">
            <Switch
              value={hapticsOn}
              onValueChange={toggleHaptics}
              trackColor={{ true: candy.teal.fill, false: '#D8D2C6' }}
              thumbColor={canvas}
              accessibilityLabel="Toggle haptics"
            />
          </Row>
          <Row label="Music" hint="Gentle loops that change with the time of day">
            <Switch
              value={musicOn}
              onValueChange={toggleMusic}
              disabled={!soundOn}
              trackColor={{ true: candy.teal.fill, false: '#D8D2C6' }}
              thumbColor={canvas}
              accessibilityLabel="Toggle background music"
            />
          </Row>
          <Row label="Reduce motion" hint="Follows your device's accessibility setting">
            <Text style={styles.soon}>system</Text>
          </Row>
        </View>

        <View style={styles.card}>
          <Row label="Location" hint="Rough location, only for the weather chip">
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
          style={({ pressed }) => [styles.resetButton, pressed && { opacity: 0.8 }]}
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
    gap: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: ink,
    marginTop: 8,
  },
  card: {
    borderWidth: borders.width,
    borderColor: ink,
    borderRadius: borders.radius,
    backgroundColor: canvas,
    padding: 16,
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 44,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: ink,
  },
  rowHint: {
    fontSize: 13,
    color: ink,
    opacity: 0.6,
  },
  soon: {
    fontSize: 13,
    fontWeight: '700',
    color: ink,
    opacity: 0.45,
  },
  granted: {
    fontSize: 14,
    fontWeight: '800',
    color: candy.teal.border,
  },
  smallButton: {
    borderWidth: 2,
    borderColor: ink,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  smallButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: ink,
  },
  resetButton: {
    borderWidth: borders.width,
    borderColor: candy.coral.border,
    backgroundColor: candy.coral.fill,
    borderRadius: borders.radius,
    padding: 16,
    alignItems: 'center',
  },
  resetText: {
    fontSize: 16,
    fontWeight: '800',
    color: candy.coral.text,
  },
});
