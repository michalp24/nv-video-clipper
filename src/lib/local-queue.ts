// This module only works in Node.js with filesystem access (not on Vercel)
import type { Job } from "@/types";

let Database: any;
let join: any;

if (typeof process !== 'undefined' && process.versions && process.versions.node) {
  try {
    Database = require("better-sqlite3");
    join = require("path").join;
  } catch (error) {
    // Running in environment without filesystem (like Vercel)
    console.warn("SQLite not available");
  }
}

// SQLite database path
const DB_PATH = join ? join(process.cwd(), "storage", "queue.db") : "/tmp/queue.db";

let db: any | null = null;

/**
 * Initialize SQLite database
 */
function initDatabase() {
  if (db) return db;
  if (!Database) {
    console.warn("SQLite not available (this is normal on Vercel)");
    return null;
  }

  db = new Database(DB_PATH);

  // Create jobs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // Create queue table
  db.exec(`
    CREATE TABLE IF NOT EXISTS queue (
      job_id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL
    )
  `);

  return db;
}

/**
 * Create a new job
 */
export async function createJob(job: Job): Promise<void> {
  const database = initDatabase();
  if (!database) return;

  database.prepare(`
    INSERT INTO jobs (id, data, created_at, updated_at)
    VALUES (?, ?, ?, ?)
  `).run(job.id, JSON.stringify(job), job.createdAt, job.updatedAt);

  database.prepare(`
    INSERT INTO queue (job_id, created_at)
    VALUES (?, ?)
  `).run(job.id, Date.now());
}

/**
 * Get a job by ID
 */
export async function getJob(jobId: string): Promise<Job | null> {
  const database = initDatabase();
  if (!database) return null;

  const row = database.prepare(`
    SELECT data FROM jobs WHERE id = ?
  `).get(jobId) as { data: string } | undefined;

  if (!row) return null;

  return JSON.parse(row.data) as Job;
}

/**
 * Update a job
 */
export async function updateJob(jobId: string, updates: Partial<Job>): Promise<void> {
  const database = initDatabase();
  if (!database) return;

  const job = await getJob(jobId);
  if (!job) throw new Error("Job not found");

  const updatedJob: Job = {
    ...job,
    ...updates,
    updatedAt: Date.now(),
  };

  database.prepare(`
    UPDATE jobs SET data = ?, updated_at = ? WHERE id = ?
  `).run(JSON.stringify(updatedJob), updatedJob.updatedAt, jobId);
}

/**
 * Pop a job from the queue (for worker)
 */
export async function popJob(): Promise<string | null> {
  const database = initDatabase();
  if (!database) return null;

  const row = database.prepare(`
    SELECT job_id FROM queue ORDER BY created_at ASC LIMIT 1
  `).get() as { job_id: string } | undefined;

  if (!row) return null;

  // Remove from queue
  database.prepare(`
    DELETE FROM queue WHERE job_id = ?
  `).run(row.job_id);

  return row.job_id;
}

/**
 * Close database connection
 */
export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}
