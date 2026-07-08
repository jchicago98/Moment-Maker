import type { Idea } from '@/lib/types';

let counter = 0;

export function makeIdea(overrides: Partial<Idea> = {}): Idea {
  counter += 1;
  return {
    id: `test-${counter}`,
    title: `Test idea ${counter}`,
    description: 'A test idea.',
    moods: ['cozy'],
    setting: 'indoor',
    costTier: 1,
    durationMin: 60,
    groupFit: ['couple'],
    energy: 1,
    timeOfDay: ['evening'],
    weatherSensitive: false,
    requiresTravel: false,
    icon: 'tent',
    source: 'seed',
    createdAt: '2026-07-07',
    broadAppeal: 0.5,
    ...overrides,
  };
}

/** Deterministic rng cycling through the given values. */
export function cyclingRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}
