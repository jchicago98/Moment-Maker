import * as SQLite from 'expo-sqlite';

import seedIdeas from '@/assets/seedIdeas.json';
import type { IdeaStats } from '@/lib/algorithm/scoring';
import type { ExperienceLog, Idea, Moment, PickEvent, Plan, UserProfile } from '@/lib/types';

const db = SQLite.openDatabaseSync('momentmaker.db');

interface IdeaRow {
  id: string;
  title: string;
  description: string;
  moods: string;
  setting: string;
  costTier: number;
  durationMin: number;
  groupFit: string;
  energy: number;
  timeOfDay: string;
  weatherSensitive: number;
  requiresTravel: number;
  icon: string;
  source: string;
  createdAt: string;
  broadAppeal: number;
}

function rowToIdea(row: IdeaRow): Idea {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    moods: JSON.parse(row.moods),
    setting: row.setting as Idea['setting'],
    costTier: row.costTier as Idea['costTier'],
    durationMin: row.durationMin,
    groupFit: JSON.parse(row.groupFit),
    energy: row.energy as Idea['energy'],
    timeOfDay: JSON.parse(row.timeOfDay),
    weatherSensitive: row.weatherSensitive === 1,
    requiresTravel: row.requiresTravel === 1,
    icon: row.icon,
    source: row.source as Idea['source'],
    createdAt: row.createdAt,
    broadAppeal: row.broadAppeal,
  };
}

export function initDatabase(): void {
  db.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS ideas (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      moods TEXT NOT NULL,
      setting TEXT NOT NULL,
      costTier INTEGER NOT NULL,
      durationMin INTEGER NOT NULL,
      groupFit TEXT NOT NULL,
      energy INTEGER NOT NULL,
      timeOfDay TEXT NOT NULL,
      weatherSensitive INTEGER NOT NULL,
      requiresTravel INTEGER NOT NULL,
      icon TEXT NOT NULL,
      source TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      broadAppeal REAL NOT NULL DEFAULT 0.5
    );

    CREATE TABLE IF NOT EXISTS pick_events (
      id TEXT PRIMARY KEY,
      sessionId TEXT NOT NULL,
      winnerId TEXT NOT NULL,
      loserId TEXT NOT NULL,
      throwVelocity REAL NOT NULL DEFAULT 0,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS experience_logs (
      id TEXT PRIMARY KEY,
      planId TEXT NOT NULL,
      rating INTEGER,
      completed INTEGER NOT NULL DEFAULT 0,
      photoUri TEXT,
      date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      json TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS idea_stats (
      ideaId TEXT PRIMARY KEY,
      timesShown INTEGER NOT NULL DEFAULT 0,
      timesChosen INTEGER NOT NULL DEFAULT 0,
      lastShownSession INTEGER
    );

    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      stepsJson TEXT NOT NULL,
      ideaIdsJson TEXT NOT NULL,
      totalMin INTEGER NOT NULL,
      costTier INTEGER NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS moments (
      id TEXT PRIMARY KEY,
      ideaId TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      createdAt TEXT NOT NULL,
      scheduledFor TEXT,
      confirmedAt TEXT,
      rating INTEGER,
      photoUri TEXT
    );
  `);

  // Dev installs created before scheduling existed: best-effort add.
  try {
    db.execSync('ALTER TABLE moments ADD COLUMN scheduledFor TEXT;');
  } catch {
    // column already exists
  }

  seedIfEmpty();
}

function seedIfEmpty(): void {
  const row = db.getFirstSync<{ n: number }>('SELECT COUNT(*) AS n FROM ideas');
  if (row && row.n > 0) return;

  const insert = db.prepareSync(
    `INSERT INTO ideas (id, title, description, moods, setting, costTier, durationMin,
      groupFit, energy, timeOfDay, weatherSensitive, requiresTravel, icon, source, createdAt, broadAppeal)
     VALUES ($id, $title, $description, $moods, $setting, $costTier, $durationMin,
      $groupFit, $energy, $timeOfDay, $weatherSensitive, $requiresTravel, $icon, $source, $createdAt, $broadAppeal)`
  );
  try {
    db.withTransactionSync(() => {
      for (const idea of seedIdeas as Idea[]) {
        insert.executeSync({
          $id: idea.id,
          $title: idea.title,
          $description: idea.description,
          $moods: JSON.stringify(idea.moods),
          $setting: idea.setting,
          $costTier: idea.costTier,
          $durationMin: idea.durationMin,
          $groupFit: JSON.stringify(idea.groupFit),
          $energy: idea.energy,
          $timeOfDay: JSON.stringify(idea.timeOfDay),
          $weatherSensitive: idea.weatherSensitive ? 1 : 0,
          $requiresTravel: idea.requiresTravel ? 1 : 0,
          $icon: idea.icon,
          $source: idea.source,
          $createdAt: idea.createdAt,
          $broadAppeal: idea.broadAppeal ?? 0.5,
        });
      }
    });
  } finally {
    insert.finalizeSync();
  }
}

export function getAllIdeas(): Idea[] {
  return db.getAllSync<IdeaRow>('SELECT * FROM ideas').map(rowToIdea);
}

export function getIdeasByIds(ids: string[]): Idea[] {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(', ');
  const rows = db.getAllSync<IdeaRow>(`SELECT * FROM ideas WHERE id IN (${placeholders})`, ids);
  const byId = new Map(rows.map((r) => [r.id, rowToIdea(r)]));
  return ids.map((id) => byId.get(id)).filter((i): i is Idea => i !== undefined);
}

export function logPickEvent(event: PickEvent): void {
  db.runSync(
    `INSERT INTO pick_events (id, sessionId, winnerId, loserId, throwVelocity, timestamp)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      event.id,
      event.sessionId,
      event.winnerId,
      event.loserId,
      event.throwVelocity,
      event.timestamp,
    ]
  );
}

export function getIdeaCount(): number {
  const row = db.getFirstSync<{ n: number }>('SELECT COUNT(*) AS n FROM ideas');
  return row?.n ?? 0;
}

// ---------------------------------------------------------------------------
// User profile — a single row; presence doubles as the "onboarded" flag.

export function getProfile(): UserProfile | null {
  const row = db.getFirstSync<{ json: string }>('SELECT json FROM user_profile WHERE id = 1');
  return row ? (JSON.parse(row.json) as UserProfile) : null;
}

export function saveProfile(profile: UserProfile): void {
  db.runSync(
    `INSERT INTO user_profile (id, json, updatedAt) VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET json = excluded.json, updatedAt = excluded.updatedAt`,
    [JSON.stringify(profile), profile.updatedAt]
  );
}

export function hasProfile(): boolean {
  return getProfile() !== null;
}

// ---------------------------------------------------------------------------
// Idea stats — feed the novelty penalty and the shown-but-never-chosen decay.

export function getStatsFor(ids: string[]): Map<string, IdeaStats> {
  const result = new Map<string, IdeaStats>();
  if (ids.length === 0) return result;
  const placeholders = ids.map(() => '?').join(', ');
  const rows = db.getAllSync<{
    ideaId: string;
    timesShown: number;
    timesChosen: number;
    lastShownSession: number | null;
  }>(`SELECT * FROM idea_stats WHERE ideaId IN (${placeholders})`, ids);
  for (const row of rows) {
    result.set(row.ideaId, {
      timesShown: row.timesShown,
      timesChosen: row.timesChosen,
      lastShownSession: row.lastShownSession,
    });
  }
  return result;
}

export function recordShown(ids: string[], session: number): void {
  const stmt = db.prepareSync(
    `INSERT INTO idea_stats (ideaId, timesShown, timesChosen, lastShownSession)
     VALUES (?, 1, 0, ?)
     ON CONFLICT(ideaId) DO UPDATE SET
       timesShown = timesShown + 1,
       lastShownSession = excluded.lastShownSession`
  );
  try {
    for (const id of ids) stmt.executeSync([id, session]);
  } finally {
    stmt.finalizeSync();
  }
}

export function recordChosen(id: string): void {
  db.runSync(
    `INSERT INTO idea_stats (ideaId, timesShown, timesChosen, lastShownSession)
     VALUES (?, 0, 1, NULL)
     ON CONFLICT(ideaId) DO UPDATE SET timesChosen = timesChosen + 1`,
    [id]
  );
}

// ---------------------------------------------------------------------------
// Plans & ratings — the reveal saves a plan; ratings feed back into learning.

export function savePlan(plan: Plan): void {
  db.runSync(
    `INSERT OR REPLACE INTO plans (id, title, stepsJson, ideaIdsJson, totalMin, costTier, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      plan.id,
      plan.title,
      JSON.stringify(plan.steps),
      JSON.stringify(plan.ideaIds),
      plan.totalMin,
      plan.costTier,
      plan.createdAt,
    ]
  );
}

interface PlanRow {
  id: string;
  title: string;
  stepsJson: string;
  ideaIdsJson: string;
  totalMin: number;
  costTier: number;
  createdAt: string;
}

function rowToPlan(row: PlanRow): Plan {
  return {
    id: row.id,
    title: row.title,
    steps: JSON.parse(row.stepsJson),
    ideaIds: JSON.parse(row.ideaIdsJson),
    totalMin: row.totalMin,
    costTier: row.costTier as Plan['costTier'],
    createdAt: row.createdAt,
  };
}

/** The most recent plan that has no experience log yet — home asks about it. */
export function getLatestUnratedPlan(): Plan | null {
  const row = db.getFirstSync<PlanRow>(
    `SELECT p.* FROM plans p
     LEFT JOIN experience_logs e ON e.planId = p.id
     WHERE e.id IS NULL
     ORDER BY p.createdAt DESC
     LIMIT 1`
  );
  return row ? rowToPlan(row) : null;
}

export function getPlanById(id: string): Plan | null {
  const row = db.getFirstSync<PlanRow>('SELECT * FROM plans WHERE id = ?', [id]);
  return row ? rowToPlan(row) : null;
}

export function logExperience(log: ExperienceLog): void {
  db.runSync(
    `INSERT INTO experience_logs (id, planId, rating, completed, photoUri, date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [log.id, log.planId, log.rating ?? null, log.completed ? 1 : 0, log.photoUri ?? null, log.date]
  );
}

interface ExperienceRow {
  id: string;
  planId: string;
  rating: number | null;
  completed: number;
  photoUri: string | null;
  date: string;
}

function rowToExperience(row: ExperienceRow): ExperienceLog {
  return {
    id: row.id,
    planId: row.planId,
    rating: (row.rating ?? undefined) as ExperienceLog['rating'],
    completed: row.completed === 1,
    photoUri: row.photoUri ?? undefined,
    date: row.date,
  };
}

export function getExperienceForPlan(planId: string): ExperienceLog | null {
  const row = db.getFirstSync<ExperienceRow>(
    'SELECT * FROM experience_logs WHERE planId = ? ORDER BY date DESC LIMIT 1',
    [planId]
  );
  return row ? rowToExperience(row) : null;
}

/** Create or update the experience log for a plan. Only provided fields change. */
export function upsertExperience(
  planId: string,
  fields: { rating?: 1 | 2 | 3 | 4 | 5; completed?: boolean; photoUri?: string }
): void {
  const existing = getExperienceForPlan(planId);
  if (existing) {
    db.runSync(
      `UPDATE experience_logs SET
         rating = COALESCE(?, rating),
         completed = COALESCE(?, completed),
         photoUri = COALESCE(?, photoUri)
       WHERE id = ?`,
      [
        fields.rating ?? null,
        fields.completed === undefined ? null : fields.completed ? 1 : 0,
        fields.photoUri ?? null,
        existing.id,
      ]
    );
  } else {
    logExperience({
      id: `exp-${Date.now()}`,
      planId,
      rating: fields.rating,
      completed: fields.completed ?? false,
      photoUri: fields.photoUri,
      date: new Date().toISOString(),
    });
  }
}

// ---------------------------------------------------------------------------
// History — the scrapbook: past plans with their experience logs.

export interface HistoryEntry {
  plan: Plan;
  experience: ExperienceLog | null;
}

export function getHistory(): HistoryEntry[] {
  const rows = db.getAllSync<PlanRow>('SELECT * FROM plans ORDER BY createdAt DESC');
  return rows.map((row) => {
    const plan = rowToPlan(row);
    return { plan, experience: getExperienceForPlan(plan.id) };
  });
}

// ---------------------------------------------------------------------------
// User-added ideas — they join the deck AND teach the profile (§5.8).

export function insertIdea(idea: Idea): void {
  db.runSync(
    `INSERT INTO ideas (id, title, description, moods, setting, costTier, durationMin,
      groupFit, energy, timeOfDay, weatherSensitive, requiresTravel, icon, source, createdAt, broadAppeal)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      idea.id,
      idea.title,
      idea.description,
      JSON.stringify(idea.moods),
      idea.setting,
      idea.costTier,
      idea.durationMin,
      JSON.stringify(idea.groupFit),
      idea.energy,
      JSON.stringify(idea.timeOfDay),
      idea.weatherSensitive ? 1 : 0,
      idea.requiresTravel ? 1 : 0,
      idea.icon,
      idea.source,
      idea.createdAt,
      idea.broadAppeal,
    ]
  );
}

/** Reset the learned profile (weights, stats, pick history). The scrapbook
 * stays — memories aren't part of the profile. */
export function resetProfileData(): void {
  db.execSync(`
    DELETE FROM user_profile;
    DELETE FROM idea_stats;
    DELETE FROM pick_events;
  `);
}

// ---------------------------------------------------------------------------
// Moments — one idea the user committed to. Only confirmed ('done') moments
// appear in the scrapbook.

interface MomentRow {
  id: string;
  ideaId: string;
  status: string;
  createdAt: string;
  scheduledFor: string | null;
  confirmedAt: string | null;
  rating: number | null;
  photoUri: string | null;
}

function rowToMoment(row: MomentRow): Moment {
  return {
    id: row.id,
    ideaId: row.ideaId,
    status: row.status as Moment['status'],
    createdAt: row.createdAt,
    scheduledFor: row.scheduledFor ?? undefined,
    confirmedAt: row.confirmedAt ?? undefined,
    rating: (row.rating ?? undefined) as Moment['rating'],
    photoUri: row.photoUri ?? undefined,
  };
}

export interface MomentWithIdea {
  moment: Moment;
  idea: Idea;
}

export function insertMoment(moment: Moment): void {
  db.runSync(
    `INSERT INTO moments (id, ideaId, status, createdAt, scheduledFor, confirmedAt, rating, photoUri)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      moment.id,
      moment.ideaId,
      moment.status,
      moment.createdAt,
      moment.scheduledFor ?? null,
      moment.confirmedAt ?? null,
      moment.rating ?? null,
      moment.photoUri ?? null,
    ]
  );
}

/** Set or clear a moment's schedule (COALESCE-based updateMoment can't clear). */
export function setMomentSchedule(id: string, scheduledFor: string | null): void {
  db.runSync('UPDATE moments SET scheduledFor = ? WHERE id = ?', [scheduledFor, id]);
}

export function getMomentById(id: string): Moment | null {
  const row = db.getFirstSync<MomentRow>('SELECT * FROM moments WHERE id = ?', [id]);
  return row ? rowToMoment(row) : null;
}

/** The single active moment, with its idea attached. */
export function getPendingMoment(): MomentWithIdea | null {
  const row = db.getFirstSync<MomentRow>(
    `SELECT * FROM moments WHERE status = 'pending' ORDER BY createdAt DESC LIMIT 1`
  );
  if (!row) return null;
  const idea = getIdeasByIds([row.ideaId])[0];
  return idea ? { moment: rowToMoment(row), idea } : null;
}

/** Only one moment can be pending at a time. */
export function dismissPendingMoments(): void {
  db.runSync(`UPDATE moments SET status = 'dismissed' WHERE status = 'pending'`);
}

export function updateMoment(
  id: string,
  fields: { status?: Moment['status']; confirmedAt?: string; rating?: 1 | 2 | 3 | 4 | 5; photoUri?: string }
): void {
  db.runSync(
    `UPDATE moments SET
       status = COALESCE(?, status),
       confirmedAt = COALESCE(?, confirmedAt),
       rating = COALESCE(?, rating),
       photoUri = COALESCE(?, photoUri)
     WHERE id = ?`,
    [fields.status ?? null, fields.confirmedAt ?? null, fields.rating ?? null, fields.photoUri ?? null, id]
  );
}

/** The scrapbook: confirmed moments only, newest first. */
export function getDoneMoments(): MomentWithIdea[] {
  const rows = db.getAllSync<MomentRow>(
    `SELECT * FROM moments WHERE status = 'done' ORDER BY confirmedAt DESC`
  );
  return rows
    .map((row) => {
      const idea = getIdeasByIds([row.ideaId])[0];
      return idea ? { moment: rowToMoment(row), idea } : null;
    })
    .filter((m): m is MomentWithIdea => m !== null);
}
