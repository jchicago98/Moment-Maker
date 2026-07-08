import { describe, expect, it } from 'vitest';

import seedIdeas from '@/assets/seedIdeas.json';
import { ALL_MOODS, type Idea } from '@/lib/types';

const ideas = seedIdeas as Idea[];

describe('seed idea database', () => {
  it('has 120+ ideas with unique ids', () => {
    expect(ideas.length).toBeGreaterThanOrEqual(120);
    expect(new Set(ideas.map((i) => i.id)).size).toBe(ideas.length);
  });

  it('conforms to the Idea schema constraints', () => {
    for (const idea of ideas) {
      expect(idea.moods.length).toBeGreaterThanOrEqual(1);
      expect(idea.moods.length).toBeLessThanOrEqual(3);
      for (const m of idea.moods) expect(ALL_MOODS).toContain(m);
      expect([0, 1, 2, 3]).toContain(idea.costTier);
      expect([1, 2, 3]).toContain(idea.energy);
      expect(idea.durationMin).toBeGreaterThanOrEqual(30);
      expect(idea.groupFit.length).toBeGreaterThan(0);
      expect(idea.timeOfDay.length).toBeGreaterThan(0);
      expect(idea.broadAppeal).toBeGreaterThanOrEqual(0);
      expect(idea.broadAppeal).toBeLessThanOrEqual(1);
      expect(['indoor', 'outdoor', 'either']).toContain(idea.setting);
    }
  });

  it('covers every mood, cost tier, group, and energy level (the learner needs a diverse space)', () => {
    const moods = new Set(ideas.flatMap((i) => i.moods));
    for (const m of ALL_MOODS) expect(moods).toContain(m);

    expect(new Set(ideas.map((i) => i.costTier)).size).toBe(4);
    expect(new Set(ideas.map((i) => i.energy)).size).toBe(3);
    expect(new Set(ideas.flatMap((i) => i.groupFit)).size).toBe(4);
    expect(new Set(ideas.flatMap((i) => i.timeOfDay)).size).toBe(4);
  });
});
