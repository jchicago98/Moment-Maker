import * as SQLite from 'expo-sqlite';

import seedIdeas from '@/assets/seedIdeas.json';
import type { Idea, PickEvent, SessionSetup } from '@/lib/types';

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
  `);

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

/**
 * M1 hard filter: group fit, time budget, and cost cap.
 * (Weather and time-of-day filtering arrive with the algorithm in M3.)
 */
export function getIdeasForSession(setup: SessionSetup): Idea[] {
  const rows = db.getAllSync<IdeaRow>(
    `SELECT * FROM ideas
     WHERE durationMin <= $timeBudget
       AND costTier <= $costCap
       AND groupFit LIKE $group`,
    {
      $timeBudget: setup.timeBudgetMin,
      $costCap: setup.costCap,
      $group: `%"${setup.group}"%`,
    }
  );
  return rows.map(rowToIdea);
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
