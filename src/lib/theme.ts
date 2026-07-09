// Moment Maker design language v2 — soft-pastel "bird guide" aesthetic.
// Gradient canvases, borderless surface cards with gentle shadows, circular
// gradient halos behind emoji, airy plum typography, pink accents.
// See CLAUDE.md §3. Do not drift from this.

export const ink = '#4B4356'; // dark plum — all primary text
export const inkSoft = 'rgba(75, 67, 86, 0.6)'; // secondary text
export const surface = '#FFFBF7'; // card/bar background
export const canvas = '#FBEFE9'; // fallback flat background (gradients preferred)

export const accent = '#E76D8E'; // pink accent — links, highlights, selection
export const accentGradient = ['#F2709C', '#C86DD7'] as const; // primary buttons
export const haloGradient = ['#FFE7D4', '#F6D3E6'] as const; // emoji halos

export interface CandyColor {
  fill: string; // soft pastel card tint
  border: string; // deep accent tone of the same hue (chips, links, badges)
  text: string; // readable text on the fill
}

export const candy: Record<string, CandyColor> = {
  teal: { fill: '#DCF2E9', border: '#3E8E75', text: '#2C6B57' },
  coral: { fill: '#FBE3D8', border: '#C96F4A', text: '#8F4A2D' },
  purple: { fill: '#E9E4F9', border: '#7B6BC4', text: '#564A93' },
  amber: { fill: '#FCEBCF', border: '#C08A2D', text: '#8A6120' },
  pink: { fill: '#F9DEE8', border: '#CD5E85', text: '#9C3F62' },
};

export const candyOrder: CandyColor[] = [
  candy.teal,
  candy.coral,
  candy.purple,
  candy.amber,
  candy.pink,
];

export const borders = {
  width: 0, // v2: cards are borderless; kept for the rare hairline
  radius: 26,
  radiusSmall: 18,
} as const;

/** The soft drop shadow every floating surface wears. Plain const (not
 * ViewStyle) so it can spread into Text/TextInput styles too. */
export const softShadow = {
  shadowColor: '#6C5A7A',
  shadowOpacity: 0.14,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 8 },
  elevation: 5,
} as const;

export const cardTilt = 4; // degrees, never exceed 5

// ---------------------------------------------------------------------------
// Time-of-day theming: the gradient canvas warms and cools with the clock,
// synced with the adaptive music.

export type Daypart = 'morning' | 'day' | 'dusk' | 'night';

export function daypartOf(date: Date = new Date()): Daypart {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'day';
  if (hour >= 17 && hour < 21) return 'dusk';
  return 'night';
}

export const daypartGradient: Record<Daypart, readonly [string, string]> = {
  morning: ['#FDEBDA', '#F8E0EA'], // peach → rose
  day: ['#FBF0E7', '#F0E5F5'], // cream → pale lavender
  dusk: ['#FBE3D2', '#E9DBF1'], // apricot → plum haze
  night: ['#EAE6F4', '#DCD4EC'], // lavender → dusty violet
};

export const daypartEmoji: Record<Daypart, string> = {
  morning: '🌅',
  day: '☀️',
  dusk: '🌆',
  night: '🌙',
};
