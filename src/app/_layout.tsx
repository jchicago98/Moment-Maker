import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { initDatabase } from '@/lib/db/database';
import { canvas } from '@/lib/theme';

initDatabase();

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: canvas },
          animation: 'fade',
        }}
      />
    </>
  );
}
