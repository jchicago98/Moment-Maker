import {
  Fraunces_400Regular_Italic,
  Fraunces_500Medium,
  Fraunces_600SemiBold,
  useFonts,
} from '@expo-google-fonts/fraunces';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { initAudio, updateMusic } from '@/lib/audio/soundEngine';
import { initDatabase } from '@/lib/db/database';
import { useSettings } from '@/lib/store/settings';
import { daypartGround, daypartOf } from '@/lib/theme';
import { useWeather } from '@/lib/weather';

initDatabase();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fraunces_400Regular_Italic,
    Fraunces_500Medium,
    Fraunces_600SemiBold,
  });

  // The lamplight shifts almost imperceptibly with the clock, re-checked on
  // foreground.
  const [groundColor, setGroundColor] = useState(() => daypartGround[daypartOf()]);

  useEffect(() => {
    initAudio();
    useWeather.getState().refresh();

    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setGroundColor(daypartGround[daypartOf()]);
        updateMusic(); // the nocturne follows the clock too
        useWeather.getState().refresh();
      }
    });
    const unsubscribeSettings = useSettings.subscribe(updateMusic);
    return () => {
      appState.remove();
      unsubscribeSettings();
    };
  }, []);

  if (!fontsLoaded) {
    return null; // a beat of ground color while the serif arrives
  }

  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: groundColor }]}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
          animation: 'fade',
        }}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
