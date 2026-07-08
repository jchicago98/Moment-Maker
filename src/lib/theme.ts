// Moment Maker design language — see CLAUDE.md §3. Do not drift from this.

export const ink = '#2C2C2A';
export const canvas = '#FDF6EC';

export interface CandyColor {
  fill: string;
  border: string;
  text: string;
}

export const candy: Record<string, CandyColor> = {
  teal: { fill: '#9FE1CB', border: '#085041', text: '#04342C' },
  coral: { fill: '#F5C4B3', border: '#712B13', text: '#4A1B0C' },
  purple: { fill: '#CECBF6', border: '#3C3489', text: '#26215C' },
  amber: { fill: '#FAC775', border: '#854F0B', text: '#4A2C05' },
  pink: { fill: '#F4C0D1', border: '#72243E', text: '#4A1226' },
};

export const candyOrder: CandyColor[] = [
  candy.teal,
  candy.coral,
  candy.purple,
  candy.amber,
  candy.pink,
];

export const accent = '#D85A30'; // primary accent (coral family)

export const borders = {
  width: 3,
  radius: 20,
  radiusSmall: 16,
} as const;

export const cardTilt = 4; // degrees, never exceed 5

// ---------------------------------------------------------------------------
// Time-of-day theming: the canvas warms and cools with the clock, synced with
// the adaptive music. All tints stay in the light range so the chunky ink
// (#2C2C2A) keeps its contrast everywhere — a true deep-blue night mode waits
// for a full dark palette (cards, chips, ink) in a later pass.

export type Daypart = 'morning' | 'day' | 'dusk' | 'night';

export function daypartOf(date: Date = new Date()): Daypart {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'day';
  if (hour >= 17 && hour < 21) return 'dusk';
  return 'night';
}

export const daypartCanvas: Record<Daypart, string> = {
  morning: '#FDF0DF', // soft peach
  day: '#FDF6EC', // the classic cream
  dusk: '#FAE9DE', // warm orange with a hint of plum
  night: '#ECEBF4', // cool lavender-blue dusk-of-cream
};
