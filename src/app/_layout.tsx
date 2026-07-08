import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { initAudio, updateMusic } from '@/lib/audio/soundEngine';
import { initDatabase } from '@/lib/db/database';
import { useSettings } from '@/lib/store/settings';
import { daypartCanvas, daypartOf } from '@/lib/theme';
import { useWeather } from '@/lib/weather';

initDatabase();

export default function RootLayout() {
  // The canvas warms and cools with the clock (morning peach → midday cream →
  // dusk orange → night lavender-blue), re-checked whenever we come foreground.
  const [canvasColor, setCanvasColor] = useState(() => daypartCanvas[daypartOf()]);

  useEffect(() => {
    initAudio();
    useWeather.getState().refresh();

    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setCanvasColor(daypartCanvas[daypartOf()]);
        updateMusic(); // the loop follows the clock too
        useWeather.getState().refresh();
      }
    });
    const unsubscribeSettings = useSettings.subscribe(updateMusic);
    return () => {
      appState.remove();
      unsubscribeSettings();
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: canvasColor },
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
