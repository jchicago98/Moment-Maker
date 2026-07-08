// Scoring & candidate selection (CLAUDE.md §7.2): hard-filter by context,
// then score by profile · features, minus novelty penalties, plus noise.
// Pure TypeScript — no React, no Expo.

import { costValue, durationValue, energyValue, settingValue } from '@/lib/algorithm/features';
import type { CostTier, GroupType, Idea, TimeOfDay, UserProfile } from '@/lib/types';

export type WeatherOutlook = 'good' | 'bad' | 'unknown';

export interface SessionContext {
  group: GroupType;
  timeBudgetMin: number;
  costCap: CostTier;
  timeOfDay: TimeOfDay;
  weather: WeatherOutlook;
}

export interface IdeaStats {
  timesShown: number;
  timesChosen: number;
  lastShownSession: number | null;
}

export interface ScoreOptions {
  stats?: IdeaStats;
  currentSession: number;
  /** Injectable randomness for the small exploration noise; defaults silent. */
  rng?: () => number;
}

const COLD_START_SESSIONS = 3;
const NOVELTY_WINDOW = 10; // sessions
const NOVELTY_PENALTY = 0.25;
const SPURNED_PENALTY = 0.15; // shown repeatedly, never chosen
const SPURNED_THRESHOLD = 3;
const NOISE = 0.05;

/**
 * Hard filter by context: available time, budget cap, group makeup, time of
 * day, and weather. Weather 'unknown' never excludes anything (CLAUDE.md §9).
 */
export function hardFilter(ideas: Idea[], ctx: SessionContext): Idea[] {
  return ideas.filter((idea) => {
    if (idea.durationMin > ctx.timeBudgetMin) return false;
    if (idea.costTier > ctx.costCap) return false;
    if (!idea.groupFit.includes(ctx.group)) return false;
    if (!idea.timeOfDay.includes(ctx.timeOfDay)) return false;
    if (ctx.weather === 'bad' && idea.setting === 'outdoor' && idea.weatherSensitive) return false;
    return true;
  });
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Profile · features, normalized to roughly [-1, 1]. */
export function dotScore(profile: UserProfile, idea: Idea): number {
  const moodTerm = average(idea.moods.map((m) => profile.moodWeights[m]));
  const socialTerm = average(idea.groupFit.map((g) => profile.socialWeights[g]));
  const timeTerm = average(idea.timeOfDay.map((t) => profile.timeOfDayWeights[t]));
  const settingTerm = profile.settingWeight * settingValue(idea.setting);
  const costTerm = profile.costWeight * costValue(idea.costTier);
  const energyTerm = profile.energyWeight * energyValue(idea.energy);
  const durationTerm = profile.durationWeight * durationValue(idea.durationMin);
  return (moodTerm + socialTerm + timeTerm + settingTerm + costTerm + energyTerm + durationTerm) / 7;
}

/**
 * Full score: dot product, blended 50/50 with the crowd-pleaser prior until
 * the profile has seen ≥3 sessions, minus a novelty penalty for ideas shown
 * in the last ~10 sessions, minus a decay for ideas repeatedly shown but
 * never chosen, plus small random noise.
 */
export function scoreIdea(profile: UserProfile, idea: Idea, opts: ScoreOptions): number {
  let score = dotScore(profile, idea);

  if (profile.totalSessions < COLD_START_SESSIONS) {
    const prior = idea.broadAppeal * 2 - 1; // 0..1 → −1..+1
    score = score * 0.5 + prior * 0.5;
  }

  const stats = opts.stats;
  if (stats) {
    if (stats.lastShownSession !== null) {
      const age = opts.currentSession - stats.lastShownSession;
      if (age >= 0 && age < NOVELTY_WINDOW) {
        score -= NOVELTY_PENALTY * (1 - age / NOVELTY_WINDOW);
      }
    }
    if (stats.timesShown >= SPURNED_THRESHOLD && stats.timesChosen === 0) {
      score -= SPURNED_PENALTY;
    }
  }

  if (opts.rng) {
    score += (opts.rng() * 2 - 1) * NOISE;
  }

  return score;
}
