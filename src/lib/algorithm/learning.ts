// The learning rule (CLAUDE.md §7.1): the algorithm learns on EVERY
// generation. Each this-or-that pick is a pairwise preference; ratings are the
// strongest signal; user-added ideas are strong positives; everything decays
// gently so the profile tracks who the user is *now*.
//
// Pure TypeScript — no React, no Expo. Every function returns a new profile.

import { clamp, costValue, durationValue, energyValue, settingValue } from '@/lib/algorithm/features';
import { ALL_MOODS, type GroupType, type Idea, type Mood, type TimeOfDay, type UserProfile } from '@/lib/types';

export const LEARNING_RATE = 0.05; // per pick
export const REINFORCEMENT = 0.02; // shared attributes
const RATING_POSITIVE = 3; // 4–5 stars multiply pick strength ~3×
const RATING_NEGATIVE = -3; // 1–2 stars, similar magnitude, negative
const RATING_NEUTRAL = 0.75; // 3 stars: mildly positive
const COMPLETED_UNRATED = 0.5; // completion without rating = mild positive
const USER_IDEA_FACTOR = 2; // user-added ideas ≈ 2× pick strength
export const SESSION_DECAY = 0.995; // light time decay per session
const RENORMALIZE_CEILING = 0.95; // no dimension runs away

const ALL_GROUPS: GroupType[] = ['solo', 'couple', 'friends', 'family'];
const ALL_TIMES: TimeOfDay[] = ['morning', 'afternoon', 'evening', 'night'];

export function createEmptyProfile(now: Date = new Date()): UserProfile {
  return {
    moodWeights: Object.fromEntries(ALL_MOODS.map((m) => [m, 0])) as Record<Mood, number>,
    settingWeight: 0,
    costWeight: 0,
    energyWeight: 0,
    durationWeight: 0,
    socialWeights: Object.fromEntries(ALL_GROUPS.map((g) => [g, 0])) as Record<GroupType, number>,
    timeOfDayWeights: Object.fromEntries(ALL_TIMES.map((t) => [t, 0])) as Record<TimeOfDay, number>,
    totalSessions: 0,
    updatedAt: now.toISOString(),
  };
}

function cloneProfile(p: UserProfile): UserProfile {
  return {
    ...p,
    moodWeights: { ...p.moodWeights },
    socialWeights: { ...p.socialWeights },
    timeOfDayWeights: { ...p.timeOfDayWeights },
  };
}

/**
 * Fun extra signal: scale the nudge by throw velocity — a confident hard
 * fling ≈ 1.25× learning rate, a hesitant slow drag-off ≈ 0.8×. Taps and
 * unknown velocities (0) are neutral.
 */
export function velocityFactor(throwVelocity: number): number {
  if (throwVelocity <= 0) return 1;
  if (throwVelocity <= 600) return 0.8;
  if (throwVelocity >= 1800) return 1.25;
  return 0.8 + (0.45 * (throwVelocity - 600)) / 1200;
}

/** Nudge set-valued dims (moods, groups, times): toward the winner's members,
 * away from the loser's, small reinforcement where they overlap. */
function updateSetDim<K extends string>(
  weights: Record<K, number>,
  winnerKeys: readonly K[],
  loserKeys: readonly K[],
  factor: number
): void {
  const loserSet = new Set(loserKeys);
  const winnerSet = new Set(winnerKeys);
  for (const k of winnerKeys) {
    weights[k] = clamp(
      weights[k] + (loserSet.has(k) ? REINFORCEMENT : LEARNING_RATE) * factor
    );
  }
  for (const k of loserKeys) {
    if (!winnerSet.has(k)) weights[k] = clamp(weights[k] - LEARNING_RATE * factor);
  }
}

/** Nudge scalar dims: toward the winner's value where they differ, small
 * reinforcement toward the shared value where they agree. */
function updateScalarDim(current: number, winnerVal: number, loserVal: number, factor: number): number {
  if (Math.abs(winnerVal - loserVal) < 1e-9) {
    return clamp(current + REINFORCEMENT * winnerVal * factor);
  }
  return clamp(current + (LEARNING_RATE * factor * (winnerVal - loserVal)) / 2);
}

function allWeights(p: UserProfile): number[] {
  return [
    ...Object.values(p.moodWeights),
    p.settingWeight,
    p.costWeight,
    p.energyWeight,
    p.durationWeight,
    ...Object.values(p.socialWeights),
    ...Object.values(p.timeOfDayWeights),
  ];
}

function scaleWeights(p: UserProfile, s: number): void {
  for (const m of Object.keys(p.moodWeights) as Mood[]) p.moodWeights[m] *= s;
  p.settingWeight *= s;
  p.costWeight *= s;
  p.energyWeight *= s;
  p.durationWeight *= s;
  for (const g of Object.keys(p.socialWeights) as GroupType[]) p.socialWeights[g] *= s;
  for (const t of Object.keys(p.timeOfDayWeights) as TimeOfDay[]) p.timeOfDayWeights[t] *= s;
}

/** Renormalize occasionally so no dimension runs away. */
function renormalize(p: UserProfile): void {
  const maxAbs = Math.max(...allWeights(p).map(Math.abs));
  if (maxAbs > RENORMALIZE_CEILING) {
    scaleWeights(p, RENORMALIZE_CEILING / maxAbs);
  }
}

/** One pairwise preference: runs synchronously at pick time. */
export function applyPickUpdate(
  profile: UserProfile,
  winner: Idea,
  loser: Idea,
  options: { factor?: number; now?: Date } = {}
): UserProfile {
  const factor = options.factor ?? 1;
  const p = cloneProfile(profile);

  updateSetDim(p.moodWeights, winner.moods, loser.moods, factor);
  updateSetDim(p.socialWeights, winner.groupFit, loser.groupFit, factor);
  updateSetDim(p.timeOfDayWeights, winner.timeOfDay, loser.timeOfDay, factor);
  p.settingWeight = updateScalarDim(
    p.settingWeight,
    settingValue(winner.setting),
    settingValue(loser.setting),
    factor
  );
  p.costWeight = updateScalarDim(p.costWeight, costValue(winner.costTier), costValue(loser.costTier), factor);
  p.energyWeight = updateScalarDim(p.energyWeight, energyValue(winner.energy), energyValue(loser.energy), factor);
  p.durationWeight = updateScalarDim(
    p.durationWeight,
    durationValue(winner.durationMin),
    durationValue(loser.durationMin),
    factor
  );

  renormalize(p);
  p.updatedAt = (options.now ?? new Date()).toISOString();
  return p;
}

/** Absolute nudge toward (factor > 0) or away from (factor < 0) one idea's attributes. */
function applyIdeaNudge(p: UserProfile, idea: Idea, factor: number): void {
  const delta = LEARNING_RATE * factor;
  for (const m of idea.moods) p.moodWeights[m] = clamp(p.moodWeights[m] + delta);
  for (const g of idea.groupFit) p.socialWeights[g] = clamp(p.socialWeights[g] + delta);
  for (const t of idea.timeOfDay) p.timeOfDayWeights[t] = clamp(p.timeOfDayWeights[t] + delta);
  p.settingWeight = clamp(p.settingWeight + delta * settingValue(idea.setting));
  p.costWeight = clamp(p.costWeight + delta * costValue(idea.costTier));
  p.energyWeight = clamp(p.energyWeight + delta * energyValue(idea.energy));
  p.durationWeight = clamp(p.durationWeight + delta * durationValue(idea.durationMin));
}

/**
 * Post-experience feedback — the strongest signal. 4–5 stars ≈ 3× pick
 * strength toward the plan's ideas; 1–2 stars a negative update of similar
 * magnitude; completion without a rating is a mild positive.
 */
export function applyRatingUpdate(
  profile: UserProfile,
  ideas: Idea[],
  rating: 1 | 2 | 3 | 4 | 5 | undefined,
  options: { now?: Date } = {}
): UserProfile {
  const factor =
    rating === undefined
      ? COMPLETED_UNRATED
      : rating >= 4
        ? RATING_POSITIVE
        : rating <= 2
          ? RATING_NEGATIVE
          : RATING_NEUTRAL;

  const p = cloneProfile(profile);
  for (const idea of ideas) applyIdeaNudge(p, idea, factor);
  renormalize(p);
  p.updatedAt = (options.now ?? new Date()).toISOString();
  return p;
}

/** User-added ideas are strong positive updates — the user told us what they like. */
export function applyUserIdeaUpdate(
  profile: UserProfile,
  idea: Idea,
  options: { now?: Date } = {}
): UserProfile {
  const p = cloneProfile(profile);
  applyIdeaNudge(p, idea, USER_IDEA_FACTOR);
  renormalize(p);
  p.updatedAt = (options.now ?? new Date()).toISOString();
  return p;
}

/** Light time decay per session so the profile tracks who the user is now. */
export function applySessionDecay(profile: UserProfile, options: { now?: Date } = {}): UserProfile {
  const p = cloneProfile(profile);
  scaleWeights(p, SESSION_DECAY);
  p.updatedAt = (options.now ?? new Date()).toISOString();
  return p;
}
