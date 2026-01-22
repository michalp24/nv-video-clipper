import { Redis } from "@upstash/redis";
import type { Job } from "./types.js";

// Determine which queue backend to use
const USE_LOCAL = process.env.STORAGE_MODE === "local" || 
                  !process.env.UPSTASH_REDIS_REST_URL ||
                  process.env.UPSTASH_REDIS_REST_URL.includes("placeholder");

let redis: Redis | null = null;
let localQueue: any = null;
let initialized = false;

async function initQueue() {
  if (initialized) return;
  
  if (USE_LOCAL) {
    // Use local SQLite queue
    const localQueueModule = await import("./local-queue.js");
    localQueue = localQueueModule;
    console.log("✓ Using Local SQLite Queue");
  } else {
    // Use Upstash Redis
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    console.log("✓ Using Upstash Redis");
  }
  
  initialized = true;
}

const JOB_PREFIX = "job:";
const QUEUE_KEY = "job:queue";

export async function popJob(): Promise<string | null> {
  await initQueue();
  
  if (USE_LOCAL && localQueue) {
    return await localQueue.popJob();
  } else if (redis) {
    const jobId = await redis.rpop<string>(QUEUE_KEY);
    return jobId;
  }
  return null;
}

export async function getJob(jobId: string): Promise<Job | null> {
  await initQueue();
  
  if (USE_LOCAL && localQueue) {
    return await localQueue.getJob(jobId);
  } else if (redis) {
    const data = await redis.get<string>(`${JOB_PREFIX}${jobId}`);
    if (!data) return null;
    return JSON.parse(data) as Job;
  }
  return null;
}

export async function updateJob(
  jobId: string,
  updates: Partial<Job>
): Promise<void> {
  await initQueue();
  
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
