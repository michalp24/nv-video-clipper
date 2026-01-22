import { promises as fs } from "fs";
import { join } from "path";
import { downloadFromStorage, uploadToStorage, getStorageBackend } from "./storage.js";
import { processVideo } from "./ffmpeg.js";
import { updateJob } from "./redis.js";
import type { Job } from "./types.js";

const TEMP_DIR = "/tmp/video-processing";

/**
 * Process a single job
 */
export async function processJob(job: Job): Promise<void> {
  console.log(`Processing job ${job.id}`);

  try {
    // Update job status to processing
    await updateJob(job.id, {
      status: "processing",
      progress: 0,
    });

    // Create temp directory if it doesn't exist
    await fs.mkdir(TEMP_DIR, { recursive: true });

    // Generate temp file paths
    const inputPath = join(TEMP_DIR, `${job.id}-input.mp4`);
    const outputPath = join(TEMP_DIR, `${job.id}-output.mp4`);

    // Download source from storage
    const backend = getStorageBackend();
    console.log(`Downloading ${job.sourceKey} from ${backend}...`);
    await updateJob(job.id, { progress: 10 });
    await downloadFromStorage(job.sourceKey, inputPath);

    // Process video with FFmpeg
    console.log(`Processing video...`);
    await processVideo({
      inputPath,
      outputPath,
      startTime: job.startTime,
      duration: job.duration,
      size: job.size,
      removeAudio: job.removeAudio,
      onProgress: async (progress) => {
        // Map FFmpeg progress (0-100) to overall progress (20-90)
        const overallProgress = Math.round(20 + (progress * 0.7));
        await updateJob(job.id, { progress: overallProgress });
      },
    });

    // Upload result to storage
    console.log(`Uploading result to ${backend}...`);
    await updateJob(job.id, { progress: 90 });
    const resultKey = `results/${job.id}.mp4`;
    await uploadToStorage(outputPath, resultKey);

    // Update job to completed
    await updateJob(job.id, {
      status: "completed",
      progress: 100,
      resultKey,
    });

    // Cleanup temp files
    await fs.unlink(inputPath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});

    console.log(`Job ${job.id} completed successfully`);
  } catch (error) {
    console.error(`Job ${job.id} failed:`, error);

    await updateJob(job.id, {
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });

    throw error;
  }
}
