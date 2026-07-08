import { describe, expect, it } from 'vitest';

import {
  applyPickUpdate,
  applyRatingUpdate,
  applySessionDecay,
  applyUserIdeaUpdate,
  createEmptyProfile,
  LEARNING_RATE,
  REINFORCEMENT,
  SESSION_DECAY,
  velocityFactor,
} from '@/lib/algorithm/learning';
import { makeIdea } from './helpers';

describe('applyPickUpdate', () => {
  it('nudges mood weights toward the winner and away from the loser', () => {
    const winner = makeIdea({ moods: ['cozy', 'tasty'] });
    const loser = makeIdea({ moods: ['active'] });
    const p = applyPickUpdate(createEmptyProfile(), winner, loser);

    expect(p.moodWeights.cozy).toBeCloseTo(LEARNING_RATE);
    expect(p.moodWeights.tasty).toBeCloseTo(LEARNING_RATE);
    expect(p.moodWeights.active).toBeCloseTo(-LEARNING_RATE);
    expect(p.moodWeights.silly).toBe(0);
  });

  it('applies a small reinforcement to shared attributes', () => {
    const winner = makeIdea({ moods: ['cozy', 'tasty'] });
    const loser = makeIdea({ moods: ['cozy', 'active'] });
    const p = applyPickUpdate(createEmptyProfile(), winner, loser);

    expect(p.moodWeights.cozy).toBeCloseTo(REINFORCEMENT);
  });

  it('moves scalar dimensions toward the winner where they differ', () => {
    const winner = makeIdea({ setting: 'outdoor', energy: 3 });
    const loser = makeIdea({ setting: 'indoor', energy: 1 });
    const p = applyPickUpdate(createEmptyProfile(), winner, loser);

    expect(p.settingWeight).toBeCloseTo(LEARNING_RATE); // (1 − (−1))/2 × lr
    expect(p.energyWeight).toBeCloseTo(LEARNING_RATE);
  });

  it('reinforces shared scalar values instead of nudging', () => {
    const winner = makeIdea({ setting: 'outdoor' });
    const loser = makeIdea({ setting: 'outdoor' });
    const p = applyPickUpdate(createEmptyProfile(), winner, loser);

    expect(p.settingWeight).toBeCloseTo(REINFORCEMENT);
  });

  it('scales the nudge by the velocity factor', () => {
    const winner = makeIdea({ moods: ['silly'] });
    const loser = makeIdea({ moods: ['calm'] });
    const gentle = applyPickUpdate(createEmptyProfile(), winner, loser, { factor: 0.8 });
    const fling = applyPickUpdate(createEmptyProfile(), winner, loser, { factor: 1.25 });

    expect(fling.moodWeights.silly).toBeGreaterThan(gentle.moodWeights.silly);
    expect(gentle.moodWeights.silly).toBeCloseTo(LEARNING_RATE * 0.8);
  });

  it('keeps every weight within [-1, 1] and never lets one run away', () => {
    let p = createEmptyProfile();
    const winner = makeIdea({ moods: ['cozy'], setting: 'outdoor', energy: 3, costTier: 3 });
    const loser = makeIdea({ moods: ['active'], setting: 'indoor', energy: 1, costTier: 0 });
    for (let i = 0; i < 200; i++) {
      p = applyPickUpdate(p, winner, loser, { factor: 1.25 });
    }

    expect(p.moodWeights.cozy).toBeLessThanOrEqual(1);
    expect(p.moodWeights.active).toBeGreaterThanOrEqual(-1);
    expect(p.settingWeight).toBeLessThanOrEqual(1);
  });

  it('does not mutate the input profile', () => {
    const original = createEmptyProfile();
    applyPickUpdate(original, makeIdea({ moods: ['silly'] }), makeIdea({ moods: ['calm'] }));
    expect(original.moodWeights.silly).toBe(0);
  });
});

describe('velocityFactor', () => {
  it('is neutral for taps, boosted for hard flings, damped for hesitant drags', () => {
    expect(velocityFactor(0)).toBe(1);
    expect(velocityFactor(300)).toBeCloseTo(0.8);
    expect(velocityFactor(2500)).toBeCloseTo(1.25);
    expect(velocityFactor(1200)).toBeGreaterThan(0.8);
    expect(velocityFactor(1200)).toBeLessThan(1.25);
  });
});

describe('applyRatingUpdate', () => {
  const idea = makeIdea({ moods: ['romantic'], setting: 'outdoor' });

  it('applies ~3× pick strength for a 5-star rating', () => {
    const p = applyRatingUpdate(createEmptyProfile(), [idea], 5);
    expect(p.moodWeights.romantic).toBeCloseTo(LEARNING_RATE * 3);
    expect(p.settingWeight).toBeCloseTo(LEARNING_RATE * 3);
  });

  it('applies a negative update of similar magnitude for 1–2 stars', () => {
    const p = applyRatingUpdate(createEmptyProfile(), [idea], 1);
    expect(p.moodWeights.romantic).toBeCloseTo(-LEARNING_RATE * 3);
  });

  it('treats completion without a rating as a mild positive', () => {
    const p = applyRatingUpdate(createEmptyProfile(), [idea], undefined);
    expect(p.moodWeights.romantic).toBeGreaterThan(0);
    expect(p.moodWeights.romantic).toBeLessThan(LEARNING_RATE * 3);
  });
});

describe('applyUserIdeaUpdate', () => {
  it('applies ~2× pick strength toward the added idea', () => {
    const idea = makeIdea({ moods: ['creative'] });
    const p = applyUserIdeaUpdate(createEmptyProfile(), idea);
    expect(p.moodWeights.creative).toBeCloseTo(LEARNING_RATE * 2);
  });
});

describe('applySessionDecay', () => {
  it('multiplies every weight by the decay factor', () => {
    let p = applyPickUpdate(
      createEmptyProfile(),
      makeIdea({ moods: ['cozy'], setting: 'outdoor' }),
      makeIdea({ moods: ['active'], setting: 'indoor' })
    );
    const before = p.moodWeights.cozy;
    p = applySessionDecay(p);
    expect(p.moodWeights.cozy).toBeCloseTo(before * SESSION_DECAY);
    expect(p.settingWeight).toBeCloseTo(LEARNING_RATE * SESSION_DECAY);
  });
});
