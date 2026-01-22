import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/redis";
import { generateDownloadUrl } from "@/lib/storage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    const job = await getJob(jobId);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // If job is completed and has a result key, generate download URL
    if (job.status === "completed" && job.resultKey && !job.resultUrl) {
      job.resultUrl = await generateDownloadUrl(job.resultKey);
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error("Error fetching job:", error);
    return NextResponse.json(
      { error: "Failed to fetch job" },
      { status: 500 }
    );
  }
}
