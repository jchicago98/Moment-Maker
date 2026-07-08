// Informative pairing (CLAUDE.md §7.2.4): build pairs like a soft decision
// tree — pair ideas that differ on the profile's most uncertain dimensions so
// each pick maximally teaches us. Later rounds narrow toward the emerging
// winner-space. ~12% of pair slots inject a wildcard from an under-explored
// region (surprise is the product). Pure TypeScript — no React, no Expo.

import { costValue, durationValue, energyValue, settingValue } from '@/lib/algorithm/features';
import type { Idea, UserProfile } from '@/lib/types';

export const EXPLORATION_RATE = 0.12;
const PAIR_SAMPLES = 80;
const MIN_FOCUS = 8;

function uncertainty(weight: number): number {
  return 1 - Math.abs(weight); // weights near 0 = most uncertain
}

/**
 * How much showing this pair would teach us: sum over dimensions where the
 * two ideas differ, weighted by how uncertain the profile is on each.
 */
export function pairInformativeness(profile: UserProfile, a: Idea, b: Idea): number {
  let info = 0;

  info += uncertainty(profile.settingWeight) * (Math.abs(settingValue(a.setting) - settingValue(b.setting)) / 2);
  info += uncertainty(profile.costWeight) * (Math.abs(costValue(a.costTier) - costValue(b.costTier)) / 2);
  info += uncertainty(profile.energyWeight) * (Math.abs(energyValue(a.energy) - energyValue(b.energy)) / 2);
  info +=
    uncertainty(profile.durationWeight) *
    (Math.abs(durationValue(a.durationMin) - durationValue(b.durationMin)) / 2);

  const aMoods = new Set(a.moods);
  const bMoods = new Set(b.moods);
  for (const m of a.moods) if (!bMoods.has(m)) info += uncertainty(profile.moodWeights[m]) / 3;
  for (const m of b.moods) if (!aMoods.has(m)) info += uncertainty(profile.moodWeights[m]) / 3;

  return info;
}

/** How much this single idea touches the profile's uncertain dimensions —
 * used to find wildcards from under-explored attribute regions. */
export function explorationValue(profile: UserProfile, idea: Idea, timesShown: number): number {
  let value = 0;
  for (const m of idea.moods) value += uncertainty(profile.moodWeights[m]) / idea.moods.length;
  value += uncertainty(profile.settingWeight) * Math.abs(settingValue(idea.setting));
  value += uncertainty(profile.costWeight) * Math.abs(costValue(idea.costTier));
  value += uncertainty(profile.energyWeight) * Math.abs(energyValue(idea.energy));
  value += uncertainty(profile.durationWeight) * Math.abs(durationValue(idea.durationMin));
  return value - timesShown * 0.2; // prefer the rarely-seen
}

export interface PickPairOptions {
  roundIndex: number; // 0-based
  totalRounds: number;
  scores: Map<string, number>;
  timesShown?: Map<string, number>;
  explorationRate?: number;
  rng?: () => number;
}

/**
 * Choose the next pair from the pool. Early rounds maximize informativeness
 * across the whole (score-sorted) pool; later rounds restrict to a shrinking
 * top slice and weigh combined score more, narrowing toward the winner-space.
 */
export function pickPair(pool: Idea[], profile: UserProfile, opts: PickPairOptions): [Idea, Idea] | null {
  if (pool.length < 2) return null;

  const rng = opts.rng ?? Math.random;
  const explorationRate = opts.explorationRate ?? EXPLORATION_RATE;
  const score = (idea: Idea) => opts.scores.get(idea.id) ?? 0;

  const sorted = [...pool].sort((x, y) => score(y) - score(x));
  const focusFraction = Math.max(0.4, 1 - 0.15 * opts.roundIndex);
  const focusSize = Math.min(
    sorted.length,
    Math.max(MIN_FOCUS, Math.round(sorted.length * focusFraction))
  );
  const focus = sorted.slice(0, focusSize);

  const infoWeight = 1 - opts.roundIndex / opts.totalRounds;
  const scoreWeight = opts.roundIndex / opts.totalRounds;

  let best: [Idea, Idea] | null = null;
  let bestValue = -Infinity;
  const samples = Math.min(PAIR_SAMPLES, (focus.length * (focus.length - 1)) / 2);
  for (let k = 0; k < samples; k++) {
    const i = Math.floor(rng() * focus.length);
    let j = Math.floor(rng() * (focus.length - 1));
    if (j >= i) j += 1;
    const a = focus[i];
    const b = focus[j];
    const value =
      infoWeight * pairInformativeness(profile, a, b) + scoreWeight * ((score(a) + score(b)) / 2);
    if (value > bestValue) {
      bestValue = value;
      best = [a, b];
    }
  }
  if (!best) return null;

  // Exploration: sometimes swap the weaker side for a wildcard from an
  // under-explored region *outside* the focus slice — the focus is the
  // filter bubble the wildcard exists to break.
  if (rng() < explorationRate && sorted.length > focusSize) {
    const inPair = new Set([best[0].id, best[1].id]);
    let wildcard: Idea | null = null;
    let wildcardValue = -Infinity;
    for (const idea of sorted.slice(focusSize)) {
      if (inPair.has(idea.id)) continue;
      const value = explorationValue(profile, idea, opts.timesShown?.get(idea.id) ?? 0);
      if (value > wildcardValue) {
        wildcardValue = value;
        wildcard = idea;
      }
    }
    if (wildcard) {
      const weakerIndex = score(best[0]) <= score(best[1]) ? 0 : 1;
      best = weakerIndex === 0 ? [wildcard, best[1]] : [best[0], wildcard];
    }
  }

  return best;
}
