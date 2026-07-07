import { create } from 'zustand';

import { getIdeasForSession, logPickEvent } from '@/lib/db/database';
import type { Idea, Plan, PlanStep, SessionSetup } from '@/lib/types';

export const MAX_ROUNDS = 5; // never more — decision fatigue

interface SessionState {
  sessionId: string | null;
  setup: SessionSetup;
  pairs: [Idea, Idea][];
  round: number; // 0-based index into pairs
  winners: Idea[];
  plan: Plan | null;

  setSetup: (setup: Partial<SessionSetup>) => void;
  startSession: () => boolean; // false if not enough ideas to build pairs
  pick: (winner: Idea, loser: Idea, throwVelocity?: number) => void;
  surpriseMe: () => void;
  reset: () => void;
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * M1 pairing: random pairs from the hard-filtered deck.
 * Informative pairing (soft decision tree) arrives with the algorithm in M3.
 */
function buildPairs(ideas: Idea[]): [Idea, Idea][] {
  const shuffled = shuffle(ideas);
  const pairs: [Idea, Idea][] = [];
  for (let i = 0; i + 1 < shuffled.length && pairs.length < MAX_ROUNDS; i += 2) {
    pairs.push([shuffled[i], shuffled[i + 1]]);
  }
  return pairs;
}

/**
 * M1 plan assembly: a simple 2–3 step plan drawn from the session's winners
 * so the reveal already visibly reflects the picks. Real scoring-based
 * assembly arrives in M3.
 */
function assemblePlan(winners: Idea[], setup: SessionSetup): Plan {
  const chosen: Idea[] = [];
  let remaining = setup.timeBudgetMin;
  for (const idea of winners) {
    if (chosen.length >= 3) break;
    if (idea.durationMin <= remaining) {
      chosen.push(idea);
      remaining -= idea.durationMin;
    }
  }
  if (chosen.length === 0 && winners.length > 0) chosen.push(winners[0]);

  const start = new Date();
  start.setMinutes(start.getMinutes() + 30 - (start.getMinutes() % 30)); // next half hour
  let cursor = new Date(start);

  const steps: PlanStep[] = chosen.map((idea) => {
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

  const totalMin = steps.reduce((sum, s) => sum + s.durationMin, 0);
  const costTier = chosen.reduce<number>(
    (max, i) => Math.max(max, i.costTier),
    0
  ) as Plan['costTier'];

  return {
    id: `plan-${Date.now()}`,
    title: planTitle(setup),
    steps,
    totalMin,
    costTier,
    createdAt: new Date().toISOString(),
  };
}

function planTitle(setup: SessionSetup): string {
  const hour = new Date().getHours();
  const daypart = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const who =
    setup.group === 'solo' ? 'Your' : setup.group === 'couple' ? 'Your' : `Your ${setup.group}`;
  return `${who} ${daypart}`;
}

const defaultSetup: SessionSetup = {
  group: 'couple',
  timeBudgetMin: 180,
  costCap: 2,
};

export const useSession = create<SessionState>((set, get) => ({
  sessionId: null,
  setup: defaultSetup,
  pairs: [],
  round: 0,
  winners: [],
  plan: null,

  setSetup: (partial) => set((s) => ({ setup: { ...s.setup, ...partial } })),

  startSession: () => {
    const { setup } = get();
    const deck = getIdeasForSession(setup);
    const pairs = buildPairs(deck);
    if (pairs.length === 0) return false;
    set({
      sessionId: `session-${Date.now()}`,
      pairs,
      round: 0,
      winners: [],
      plan: null,
    });
    return true;
  },

  pick: (winner, loser, throwVelocity = 0) => {
    const { sessionId, round, pairs, winners, setup } = get();
    if (!sessionId) return;

    logPickEvent({
      id: `pick-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      sessionId,
      winnerId: winner.id,
      loserId: loser.id,
      throwVelocity,
      timestamp: new Date().toISOString(),
    });

    const nextWinners = [...winners, winner];
    const isLastRound = round + 1 >= pairs.length;
    set({
      winners: nextWinners,
      round: round + 1,
      plan: isLastRound ? assemblePlan(nextWinners, setup) : null,
    });
  },

  surpriseMe: () => {
    // Auto-pick the rest of the rounds at random and fast-forward to the reveal.
    const { pairs, round } = get();
    for (let i = round; i < pairs.length; i++) {
      const [a, b] = get().pairs[i];
      const winner = Math.random() < 0.5 ? a : b;
      get().pick(winner, winner === a ? b : a, 0);
    }
  },

  reset: () =>
    set({ sessionId: null, pairs: [], round: 0, winners: [], plan: null }),
}));
