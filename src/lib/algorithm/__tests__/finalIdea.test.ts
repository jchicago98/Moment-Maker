import { describe, expect, it } from 'vitest';

import { pickFinalIdea } from '@/lib/algorithm/finalIdea';
import { applyPickUpdate, createEmptyProfile } from '@/lib/algorithm/learning';
import { makeIdea } from './helpers';

describe('pickFinalIdea', () => {
  it('never returns an idea shown during the session', () => {
    const shown = Array.from({ length: 10 }, () => makeIdea());
    const fresh = Array.from({ length: 5 }, () => makeIdea());
    const excludeIds = new Set(shown.map((i) => i.id));

    const { best, runnerUp } = pickFinalIdea([...shown, ...fresh], excludeIds, createEmptyProfile(), {
      currentSession: 1,
    });

    expect(best).not.toBeNull();
    expect(excludeIds.has(best!.id)).toBe(false);
    expect(excludeIds.has(runnerUp!.id)).toBe(false);
    expect(best!.id).not.toBe(runnerUp!.id);
  });

  it('picks the idea the learned profile scores highest', () => {
    let profile = { ...createEmptyProfile(), totalSessions: 5 }; // past cold start
    const cozy = makeIdea({ moods: ['cozy'], setting: 'indoor', energy: 1 });
    const active = makeIdea({ moods: ['active'], setting: 'outdoor', energy: 3 });
    for (let i = 0; i < 10; i++) profile = applyPickUpdate(profile, cozy, active);

    const cozyTwin = makeIdea({ moods: ['cozy'], setting: 'indoor', energy: 1 });
    const activeTwin = makeIdea({ moods: ['active'], setting: 'outdoor', energy: 3 });

    const { best } = pickFinalIdea([cozyTwin, activeTwin], new Set(), profile, {
      currentSession: 5,
    });
    expect(best!.id).toBe(cozyTwin.id);
  });

  it('falls back to shown ideas when everything is excluded', () => {
    const pool = [makeIdea(), makeIdea()];
    const excludeIds = new Set(pool.map((i) => i.id));

    const { best } = pickFinalIdea(pool, excludeIds, createEmptyProfile(), { currentSession: 1 });
    expect(best).not.toBeNull();
  });

  it('returns nulls for an empty pool', () => {
    const { best, runnerUp } = pickFinalIdea([], new Set(), createEmptyProfile(), {
      currentSession: 1,
    });
    expect(best).toBeNull();
    expect(runnerUp).toBeNull();
  });
});
