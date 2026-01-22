import "dotenv/config";
import { popJob, getJob } from "./redis.js";
import { processJob } from "./processor.js";

const POLL_INTERVAL = 5000; // 5 seconds

async function main() {
  console.log("Worker started. Waiting for jobs...");

  while (true) {
    try {
      // Pop a job from the queue
      const jobId = await popJob();

      if (jobId) {
        console.log(`Received job: ${jobId}`);

        // Fetch job details
        const job = await getJob(jobId);

        if (job) {
          // Process the job
          await processJob(job);
        } else {
          console.error(`Job ${jobId} not found`);
        }
      } else {
        // No jobs available, wait before polling again
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
      }
    } catch (error) {
      console.error("Error processing job:", error);
      // Wait a bit before trying again
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    }
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
