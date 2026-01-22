"use client";

import type { Job } from "@/types";

interface ExportProgressProps {
  job: Job;
}

export default function ExportProgress({ job }: ExportProgressProps) {
  const statusText = {
    queued: "Queued",
    processing: "Processing",
    completed: "Completed",
    failed: "Failed",
  }[job.status];

  const statusColor = {
    queued: "text-blue-400",
    processing: "text-nvidia-green",
    completed: "text-nvidia-green",
    failed: "text-red-400",
  }[job.status];

  return (
    <div className="rounded-xl border border-nvidia-border bg-nvidia-gray/50 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-300">Status</span>
        <span className={`text-sm font-semibold ${statusColor}`}>
          {statusText}
        </span>
      </div>

      {(job.status === "queued" || job.status === "processing") && (
        <>
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-gray-400">Progress</span>
              <span className="font-medium text-white">{job.progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-nvidia-border">
              <div
                className="h-full bg-nvidia-green transition-all duration-300"
                style={{ width: `${job.progress}%` }}
              />
            </div>
          </div>

          {job.status === "processing" && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="h-2 w-2 animate-pulse rounded-full bg-nvidia-green" />
              Processing your video...
            </div>
          )}
        </>
      )}

      {job.status === "completed" && job.resultUrl && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-nvidia-green">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Your clip is ready!
          </div>

          <a
            href={job.resultUrl}
            download={`clip-${job.id}.mp4`}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-nvidia-green px-6 py-3
              text-base font-semibold text-black transition-all hover:bg-nvidia-green-hover
              shadow-lg shadow-nvidia-green/20 focus:outline-none focus:ring-2 focus:ring-nvidia-green
              focus:ring-offset-2 focus:ring-offset-nvidia-dark"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Download Clip
          </a>
        </div>
      )}

      {job.status === "failed" && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
          <div className="flex items-start gap-2">
            <svg
              className="h-5 w-5 flex-shrink-0 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-400">Export failed</p>
              {job.error && (
                <p className="mt-1 text-xs text-red-300/80">{job.error}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
