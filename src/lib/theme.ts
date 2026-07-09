// Moment Maker design language v3 — "Gazette · After Dark".
// An evening paper read by lamplight: warm near-black ground, cream serif
// headlines, hairline-bordered surfaces, one ember-red accent. No gradients,
// no shadows, no bounce-for-its-own-sake. See CLAUDE.md §3.

import type { TextStyle } from 'react-native';

// Ground & text
export const ground = '#191613'; // warm near-black
export const ink = '#EAE3D6'; // cream — primary text
export const inkHead = '#F0EADD'; // headlines, a touch brighter
export const inkSoft = '#96897A'; // secondary
export const inkFaint = '#6E675C'; // tertiary/hints

// Surfaces
export const surface = '#211E19'; // cards, sheets, tab bar rows
export const surfaceDeep = '#14120F'; // tab bar
export const line = '#37322A'; // 1px card hairlines
export const rule = '#322E27'; // horizontal rules, progress tracks
export const iconWell = '#241F1A'; // IconBox background

// Accent
export const accent = '#C25B4E'; // ember red — links, stars, progress, active
export const warnFill = '#3A2620'; // bad-weather chip ground
export const warnText = '#D98B76';

// Type
export const fonts = {
  serif: 'Fraunces_500Medium',
  serifSemi: 'Fraunces_600SemiBold',
  serifItalic: 'Fraunces_400Regular_Italic',
} as const;

/** Small-caps utility label — datelines, categories, round counters. */
export const capsLabel: TextStyle = {
  fontSize: 11,
  letterSpacing: 1.6,
  textTransform: 'uppercase',
  color: inkSoft,
  fontWeight: '600',
};

export const borders = {
  width: 1, // hairlines carry the depth — no shadows
  radius: 6, // editorial, squared
  radiusSmall: 10, // icon boxes, inputs
} as const;

export const cardTilt = 4; // degrees, never exceed 5

// ---------------------------------------------------------------------------
// Time-of-day theming: the lamplight shifts almost imperceptibly with the
// clock, synced with the nocturne loops.

export type Daypart = 'morning' | 'day' | 'dusk' | 'night';

export function daypartOf(date: Date = new Date()): Daypart {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'day';
  if (hour >= 17 && hour < 21) return 'dusk';
  return 'night';
}

export const daypartGround: Record<Daypart, string> = {
  morning: '#1A1713',
  day: '#191613',
  dusk: '#1B1512',
  night: '#161411',
};
