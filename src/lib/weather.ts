// Weather integration (CLAUDE.md §9): coarse location + Open-Meteo (free, no
// API key), cached for 3 hours. If permission is denied or the fetch fails we
// behave as "weather unknown" — never block a session on weather.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { create } from 'zustand';

import type { WeatherOutlook } from '@/lib/algorithm/scoring';

const CACHE_KEY = 'weatherCache';
const CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours

interface WeatherSnapshot {
  outlook: WeatherOutlook;
  chip: string | null; // e.g. "72° clear" — null when unknown
  fetchedAt: number;
}

const UNKNOWN: WeatherSnapshot = { outlook: 'unknown', chip: null, fetchedAt: 0 };

// WMO weather codes → short labels; "bad" codes make outdoor plans miserable.
const CODE_LABELS: [codes: number[], label: string, bad: boolean][] = [
  [[0], 'clear', false],
  [[1, 2], 'partly cloudy', false],
  [[3], 'overcast', false],
  [[45, 48], 'foggy', false],
  [[51, 53, 55, 56, 57], 'drizzle', true],
  [[61, 63, 65, 66, 67], 'rainy', true],
  [[71, 73, 75, 77], 'snowy', true],
  [[80, 81, 82], 'showers', true],
  [[85, 86], 'snow showers', true],
  [[95, 96, 99], 'stormy', true],
];

function describeCode(code: number): { label: string; bad: boolean } {
  for (const [codes, label, bad] of CODE_LABELS) {
    if (codes.includes(code)) return { label, bad };
  }
  return { label: '', bad: false };
}

async function fetchOpenMeteo(lat: number, lon: number): Promise<WeatherSnapshot> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(2)}&longitude=${lon.toFixed(2)}` +
    `&current=temperature_2m,weather_code&daily=precipitation_probability_max&forecast_days=1` +
    `&temperature_unit=fahrenheit&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const data = (await res.json()) as {
    current?: { temperature_2m?: number; weather_code?: number };
    daily?: { precipitation_probability_max?: number[] };
  };

  const temp = data.current?.temperature_2m;
  const code = data.current?.weather_code ?? 0;
  const rainChance = data.daily?.precipitation_probability_max?.[0] ?? 0;
  const { label, bad } = describeCode(code);

  const outlook: WeatherOutlook = bad || rainChance >= 60 ? 'bad' : 'good';
  const chip = temp !== undefined ? `${Math.round(temp)}°${label ? ` ${label}` : ''}` : null;
  return { outlook, chip, fetchedAt: Date.now() };
}

async function getCoarsePosition(): Promise<{ lat: number; lon: number } | null> {
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  const last = await Location.getLastKnownPositionAsync();
  const pos =
    last ??
    (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest }));
  return pos ? { lat: pos.coords.latitude, lon: pos.coords.longitude } : null;
}

interface WeatherState extends WeatherSnapshot {
  /** Hydrate from cache, then refresh from the network if stale. Silent on failure. */
  refresh: () => Promise<void>;
}

export const useWeather = create<WeatherState>((set, get) => ({
  ...UNKNOWN,

  refresh: async () => {
    try {
      if (get().fetchedAt === 0) {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (raw) {
          const cached = JSON.parse(raw) as WeatherSnapshot;
          set(cached);
        }
      }
      if (Date.now() - get().fetchedAt < CACHE_TTL_MS) return;

      const position = await getCoarsePosition();
      if (!position) return; // no permission → stay unknown, drop the chip

      const snapshot = await fetchOpenMeteo(position.lat, position.lon);
      set(snapshot);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
    } catch {
      // Weather is a garnish, never a blocker.
    }
  },
}));

/** Synchronous read for the session hard filter. */
export function currentOutlook(): WeatherOutlook {
  const { outlook, fetchedAt } = useWeather.getState();
  return Date.now() - fetchedAt < CACHE_TTL_MS ? outlook : 'unknown';
}

/** Synchronous chip text for outdoor cards ("72° clear"), or null. */
export function currentChip(): string | null {
  const { chip, fetchedAt } = useWeather.getState();
  return Date.now() - fetchedAt < CACHE_TTL_MS ? chip : null;
}
