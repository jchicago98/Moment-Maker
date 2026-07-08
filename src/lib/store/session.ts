import { create } from 'zustand';

import { pickFinalIdea } from '@/lib/algorithm/finalIdea';
import {
  applyPickUpdate,
  applySessionDecay,
  createEmptyProfile,
  velocityFactor,
} from '@/lib/algorithm/learning';
import { pickPair } from '@/lib/algorithm/pairing';
import { hardFilter, scoreIdea, type SessionContext } from '@/lib/algorithm/scoring';
import {
  getAllIdeas,
  getProfile,
  getStatsFor,
  logPickEvent,
  recordChosen,
  recordShown,
  saveProfile,
} from '@/lib/db/database';
import { daypartWord } from '@/lib/daypart';
import { currentOutlook } from '@/lib/weather';
import type { Idea, SessionSetup, TimeOfDay, UserProfile } from '@/lib/types';

export const MAX_ROUNDS = 5; // never more — decision fatigue

interface SessionState {
  sessionId: string | null;
  setup: SessionSetup;
  round: number; // 0-based, count of completed picks
  totalRounds: number;
  currentPair: [Idea, Idea] | null;
  winners: Idea[];
  /** The reveal payoff: one freshly generated idea (plus a re-roll spare). */
  finalIdea: Idea | null;
  runnerUp: Idea | null;

  setSetup: (setup: Partial<SessionSetup>) => void;
  startSession: () => boolean; // false if not enough ideas to build pairs
  pick: (winner: Idea, loser: Idea, throwVelocity?: number) => void;
  surpriseMe: () => void;
  reset: () => void;
}

// Session-scoped working data the UI never reads — kept out of the store to
// avoid re-renders on internals.
interface SessionInternals {
  profile: UserProfile;
  pool: Idea[];
  scores: Map<string, number>;
  timesShown: Map<string, number>;
  usedIds: Set<string>;
}

let internals: SessionInternals | null = null;

function contextFor(setup: SessionSetup): SessionContext {
  return {
    group: setup.group,
    timeBudgetMin: setup.timeBudgetMin,
    costCap: setup.costCap,
    timeOfDay: daypartWord() as TimeOfDay,
    weather: currentOutlook(), // cached Open-Meteo outlook; 'unknown' never filters
  };
}

function rescore(ints: SessionInternals): void {
  const stats = getStatsFor(ints.pool.map((i) => i.id));
  ints.scores = new Map(
    ints.pool.map((idea) => [
      idea.id,
      scoreIdea(ints.profile, idea, {
        stats: stats.get(idea.id),
        currentSession: ints.profile.totalSessions,
        rng: Math.random,
      }),
    ])
  );
  ints.timesShown = new Map(
    ints.pool.map((idea) => [idea.id, stats.get(idea.id)?.timesShown ?? 0])
  );
}

function nextPair(ints: SessionInternals, round: number): [Idea, Idea] | null {
  const available = ints.pool.filter((i) => !ints.usedIds.has(i.id));
  const pair = pickPair(available, ints.profile, {
    roundIndex: round,
    totalRounds: MAX_ROUNDS,
    scores: ints.scores,
    timesShown: ints.timesShown,
  });
  if (pair) {
    ints.usedIds.add(pair[0].id);
    ints.usedIds.add(pair[1].id);
    recordShown([pair[0].id, pair[1].id], ints.profile.totalSessions);
  }
  return pair;
}

/** After the last pick: generate ONE fresh idea (plus a re-roll spare) from
 * the post-session profile, excluding everything shown during the quiz. */
function finishSession(
  set: (partial: Partial<SessionState>) => void,
  winners: Idea[],
  round: number
): void {
  if (!internals) return;
  const stats = getStatsFor(internals.pool.map((i) => i.id));
  const { best, runnerUp } = pickFinalIdea(internals.pool, internals.usedIds, internals.profile, {
    stats,
    currentSession: internals.profile.totalSessions,
    rng: Math.random,
  });
  if (best) recordShown([best.id], internals.profile.totalSessions);
  set({ winners, round, currentPair: null, finalIdea: best, runnerUp });
}

const defaultSetup: SessionSetup = {
  group: 'couple',
  timeBudgetMin: 180,
  costCap: 2,
};

export const useSession = create<SessionState>((set, get) => ({
  sessionId: null,
  setup: defaultSetup,
  round: 0,
  totalRounds: MAX_ROUNDS,
  currentPair: null,
  winners: [],
  finalIdea: null,
  runnerUp: null,

  setSetup: (partial) => set((s) => ({ setup: { ...s.setup, ...partial } })),

  startSession: () => {
    const { setup } = get();

    // Light decay per session so the profile tracks who the user is now.
    let profile = getProfile() ?? createEmptyProfile();
    profile = applySessionDecay(profile);
    profile.totalSessions += 1;
    saveProfile(profile);

    let pool = hardFilter(getAllIdeas(), contextFor(setup));
    if (pool.length < 2) {
      // Relax the time-of-day constraint before giving up — never block a session.
      pool = getAllIdeas().filter(
        (i) =>
          i.durationMin <= setup.timeBudgetMin &&
          i.costTier <= setup.costCap &&
          i.groupFit.includes(setup.group)
      );
    }
    if (pool.length < 2) return false;

    internals = {
      profile,
      pool,
      scores: new Map(),
      timesShown: new Map(),
      usedIds: new Set(),
    };
    rescore(internals);
    const pair = nextPair(internals, 0);
    if (!pair) return false;

    set({
      sessionId: `session-${Date.now()}`,
      round: 0,
      currentPair: pair,
      winners: [],
      finalIdea: null,
      runnerUp: null,
    });
    return true;
  },

  pick: (winner, loser, throwVelocity = 0) => {
    const { sessionId, round, winners } = get();
    if (!sessionId || !internals) return;

    logPickEvent({
      id: `pick-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      sessionId,
      winnerId: winner.id,
      loserId: loser.id,
      throwVelocity,
      timestamp: new Date().toISOString(),
    });
    recordChosen(winner.id);

    // The algorithm learns on EVERY pick, synchronously — a few
    // multiplications, never lagging the throw animation (§7.1).
    internals.profile = applyPickUpdate(internals.profile, winner, loser, {
      factor: velocityFactor(throwVelocity),
    });
    saveProfile(internals.profile);

    const nextWinners = [...winners, winner];
    const nextRound = round + 1;

    if (nextRound >= MAX_ROUNDS) {
      finishSession(set, nextWinners, nextRound);
      return;
    }

    // Re-score with the freshly updated profile, then pick the next most
    // informative pair — the soft decision tree narrowing per round.
    rescore(internals);
    const pair = nextPair(internals, nextRound);
    if (!pair) {
      finishSession(set, nextWinners, nextRound);
      return;
    }
    set({ winners: nextWinners, round: nextRound, currentPair: pair });
  },

  surpriseMe: () => {
    // Auto-pick the rest: the higher-scored side of each remaining pair wins.
    // No profile updates — these aren't the user's choices; if the surprise
    // lands, the post-experience rating teaches us instead.
    const { sessionId } = get();
    if (!sessionId || !internals) return;

    let { round, winners, currentPair } = get();
    const picks = [...winners];
    while (round < MAX_ROUNDS && currentPair) {
      const [a, b] = currentPair;
      const scoreOf = (i: Idea) => internals!.scores.get(i.id) ?? 0;
      const winner = scoreOf(a) >= scoreOf(b) ? a : b;
      const loser = winner === a ? b : a;
      logPickEvent({
        id: `pick-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        sessionId,
        winnerId: winner.id,
        loserId: loser.id,
        throwVelocity: 0,
        timestamp: new Date().toISOString(),
      });
      recordChosen(winner.id);
      picks.push(winner);
      round += 1;
      currentPair = round < MAX_ROUNDS ? nextPair(internals, round) : null;
    }

    finishSession(set, picks, round);
  },

  reset: () => {
    internals = null;
    set({
      sessionId: null,
      round: 0,
      currentPair: null,
      winners: [],
      finalIdea: null,
      runnerUp: null,
    });
  },
}));
