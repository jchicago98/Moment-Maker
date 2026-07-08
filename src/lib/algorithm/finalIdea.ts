// The reveal's payoff: after five picks, generate ONE fresh idea from the
// post-session profile. Ideas the user just saw are excluded — the reveal
// must feel newly generated, not like an echo of the quiz. Returns a runner-up
// for the "maybe another" re-roll. Pure TypeScript — no React, no Expo.

import { scoreIdea, type IdeaStats } from '@/lib/algorithm/scoring';
import type { Idea, UserProfile } from '@/lib/types';

export interface FinalIdeaOptions {
  stats?: Map<string, IdeaStats>;
  currentSession: number;
  rng?: () => number;
}

export interface FinalIdeaResult {
  best: Idea | null;
  runnerUp: Idea | null;
}

export function pickFinalIdea(
  pool: Idea[],
  excludeIds: Set<string>,
  profile: UserProfile,
  opts: FinalIdeaOptions
): FinalIdeaResult {
  let candidates = pool.filter((idea) => !excludeIds.has(idea.id));
  if (candidates.length === 0) candidates = pool; // tiny pool: an echo beats nothing

  const scored = candidates
    .map((idea) => ({
      idea,
      score: scoreIdea(profile, idea, {
        stats: opts.stats?.get(idea.id),
        currentSession: opts.currentSession,
        rng: opts.rng,
      }),
    }))
    .sort((a, b) => b.score - a.score);

  return {
    best: scored[0]?.idea ?? null,
    runnerUp: scored[1]?.idea ?? null,
  };
}
