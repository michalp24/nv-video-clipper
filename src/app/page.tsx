"use client";

import { useState, useCallback } from "react";
import UploadArea from "@/components/UploadArea";
import VideoPreview from "@/components/VideoPreview";
import TrimControls from "@/components/TrimControls";
import ExportControls from "@/components/ExportControls";
import ExportProgress from "@/components/ExportProgress";
import { useFFmpeg } from "@/lib/useFFmpeg";
import type { Job, ExportSize } from "@/types";

export default function Home() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [duration, setDuration] = useState(3);
  const [isValidTrim, setIsValidTrim] = useState(false);
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  
  const { isLoaded: ffmpegLoaded, isLoading: ffmpegLoading, loadError: ffmpegError, processVideo } = useFFmpeg();

  const handleUploadComplete = useCallback((url: string, key: string, file?: File) => {
    setVideoUrl(url);
    setVideoFile(file || null);
    setCurrentJob(null);
    setDownloadUrl(null);
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
      if (!videoFile || !isValidTrim || !ffmpegLoaded) return;

      try {
        setIsExporting(true);
        setExportProgress(0);
        setDownloadUrl(null);

        // Create a mock job for UI consistency
        const mockJob: Job = {
          id: "client-" + Date.now(),
          sourceKey: "local-file",
          startTime,
          duration,
          size,
          removeAudio,
          status: "processing",
          progress: 0,
          createdAt: Date.now(),
        };
        setCurrentJob(mockJob);

        // Get dimensions from size
        const [width, height] = size.split("x").map(Number);

        // Process video using FFmpeg.wasm
        const outputBlob = await processVideo(
          videoFile,
          startTime,
          duration,
          width,
          height,
          (progress) => {
            setExportProgress(progress);
            setCurrentJob((prev) => prev ? { ...prev, progress } : null);
          }
        );

        // Create download URL
        const url = URL.createObjectURL(outputBlob);
        setDownloadUrl(url);

        // Update job to completed
        setCurrentJob((prev) => prev ? {
          ...prev,
          status: "completed",
          progress: 100,
          resultKey: "client-download",
          resultUrl: url,
        } : null);

        setIsExporting(false);
      } catch (error) {
        console.error("Export error:", error);
        alert(error instanceof Error ? error.message : "Failed to export video. Please try again.");
        setCurrentJob((prev) => prev ? {
          ...prev,
          status: "failed",
          error: error instanceof Error ? error.message : "Export failed",
        } : null);
        setIsExporting(false);
      }
    },
    [videoFile, startTime, duration, isValidTrim, ffmpegLoaded, processVideo]
  );

  const canExport = videoUrl && videoFile && isValidTrim && !isExporting && ffmpegLoaded;

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
        
        {/* FFmpeg Loading Status */}
        {ffmpegLoading && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-nvidia-green/10 border border-nvidia-green/30 px-4 py-2 text-sm text-nvidia-green">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-nvidia-green border-t-transparent" />
            Loading video processor...
          </div>
        )}
        {ffmpegError && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2 text-sm text-red-400">
            ⚠️ Failed to load video processor. Please refresh the page.
          </div>
        )}
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
                setVideoFile(null);
                setCurrentJob(null);
                setVideoDuration(0);
                setDownloadUrl(null);
                setExportProgress(0);
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
          Powered by FFmpeg.wasm • All processing happens in your browser • Your videos never leave your device
        </p>
      </div>
    </div>
  );
}
