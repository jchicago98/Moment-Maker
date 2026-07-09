export type Mood =
  | 'cozy'
  | 'active'
  | 'silly'
  | 'romantic'
  | 'adventurous'
  | 'creative'
  | 'chill'
  | 'social'
  | 'tasty'
  | 'calm';

export const ALL_MOODS: Mood[] = [
  'cozy',
  'active',
  'silly',
  'romantic',
  'adventurous',
  'creative',
  'chill',
  'social',
  'tasty',
  'calm',
];

export type Setting = 'indoor' | 'outdoor' | 'either';
export type GroupType = 'solo' | 'couple' | 'friends' | 'family';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';
export type CostTier = 0 | 1 | 2 | 3;
export type Energy = 1 | 2 | 3;

export interface Idea {
  id: string;
  title: string;
  description: string;
  moods: Mood[]; // 1–3 moods
  setting: Setting;
  costTier: CostTier; // free, $, $$, $$$
  durationMin: number; // typical minutes
  groupFit: GroupType[];
  energy: Energy; // chill → active
  timeOfDay: TimeOfDay[];
  weatherSensitive: boolean; // true = needs decent weather if outdoor
  requiresTravel: boolean;
  icon: string; // icon name for the card
  source: 'seed' | 'user';
  createdAt: string;
  broadAppeal: number; // 0–1 crowd-pleaser prior, used for cold start
}

export interface UserProfile {
  // one weight per attribute dimension, all initialized to 0, kept in [-1, 1]
  moodWeights: Record<Mood, number>;
  settingWeight: number; // + = prefers outdoor, − = indoor
  costWeight: number; // + = comfortable spending
  energyWeight: number; // + = prefers active
  durationWeight: number; // + = prefers longer experiences
  socialWeights: Record<GroupType, number>;
  timeOfDayWeights: Record<TimeOfDay, number>;
  totalSessions: number;
  updatedAt: string;
}

export interface PickEvent {
  id: string;
  sessionId: string;
  winnerId: string;
  loserId: string;
  throwVelocity: number; // fun signal: confident flings vs hesitant drags
  timestamp: string;
}

export interface ExperienceLog {
  id: string;
  planId: string;
  rating?: 1 | 2 | 3 | 4 | 5;
  completed: boolean;
  photoUri?: string;
  date: string;
}

export interface PlanStep {
  time: string; // e.g. "6:30 pm"
  icon: string;
  title: string;
  tip: string;
  durationMin: number;
}

export interface Plan {
  id: string;
  title: string; // e.g. "Your cozy evening"
  steps: PlanStep[];
  ideaIds: string[]; // the ideas behind the steps — ratings feed back through these
  totalMin: number;
  costTier: CostTier;
  createdAt: string;
}

export interface SessionSetup {
  group: GroupType;
  timeBudgetMin: number;
  costCap: CostTier;
}

/**
 * A moment: one idea the user committed to ("Let's do it!"). It stays
 * `pending` until they confirm it actually happened — only `done` moments
 * enter the scrapbook.
 */
export interface Moment {
  id: string;
  ideaId: string;
  status: 'pending' | 'done' | 'dismissed';
  createdAt: string;
  scheduledFor?: string; // when the user plans to do it; editable
  confirmedAt?: string;
  rating?: 1 | 2 | 3 | 4 | 5;
  photoUri?: string;
}
