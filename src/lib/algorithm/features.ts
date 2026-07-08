// Feature mapping: every idea is a feature vector over the profile's attribute
// space, each dimension normalized to [-1, 1]. Pure TypeScript — no React, no
// Expo (CLAUDE.md §10).

import type { Idea } from '@/lib/types';

export function clamp(x: number, lo = -1, hi = 1): number {
  return Math.min(hi, Math.max(lo, x));
}

/** outdoor = +1, indoor = −1, either = 0 (matches settingWeight's sign). */
export function settingValue(setting: Idea['setting']): number {
  if (setting === 'outdoor') return 1;
  if (setting === 'indoor') return -1;
  return 0;
}

/** costTier 0..3 → −1..+1. */
export function costValue(tier: number): number {
  return (tier * 2) / 3 - 1;
}

/** energy 1..3 → −1..+1. */
export function energyValue(energy: number): number {
  return energy - 2;
}

/** durationMin → −1 (quick 30 min) .. +1 (half-day+), centered near 2¼ h. */
export function durationValue(min: number): number {
  return clamp((min - 135) / 165);
}
