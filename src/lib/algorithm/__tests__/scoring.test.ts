import { describe, expect, it } from 'vitest';

import { applyPickUpdate, createEmptyProfile } from '@/lib/algorithm/learning';
import { dotScore, hardFilter, scoreIdea, type SessionContext } from '@/lib/algorithm/scoring';
import { makeIdea } from './helpers';

const ctx: SessionContext = {
  group: 'couple',
  timeBudgetMin: 120,
  costCap: 2,
  timeOfDay: 'evening',
  weather: 'unknown',
};

describe('hardFilter', () => {
  it('filters by time budget, cost cap, group, and time of day', () => {
    const tooLong = makeIdea({ durationMin: 180 });
    const tooPricey = makeIdea({ costTier: 3 });
    const wrongGroup = makeIdea({ groupFit: ['family'] });
    const wrongTime = makeIdea({ timeOfDay: ['morning'] });
    const fits = makeIdea({ durationMin: 90, costTier: 1, groupFit: ['couple'], timeOfDay: ['evening'] });

    const result = hardFilter([tooLong, tooPricey, wrongGroup, wrongTime, fits], ctx);
    expect(result).toEqual([fits]);
  });

  it('excludes weather-sensitive outdoor ideas only when weather is bad', () => {
    const picnic = makeIdea({ setting: 'outdoor', weatherSensitive: true });
    const indoorSibling = makeIdea({ setting: 'indoor', weatherSensitive: false });

    expect(hardFilter([picnic, indoorSibling], { ...ctx, weather: 'bad' })).toEqual([indoorSibling]);
    expect(hardFilter([picnic, indoorSibling], { ...ctx, weather: 'good' })).toHaveLength(2);
    // Unknown weather never blocks a session (CLAUDE.md §9).
    expect(hardFilter([picnic, indoorSibling], { ...ctx, weather: 'unknown' })).toHaveLength(2);
  });
});

describe('dotScore', () => {
  it('scores ideas matching the learned profile higher', () => {
    let profile = createEmptyProfile();
    const cozyIndoor = makeIdea({ moods: ['cozy'], setting: 'indoor', energy: 1 });
    const activeOutdoor = makeIdea({ moods: ['active'], setting: 'outdoor', energy: 3 });
    for (let i = 0; i < 10; i++) {
      profile = applyPickUpdate(profile, cozyIndoor, activeOutdoor);
    }

    expect(dotScore(profile, cozyIndoor)).toBeGreaterThan(dotScore(profile, activeOutdoor));
  });
});

describe('scoreIdea', () => {
  it('blends 50/50 with the crowd-pleaser prior during cold start', () => {
    const profile = createEmptyProfile(); // totalSessions = 0
    const crowdPleaser = makeIdea({ broadAppeal: 0.95 });
    const nicheIdea = makeIdea({ broadAppeal: 0.1 });

    const high = scoreIdea(profile, crowdPleaser, { currentSession: 0 });
    const low = scoreIdea(profile, nicheIdea, { currentSession: 0 });
    expect(high).toBeGreaterThan(low);
  });

  it('stops blending the prior after 3 sessions', () => {
    const profile = { ...createEmptyProfile(), totalSessions: 5 };
    const crowdPleaser = makeIdea({ broadAppeal: 0.95 });
    const nicheIdea = makeIdea({ broadAppeal: 0.1 });

    const a = scoreIdea(profile, crowdPleaser, { currentSession: 5 });
    const b = scoreIdea(profile, nicheIdea, { currentSession: 5 });
    expect(a).toBeCloseTo(b); // zero profile, no noise → identical
  });

  it('penalizes ideas shown recently, fading over ~10 sessions', () => {
    const profile = { ...createEmptyProfile(), totalSessions: 20 };
    const idea = makeIdea();

    const fresh = scoreIdea(profile, idea, { currentSession: 20 });
    const justShown = scoreIdea(profile, idea, {
      currentSession: 20,
      stats: { timesShown: 1, timesChosen: 1, lastShownSession: 19 },
    });
    const longAgo = scoreIdea(profile, idea, {
      currentSession: 20,
      stats: { timesShown: 1, timesChosen: 1, lastShownSession: 5 },
    });

    expect(justShown).toBeLessThan(fresh);
    expect(longAgo).toBeCloseTo(fresh);
  });

  it('decays ideas repeatedly shown but never chosen', () => {
    const profile = { ...createEmptyProfile(), totalSessions: 20 };
    const idea = makeIdea();

    const spurned = scoreIdea(profile, idea, {
      currentSession: 20,
      stats: { timesShown: 4, timesChosen: 0, lastShownSession: null },
    });
    const chosenSometimes = scoreIdea(profile, idea, {
      currentSession: 20,
      stats: { timesShown: 4, timesChosen: 1, lastShownSession: null },
    });

    expect(spurned).toBeLessThan(chosenSometimes);
  });

  it('adds bounded injectable noise', () => {
    const profile = { ...createEmptyProfile(), totalSessions: 5 };
    const idea = makeIdea();
    const base = scoreIdea(profile, idea, { currentSession: 5 });
    const noisy = scoreIdea(profile, idea, { currentSession: 5, rng: () => 1 });
    expect(Math.abs(noisy - base)).toBeLessThanOrEqual(0.05 + 1e-9);
  });
});
