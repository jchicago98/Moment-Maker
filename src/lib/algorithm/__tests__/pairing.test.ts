import { describe, expect, it } from 'vitest';

import { createEmptyProfile } from '@/lib/algorithm/learning';
import { pairInformativeness, pickPair } from '@/lib/algorithm/pairing';
import type { Idea, UserProfile } from '@/lib/types';
import { cyclingRng, makeIdea } from './helpers';

function scoresFor(pool: Idea[], fn: (idea: Idea, i: number) => number): Map<string, number> {
  return new Map(pool.map((idea, i) => [idea.id, fn(idea, i)]));
}

describe('pairInformativeness', () => {
  it('rates pairs that differ on uncertain dimensions as more informative', () => {
    const profile = createEmptyProfile(); // everything uncertain
    const cozyIndoor = makeIdea({ moods: ['cozy'], setting: 'indoor', energy: 1 });
    const activeOutdoor = makeIdea({ moods: ['active'], setting: 'outdoor', energy: 3 });
    const cozyIndoorToo = makeIdea({ moods: ['cozy'], setting: 'indoor', energy: 1 });

    const contrasting = pairInformativeness(profile, cozyIndoor, activeOutdoor);
    const similar = pairInformativeness(profile, cozyIndoor, cozyIndoorToo);
    expect(contrasting).toBeGreaterThan(similar);
  });

  it('weighs differences on already-certain dimensions less', () => {
    const uncertain = createEmptyProfile();
    const certain: UserProfile = { ...createEmptyProfile(), settingWeight: 0.9 };
    const indoor = makeIdea({ moods: ['cozy'], setting: 'indoor' });
    const outdoor = makeIdea({ moods: ['cozy'], setting: 'outdoor' });

    expect(pairInformativeness(uncertain, indoor, outdoor)).toBeGreaterThan(
      pairInformativeness(certain, indoor, outdoor)
    );
  });
});

describe('pickPair', () => {
  it('returns two distinct ideas from the pool', () => {
    const pool = Array.from({ length: 12 }, () => makeIdea());
    const pair = pickPair(pool, createEmptyProfile(), {
      roundIndex: 0,
      totalRounds: 5,
      scores: scoresFor(pool, () => 0),
      rng: cyclingRng([0.9, 0.3, 0.7, 0.1, 0.5]),
    });

    expect(pair).not.toBeNull();
    expect(pair![0].id).not.toBe(pair![1].id);
    expect(pool).toContain(pair![0]);
    expect(pool).toContain(pair![1]);
  });

  it('returns null when the pool is too small', () => {
    expect(
      pickPair([makeIdea()], createEmptyProfile(), {
        roundIndex: 0,
        totalRounds: 5,
        scores: new Map(),
      })
    ).toBeNull();
  });

  it('narrows toward the winner-space in later rounds', () => {
    // 30 ideas with a steep score gradient; identical features so
    // informativeness can't dominate the choice.
    const pool = Array.from({ length: 30 }, () => makeIdea());
    const scores = scoresFor(pool, (_, i) => 1 - i / 30); // pool[0] scores best
    const topIds = new Set(pool.slice(0, 12).map((i) => i.id));

    const pair = pickPair(pool, createEmptyProfile(), {
      roundIndex: 4,
      totalRounds: 5,
      scores,
      explorationRate: 0, // isolate the narrowing behaviour
      rng: cyclingRng([0.05, 0.35, 0.65, 0.95, 0.2, 0.5, 0.8]),
    });

    expect(topIds.has(pair![0].id)).toBe(true);
    expect(topIds.has(pair![1].id)).toBe(true);
  });

  it('injects a wildcard from outside the focus when exploration triggers', () => {
    // Focus at round 4 is the top ~40%; the wildcard must come from beyond it.
    const pool = Array.from({ length: 20 }, () => makeIdea());
    const scores = scoresFor(pool, (_, i) => 1 - i / 20);
    const focusIds = new Set(pool.slice(0, 8).map((i) => i.id));

    const pair = pickPair(pool, createEmptyProfile(), {
      roundIndex: 4,
      totalRounds: 5,
      scores,
      explorationRate: 1, // always explore
      timesShown: new Map(),
      rng: cyclingRng([0.05, 0.35, 0.65, 0.95, 0.2, 0.5, 0.8]),
    });

    const outsideFocus = pair!.filter((idea) => !focusIds.has(idea.id));
    expect(outsideFocus.length).toBeGreaterThanOrEqual(1);
  });

  it('prefers rarely-shown ideas as wildcards', () => {
    const pool = Array.from({ length: 20 }, () => makeIdea());
    const scores = scoresFor(pool, (_, i) => 1 - i / 20);
    // Every idea outside the focus has been shown a lot except one.
    const timesShown = new Map(pool.slice(8).map((idea) => [idea.id, 5]));
    const hiddenGem = pool[15];
    timesShown.set(hiddenGem.id, 0);

    const pair = pickPair(pool, createEmptyProfile(), {
      roundIndex: 4,
      totalRounds: 5,
      scores,
      explorationRate: 1,
      timesShown,
      rng: cyclingRng([0.05, 0.35, 0.65, 0.95, 0.2, 0.5, 0.8]),
    });

    expect(pair!.map((i) => i.id)).toContain(hiddenGem.id);
  });
});
