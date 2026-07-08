// Plan assembly (CLAUDE.md §7.2.5–6): compose 2–3 complementary steps around
// the session's strongest signals, respecting the time budget and logical
// ordering (outdoor/daylight steps first, wind-down last). The plan is built
// from the session's winners so the reveal visibly reflects the picks — the
// moment users learn "my choices mattered" is the retention engine.
// Pure TypeScript — no React, no Expo.

import { dotScore } from '@/lib/algorithm/scoring';
import type { Idea, Mood, Plan, PlanStep, SessionSetup, UserProfile } from '@/lib/types';

// Complementary roles a well-rounded plan draws from.
type Role = 'food' | 'activity' | 'winddown';

const WINDDOWN_MOODS: Mood[] = ['cozy', 'calm', 'chill'];
const ACTIVITY_MOODS: Mood[] = ['active', 'adventurous', 'creative', 'silly', 'social'];

function roleOf(idea: Idea): Role {
  if (idea.moods.includes('tasty')) return 'food';
  if (idea.moods.some((m) => ACTIVITY_MOODS.includes(m))) return 'activity';
  return 'winddown';
}

function isWinddown(idea: Idea): boolean {
  return idea.moods.some((m) => WINDDOWN_MOODS.includes(m)) && idea.energy === 1;
}

const TIME_RANK: Record<string, number> = { morning: 0, afternoon: 1, evening: 2, night: 3 };

function timeRank(idea: Idea): number {
  return Math.min(...idea.timeOfDay.map((t) => TIME_RANK[t]));
}

/** Ordering: outdoor/daylight-dependent steps first, higher energy before
 * lower, wind-down last, earlier times-of-day first. */
function orderSteps(ideas: Idea[]): Idea[] {
  return [...ideas].sort((a, b) => {
    const windA = isWinddown(a) ? 1 : 0;
    const windB = isWinddown(b) ? 1 : 0;
    if (windA !== windB) return windA - windB;
    const outA = a.setting === 'outdoor' && a.weatherSensitive ? 0 : 1;
    const outB = b.setting === 'outdoor' && b.weatherSensitive ? 0 : 1;
    if (outA !== outB) return outA - outB;
    const rankA = timeRank(a);
    const rankB = timeRank(b);
    if (rankA !== rankB) return rankA - rankB;
    return b.energy - a.energy;
  });
}

/** The mood the session's picks converged on, weighted by the profile. */
export function dominantMood(winners: Idea[], profile: UserProfile): Mood {
  const tallies = new Map<Mood, number>();
  for (const idea of winners) {
    for (const m of idea.moods) {
      tallies.set(m, (tallies.get(m) ?? 0) + 1 + Math.max(0, profile.moodWeights[m]));
    }
  }
  let best: Mood = 'cozy';
  let bestTally = -Infinity;
  for (const [mood, tally] of tallies) {
    if (tally > bestTally) {
      bestTally = tally;
      best = mood;
    }
  }
  return best;
}

function daypartWord(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}

export interface AssembleOptions {
  now?: Date;
}

export function assemblePlan(
  winners: Idea[],
  profile: UserProfile,
  setup: SessionSetup,
  options: AssembleOptions = {}
): Plan {
  const now = options.now ?? new Date();
  const ranked = [...winners].sort((a, b) => dotScore(profile, b) - dotScore(profile, a));

  const targetSteps = setup.timeBudgetMin >= 180 ? 3 : setup.timeBudgetMin >= 90 ? 2 : 1;

  // Greedy pick around the strongest signal, preferring ideas that add a new
  // complementary role (food / activity / wind-down) over more of the same.
  const chosen: Idea[] = [];
  const rolesCovered = new Set<Role>();
  let remaining = setup.timeBudgetMin;

  const take = (idea: Idea) => {
    chosen.push(idea);
    rolesCovered.add(roleOf(idea));
    remaining -= idea.durationMin;
  };

  if (ranked.length > 0) take(ranked[0]); // anchor: the strongest winner

  while (chosen.length < targetSteps) {
    const candidates = ranked.filter((i) => !chosen.includes(i) && i.durationMin <= remaining);
    if (candidates.length === 0) break;
    const fresh = candidates.find((i) => !rolesCovered.has(roleOf(i)));
    take(fresh ?? candidates[0]);
  }

  const ordered = orderSteps(chosen);

  const start = new Date(now);
  start.setMinutes(start.getMinutes() + 30 - (start.getMinutes() % 30), 0, 0);
  let cursor = new Date(start);
  const steps: PlanStep[] = ordered.map((idea) => {
    const time = cursor.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    cursor = new Date(cursor.getTime() + idea.durationMin * 60_000);
    return {
      time,
      icon: idea.icon,
      title: idea.title,
      tip: idea.description,
      durationMin: idea.durationMin,
    };
  });

  const totalMin = ordered.reduce((sum, i) => sum + i.durationMin, 0);
  const costTier = ordered.reduce<number>((max, i) => Math.max(max, i.costTier), 0) as Plan['costTier'];

  return {
    id: `plan-${now.getTime()}`,
    title: `Your ${dominantMood(winners, profile)} ${daypartWord(now)}`,
    steps,
    ideaIds: ordered.map((i) => i.id),
    totalMin,
    costTier,
    createdAt: now.toISOString(),
  };
}
