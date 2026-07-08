// Actions on moments and user ideas — the feedback loops of §7.1: ratings are
// the strongest signal, confirmed completion is a mild positive, dismissals
// teach nothing, and user-added ideas are strong positive updates.

import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import {
  applyRatingUpdate,
  applyUserIdeaUpdate,
  createEmptyProfile,
} from '@/lib/algorithm/learning';
import {
  dismissPendingMoments,
  getIdeasByIds,
  getMomentById,
  getProfile,
  insertIdea,
  insertMoment,
  saveProfile,
  updateMoment,
} from '@/lib/db/database';
import type { Idea, Moment } from '@/lib/types';

const ASK_DELAY_MS = 3 * 60 * 60 * 1000; // the "did it happen?" flip: ≥3h…

/** …or the next calendar day, whichever comes first. */
export function readyToAsk(moment: Moment, now: Date = new Date()): boolean {
  const created = new Date(moment.createdAt);
  if (now.getTime() - created.getTime() >= ASK_DELAY_MS) return true;
  return now.toDateString() !== created.toDateString();
}

/** "Let's do it!" — commit to one idea. Replaces any existing pending moment. */
export function createMoment(idea: Idea): Moment {
  dismissPendingMoments();
  const moment: Moment = {
    id: `moment-${Date.now()}`,
    ideaId: idea.id,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  insertMoment(moment);
  return moment;
}

function applyIdeaFeedback(ideaId: string, rating: 1 | 2 | 3 | 4 | 5 | undefined): void {
  const idea = getIdeasByIds([ideaId])[0];
  if (!idea) return;
  const profile = getProfile() ?? createEmptyProfile();
  saveProfile(applyRatingUpdate(profile, [idea], rating));
}

/** "We did it!" — the moment enters the scrapbook; completion teaches mildly. */
export function confirmMoment(momentId: string): void {
  const moment = getMomentById(momentId);
  if (!moment || moment.status === 'done') return;
  if (!moment.rating) applyIdeaFeedback(moment.ideaId, undefined);
  updateMoment(momentId, { status: 'done', confirmedAt: new Date().toISOString() });
}

/** "Not this time" — vanishes without judgment (and without learning). */
export function dismissMoment(momentId: string): void {
  updateMoment(momentId, { status: 'dismissed' });
}

/** 1–5★. The 3× learning update applies only on the first rating — changing
 * your mind later edits the record, not the profile twice. */
export function rateMoment(momentId: string, rating: 1 | 2 | 3 | 4 | 5): void {
  const moment = getMomentById(momentId);
  if (!moment) return;
  if (!moment.rating) applyIdeaFeedback(moment.ideaId, rating);
  updateMoment(momentId, { rating });
}

/** Pick a photo and attach it, copied into app documents so the memory
 * outlives the picker cache. Returns true if a photo was attached. */
export async function pickAndAttachPhoto(momentId: string): Promise<boolean> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
  });
  const asset = result.assets?.[0];
  if (result.canceled || !asset) return false;
  try {
    const dest = new File(Paths.document, `moment-${momentId}.jpg`);
    if (dest.exists) dest.delete();
    new File(asset.uri).copy(dest);
    updateMoment(momentId, { photoUri: dest.uri });
  } catch {
    updateMoment(momentId, { photoUri: asset.uri });
  }
  return true;
}

export interface NewIdeaInput {
  title: string;
  description: string;
  moods: Idea['moods'];
  setting: Idea['setting'];
  costTier: Idea['costTier'];
  durationMin: number;
  groupFit: Idea['groupFit'];
  energy: Idea['energy'];
}

/** Add a user idea: it enters the deck AND counts as a strong positive signal. */
export function addUserIdea(input: NewIdeaInput): Idea {
  const idea: Idea = {
    id: `user-${Date.now()}`,
    title: input.title,
    description: input.description,
    moods: input.moods,
    setting: input.setting,
    costTier: input.costTier,
    durationMin: input.durationMin,
    groupFit: input.groupFit,
    energy: input.energy,
    timeOfDay: ['morning', 'afternoon', 'evening', 'night'], // user ideas fit any time
    weatherSensitive: input.setting === 'outdoor',
    requiresTravel: false,
    icon: 'sparkles',
    source: 'user',
    createdAt: new Date().toISOString(),
    broadAppeal: 0.5,
  };
  insertIdea(idea);
  const profile = getProfile() ?? createEmptyProfile();
  saveProfile(applyUserIdeaUpdate(profile, idea));
  return idea;
}
