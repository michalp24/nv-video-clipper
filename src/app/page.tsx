"use client";

import { useState, useCallback, useEffect } from "react";
import UploadArea from "@/components/UploadArea";
import VideoPreview from "@/components/VideoPreview";
import TrimControls from "@/components/TrimControls";
import ExportControls from "@/components/ExportControls";
import ExportProgress from "@/components/ExportProgress";
import type { Job, ExportSize } from "@/types";

export default function Home() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [sourceKey, setSourceKey] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [duration, setDuration] = useState(3);
  const [isValidTrim, setIsValidTrim] = useState(false);
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleUploadComplete = useCallback((url: string, key: string) => {
    setVideoUrl(url);
    setSourceKey(key);
    setCurrentJob(null);
  }, []);

  const handleVideoMetadata = useCallback((duration: number) => {
    setVideoDuration(duration);
    // Reset trim to safe defaults
    setStartTime(0);
    setDuration(Math.min(3, duration));
  }, []);

  const handleTrimChange = useCallback((start: number, dur: number, valid: boolean) => {
    setStartTime(start);
    setDuration(dur);
    setIsValidTrim(valid);
  }, []);

  const handleExport = useCallback(
    async (size: ExportSize, removeAudio: boolean) => {
      if (!sourceKey || !isValidTrim) return;

      try {
        setIsExporting(true);

        // Create job
        const response = await fetch("/api/jobs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sourceKey,
            startTime,
            duration,
            size,
            removeAudio,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create job");
        }

        const { jobId } = await response.json();

        // Start polling for job status
        pollJobStatus(jobId);
      } catch (error) {
        console.error("Export error:", error);
        alert("Failed to start export. Please try again.");
        setIsExporting(false);
      }
    },
    [sourceKey, startTime, duration, isValidTrim]
  );

  const pollJobStatus = useCallback(async (jobId: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch job status");
        }

        const job: Job = await response.json();
        setCurrentJob(job);

        // Continue polling if job is not in a terminal state
        if (job.status === "queued" || job.status === "processing") {
          setTimeout(poll, 1000);
        } else {
          setIsExporting(false);
        }
      } catch (error) {
        console.error("Poll error:", error);
        setIsExporting(false);
      }
    };

    poll();
  }, []);

  const canExport = videoUrl && sourceKey && isValidTrim && !isExporting;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">

      {/* Hero Section */}
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-white sm:text-4xl">
          Create Perfect Video Clips
        </h2>
        <p className="mt-2 text-lg text-gray-400">
          Upload, trim, and export professional-quality video clips in seconds
        </p>
      </div>

      {/* Main Content */}
      {!videoUrl ? (
        <div className="mx-auto max-w-2xl">
          <UploadArea onUploadComplete={handleUploadComplete} />
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left Column - Video Preview */}
          <div className="space-y-6">
            <div>
              <h3 className="mb-3 text-lg font-semibold text-white">
                Video Preview
              </h3>
              <VideoPreview
                videoUrl={videoUrl}
                onLoadedMetadata={handleVideoMetadata}
              />
            </div>

            {currentJob && (
              <div>
                <h3 className="mb-3 text-lg font-semibold text-white">
                  Export Status
                </h3>
                <ExportProgress job={currentJob} />
              </div>
            )}

            <button
              onClick={() => {
                setVideoUrl(null);
                setSourceKey(null);
                setCurrentJob(null);
                setVideoDuration(0);
              }}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              ← Upload a different video
            </button>
          </div>

          {/* Right Column - Controls */}
          <div className="space-y-6">
            <div>
              <h3 className="mb-3 text-lg font-semibold text-white">
                Trim Settings
              </h3>
              <div className="rounded-xl border border-nvidia-border bg-nvidia-gray/30 p-6">
                {videoDuration > 0 ? (
                  <TrimControls
                    videoDuration={videoDuration}
                    onTrimChange={handleTrimChange}
                  />
                ) : (
                  <div className="flex items-center justify-center py-8 text-gray-400">
                    Loading video...
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-lg font-semibold text-white">
                Export Settings
              </h3>
              <div className="rounded-xl border border-nvidia-border bg-nvidia-gray/30 p-6">
                <ExportControls
                  onExport={handleExport}
                  disabled={!canExport}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 border-t border-nvidia-border pt-8 text-center">
        <p className="text-sm text-gray-500">
          Powered by FFmpeg • Processed securely in the cloud
        </p>
      </div>
    </div>
  );
}
