import { Redis } from "@upstash/redis";
import type { Job } from "@/types";

// Determine which queue backend to use
const USE_LOCAL = process.env.STORAGE_MODE === "local" || 
                  !process.env.UPSTASH_REDIS_REST_URL ||
                  process.env.UPSTASH_REDIS_REST_URL.includes("placeholder");

let redis: Redis | null = null;
let localQueue: any = null;

// Lazy load local queue to avoid build issues
const loadLocalQueue = () => {
  if (!localQueue && USE_LOCAL) {
    try {
      localQueue = require("./local-queue");
      console.log("✓ Using Local SQLite Queue (no Redis needed)");
    } catch (error) {
      console.warn("Local queue module not available (this is normal on Vercel)");
    }
  }
  return localQueue;
};

if (!USE_LOCAL) {
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
  const queue = loadLocalQueue();
  if (USE_LOCAL && queue) {
    await queue.createJob(job);
  } else if (redis) {
    await redis.set(`${JOB_PREFIX}${job.id}`, JSON.stringify(job));
    await redis.lpush(QUEUE_KEY, job.id);
  }
}

/**
 * Get a job by ID
 */
export async function getJob(jobId: string): Promise<Job | null> {
  const queue = loadLocalQueue();
  if (USE_LOCAL && queue) {
    return await queue.getJob(jobId);
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
  const queue = loadLocalQueue();
  if (USE_LOCAL && queue) {
    await queue.updateJob(jobId, updates);
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
  const queue = loadLocalQueue();
  if (USE_LOCAL && queue) {
    return await queue.popJob();
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
