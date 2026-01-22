import { Redis } from "@upstash/redis";
import type { Job } from "@/types";

// Determine which queue backend to use
const USE_LOCAL = process.env.STORAGE_MODE === "local" || 
                  !process.env.UPSTASH_REDIS_REST_URL ||
                  process.env.UPSTASH_REDIS_REST_URL.includes("placeholder");

let redis: Redis | null = null;
let localQueue: any = null;

if (USE_LOCAL) {
  // Use local SQLite queue
  localQueue = require("./local-queue");
  console.log("✓ Using Local SQLite Queue (no Redis needed)");
} else {
  // Use Upstash Redis
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

const JOB_PREFIX = "job:";
const QUEUE_KEY = "job:queue";

/**
 * Create a new job
 */
export async function createJob(job: Job): Promise<void> {
  if (USE_LOCAL && localQueue) {
    await localQueue.createJob(job);
  } else if (redis) {
    await redis.set(`${JOB_PREFIX}${job.id}`, JSON.stringify(job));
    await redis.lpush(QUEUE_KEY, job.id);
  }
}

/**
 * Get a job by ID
 */
export async function getJob(jobId: string): Promise<Job | null> {
  if (USE_LOCAL && localQueue) {
    return await localQueue.getJob(jobId);
  } else if (redis) {
    const data = await redis.get<string>(`${JOB_PREFIX}${jobId}`);
    if (!data) return null;
    return JSON.parse(data) as Job;
  }
  return null;
}

/**
 * Update a job
 */
export async function updateJob(jobId: string, updates: Partial<Job>): Promise<void> {
  if (USE_LOCAL && localQueue) {
    await localQueue.updateJob(jobId, updates);
  } else if (redis) {
    const job = await getJob(jobId);
    if (!job) throw new Error("Job not found");

    const updatedJob: Job = {
      ...job,
      ...updates,
      updatedAt: Date.now(),
    };

    await redis.set(`${JOB_PREFIX}${jobId}`, JSON.stringify(updatedJob));
  }
}

/**
 * Pop a job from the queue (for worker)
 */
export async function popJob(): Promise<string | null> {
  if (USE_LOCAL && localQueue) {
    return await localQueue.popJob();
  } else if (redis) {
    const jobId = await redis.rpop<string>(QUEUE_KEY);
    return jobId;
  }
  return null;
}

/**
 * Get Redis client for direct access
 */
export function getRedisClient(): Redis | null {
  return redis;
}
