import { describe, expect, it } from 'vitest';

import { assemblePlan, dominantMood } from '@/lib/algorithm/assembly';
import { applyPickUpdate, createEmptyProfile } from '@/lib/algorithm/learning';
import type { SessionSetup } from '@/lib/types';
import { makeIdea } from './helpers';

const setup: SessionSetup = { group: 'couple', timeBudgetMin: 180, costCap: 2 };
const now = new Date('2026-07-07T18:05:00');

describe('assemblePlan', () => {
  it('composes 2–3 steps and never exceeds the time budget', () => {
    const winners = [
      makeIdea({ durationMin: 90, moods: ['tasty'] }),
      makeIdea({ durationMin: 60, moods: ['active'] }),
      makeIdea({ durationMin: 45, moods: ['cozy'] }),
      makeIdea({ durationMin: 120, moods: ['creative'] }),
      makeIdea({ durationMin: 60, moods: ['silly'] }),
    ];
    const plan = assemblePlan(winners, createEmptyProfile(), setup, { now });

    expect(plan.steps.length).toBeGreaterThanOrEqual(2);
    expect(plan.steps.length).toBeLessThanOrEqual(3);
    expect(plan.totalMin).toBeLessThanOrEqual(setup.timeBudgetMin);
  });

  it('shrinks to a single step under a tight budget', () => {
    const winners = [
      makeIdea({ durationMin: 60 }),
      makeIdea({ durationMin: 60 }),
      makeIdea({ durationMin: 45 }),
    ];
    const plan = assemblePlan(winners, createEmptyProfile(), { ...setup, timeBudgetMin: 60 }, { now });

    expect(plan.steps).toHaveLength(1);
    expect(plan.totalMin).toBeLessThanOrEqual(60);
  });

  it('anchors on the winner the profile scores highest', () => {
    let profile = createEmptyProfile();
    const cozy = makeIdea({ moods: ['cozy'], durationMin: 60 });
    const active = makeIdea({ moods: ['active'], durationMin: 60 });
    for (let i = 0; i < 10; i++) profile = applyPickUpdate(profile, cozy, active);

    const plan = assemblePlan([active, cozy], profile, { ...setup, timeBudgetMin: 60 }, { now });
    expect(plan.steps[0].title).toBe(cozy.title);
  });

  it('prefers complementary roles over more of the same', () => {
    const dinner = makeIdea({ moods: ['tasty'], durationMin: 60 });
    const dessert = makeIdea({ moods: ['tasty'], durationMin: 45 });
    const winddown = makeIdea({ moods: ['cozy'], energy: 1, durationMin: 45 });
    const plan = assemblePlan([dinner, dessert, winddown], createEmptyProfile(), { ...setup, timeBudgetMin: 120 }, { now });

    const titles = plan.steps.map((s) => s.title);
    expect(titles).toContain(dinner.title);
    expect(titles).toContain(winddown.title);
  });

  it('orders outdoor daylight steps first and wind-down steps last', () => {
    const hike = makeIdea({
      moods: ['active'],
      setting: 'outdoor',
      weatherSensitive: true,
      energy: 3,
      durationMin: 60,
      timeOfDay: ['afternoon'],
    });
    const movie = makeIdea({ moods: ['cozy'], energy: 1, durationMin: 60, timeOfDay: ['night'] });
    const dinner = makeIdea({ moods: ['tasty'], energy: 2, durationMin: 60, timeOfDay: ['evening'] });

    const plan = assemblePlan([movie, dinner, hike], createEmptyProfile(), setup, { now });
    const titles = plan.steps.map((s) => s.title);

    expect(titles[0]).toBe(hike.title);
    expect(titles[titles.length - 1]).toBe(movie.title);
  });

  it('reflects the session picks: steps come from the winners and carry their ids', () => {
    const winners = [
      makeIdea({ moods: ['cozy'], durationMin: 60 }),
      makeIdea({ moods: ['tasty'], durationMin: 60 }),
    ];
    const plan = assemblePlan(winners, createEmptyProfile(), setup, { now });

    const winnerIds = winners.map((w) => w.id);
    for (const id of plan.ideaIds) expect(winnerIds).toContain(id);
    expect(plan.ideaIds).toHaveLength(plan.steps.length);
  });

  it('titles the plan with the dominant mood of the picks', () => {
    const winners = [
      makeIdea({ moods: ['cozy'] }),
      makeIdea({ moods: ['cozy', 'tasty'] }),
      makeIdea({ moods: ['cozy'] }),
    ];
    expect(dominantMood(winners, createEmptyProfile())).toBe('cozy');
    const plan = assemblePlan(winners, createEmptyProfile(), setup, { now });
    expect(plan.title).toContain('cozy');
  });
});
