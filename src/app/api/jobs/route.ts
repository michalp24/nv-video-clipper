import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { createJob } from "@/lib/redis";
import type { Job, CreateJobRequest, CreateJobResponse } from "@/types";

const createJobSchema = z.object({
  sourceKey: z.string().min(1),
  startTime: z.number().min(0),
  duration: z.number().min(3).max(6),
  size: z.enum(["630x354", "850x480", "1920x1080"]),
  removeAudio: z.boolean(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = createJobSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.errors },
        { status: 400 }
      );
    }

    const data: CreateJobRequest = validation.data;

    // Create job
    const jobId = nanoid();
    const job: Job = {
      id: jobId,
      status: "queued",
      progress: 0,
      sourceKey: data.sourceKey,
      startTime: data.startTime,
      duration: data.duration,
      size: data.size,
      removeAudio: data.removeAudio,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await createJob(job);

    const response: CreateJobResponse = {
      jobId,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error creating job:", error);
    return NextResponse.json(
      { error: "Failed to create job" },
      { status: 500 }
    );
  }
}
