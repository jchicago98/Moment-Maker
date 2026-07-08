// Actions on saved plans and user ideas — the feedback loops of §7.1: ratings
// are the strongest signal, completion without rating is a mild positive, and
// user-added ideas are strong positive updates.

import {
  applyRatingUpdate,
  applyUserIdeaUpdate,
  createEmptyProfile,
} from '@/lib/algorithm/learning';
import { scoreIdea } from '@/lib/algorithm/scoring';
import {
  getAllIdeas,
  getExperienceForPlan,
  getIdeasByIds,
  getPlanById,
  getProfile,
  insertIdea,
  saveProfile,
  savePlan,
  upsertExperience,
} from '@/lib/db/database';
import type { Idea, Plan } from '@/lib/types';

function applyPlanFeedback(planId: string, rating: 1 | 2 | 3 | 4 | 5 | undefined): void {
  const plan = getPlanById(planId);
  if (!plan) return;
  const ideas = getIdeasByIds(plan.ideaIds);
  const profile = getProfile() ?? createEmptyProfile();
  saveProfile(applyRatingUpdate(profile, ideas, rating));
}

/** Rate a plan 1–5★. The 3× learning update applies only on the first rating —
 * changing your mind later edits the record, not the profile twice. */
export function ratePlan(planId: string, rating: 1 | 2 | 3 | 4 | 5): void {
  const existing = getExperienceForPlan(planId);
  if (!existing?.rating) {
    applyPlanFeedback(planId, rating);
  }
  upsertExperience(planId, { rating, completed: true });
}

/** "We did it!" — completion without a rating still teaches, mildly. */
export function completePlan(planId: string): void {
  const existing = getExperienceForPlan(planId);
  if (!existing?.completed && !existing?.rating) {
    applyPlanFeedback(planId, undefined);
  }
  upsertExperience(planId, { completed: true });
}

export function attachPhoto(planId: string, photoUri: string): void {
  upsertExperience(planId, { photoUri });
}

/** Re-roll one step of a plan using the current profile. Keeps the slot's
 * time; the replacement must roughly fit the old step's duration. */
export function swapPlanStep(planId: string, stepIndex: number): Plan | null {
  const plan = getPlanById(planId);
  if (!plan || stepIndex < 0 || stepIndex >= plan.steps.length) return null;

  const profile = getProfile() ?? createEmptyProfile();
  const oldStep = plan.steps[stepIndex];
  const usedIds = new Set(plan.ideaIds);

  const candidates = getAllIdeas().filter(
    (i) => !usedIds.has(i.id) && i.durationMin <= oldStep.durationMin + 30
  );
  if (candidates.length === 0) return null;

  let best: Idea | null = null;
  let bestScore = -Infinity;
  for (const idea of candidates) {
    const score = scoreIdea(profile, idea, {
      currentSession: profile.totalSessions,
      rng: Math.random,
    });
    if (score > bestScore) {
      bestScore = score;
      best = idea;
    }
  }
  if (!best) return null;

  const steps = [...plan.steps];
  steps[stepIndex] = {
    time: oldStep.time,
    icon: best.icon,
    title: best.title,
    tip: best.description,
    durationMin: best.durationMin,
  };
  const ideaIds = [...plan.ideaIds];
  ideaIds[stepIndex] = best.id;

  const ideas = getIdeasByIds(ideaIds);
  const updated: Plan = {
    ...plan,
    steps,
    ideaIds,
    totalMin: ideas.reduce((sum, i) => sum + i.durationMin, 0),
    costTier: ideas.reduce<number>((max, i) => Math.max(max, i.costTier), 0) as Plan['costTier'],
  };
  savePlan(updated);
  return updated;
}

export interface NewIdeaInput {
  title: string;
  description: string;
  moods: Idea['moods'];
  setting: Idea['setting'];
  costTier: Idea['costTier'];
  durationMin: number;
  groupFit: Idea['groupFit'];
  energy: Idea['energy'];
}

/** Add a user idea: it enters the deck AND counts as a strong positive signal. */
export function addUserIdea(input: NewIdeaInput): Idea {
  const idea: Idea = {
    id: `user-${Date.now()}`,
    title: input.title,
    description: input.description,
    moods: input.moods,
    setting: input.setting,
    costTier: input.costTier,
    durationMin: input.durationMin,
    groupFit: input.groupFit,
    energy: input.energy,
    timeOfDay: ['morning', 'afternoon', 'evening', 'night'], // user ideas fit any time
    weatherSensitive: input.setting === 'outdoor',
    requiresTravel: false,
    icon: 'sparkles',
    source: 'user',
    createdAt: new Date().toISOString(),
    broadAppeal: 0.5,
  };
  insertIdea(idea);
  const profile = getProfile() ?? createEmptyProfile();
  saveProfile(applyUserIdeaUpdate(profile, idea));
  return idea;
}
