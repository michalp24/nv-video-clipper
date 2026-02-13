"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { useEffect, useRef, useState } from "react";

export function useFFmpeg() {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const processingRef = useRef(false);

  useEffect(() => {
    loadFFmpeg();
  }, []);

  const loadFFmpeg = async () => {
    if (ffmpegRef.current || isLoading) return;

    setIsLoading(true);
    setLoadError(null);

    try {
      const ffmpeg = new FFmpeg();
      ffmpegRef.current = ffmpeg;

      // Load FFmpeg core from CDN with direct URLs
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
      await ffmpeg.load({
        coreURL: `${baseURL}/ffmpeg-core.js`,
        wasmURL: `${baseURL}/ffmpeg-core.wasm`,
      });

      setIsLoaded(true);
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to load FFmpeg:", error);
      setLoadError(error instanceof Error ? error.message : "Failed to load FFmpeg");
      setIsLoading(false);
    }
  };

  const cancelProcessing = () => {
    processingRef.current = false;
    console.log("⚠️ Cancellation requested");
  };

  const processVideo = async (
    videoFile: File,
    startTime: number,
    duration: number,
    width: number,
    height: number,
    removeAudio: boolean,
    onProgress?: (progress: number) => void
  ): Promise<Blob> => {
    if (!ffmpegRef.current || !isLoaded) {
      throw new Error("FFmpeg not loaded yet");
    }

    const ffmpeg = ffmpegRef.current;
    processingRef.current = true;

    console.log("🎬 Starting video processing...");
    console.log("📊 Input:", { startTime, duration, width, height, removeAudio, fileSize: videoFile.size });

    // Set up progress monitoring
    ffmpeg.on("progress", ({ progress }) => {
      if (!processingRef.current) {
        throw new Error("Processing cancelled by user");
      }
      const percent = Math.round(progress * 100);
      console.log("📈 Progress:", percent + "%");
      if (onProgress) {
        onProgress(percent);
      }
    });

    // Set up log monitoring
    ffmpeg.on("log", ({ message }) => {
      console.log("FFmpeg log:", message);
    });

    try {
      // Write input file to FFmpeg's virtual filesystem
      const inputName = "input.mp4";
      const outputName = "output.mp4";
      
      console.log("📁 Writing input file to FFmpeg filesystem...");
      await ffmpeg.writeFile(inputName, await fetchFile(videoFile));
      console.log("✅ Input file written");

      if (!processingRef.current) {
        throw new Error("Processing cancelled by user");
      }

      // Build FFmpeg command with explicit stream mapping
      const ffmpegArgs = [
        "-i", inputName,
        "-ss", startTime.toString(),
        "-t", duration.toString(),
      ];

      // Add audio settings or remove audio
      if (removeAudio) {
        console.log("🔇 FFmpeg: Removing audio (no audio stream)");
        // Only map video stream, completely exclude audio
        ffmpegArgs.push(
          "-map", "0:v:0",  // Only map first video stream
          "-vf", `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
          "-c:v", "libx264",
          "-preset", "ultrafast",  // Faster encoding for browser processing
          "-crf", "28",  // Slightly lower quality but much faster
          "-movflags", "+faststart"  // Optimize for web playback
        );
      } else {
        console.log("🔊 FFmpeg: Keeping audio with AAC encoding");
        // Map both video and audio streams
        ffmpegArgs.push(
          "-map", "0:v:0",  // Map first video stream
          "-map", "0:a:0?", // Map first audio stream if it exists (? makes it optional)
          "-vf", `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
          "-c:v", "libx264",
          "-preset", "ultrafast",  // Faster encoding for browser processing
          "-crf", "28",  // Slightly lower quality but much faster
          "-movflags", "+faststart",  // Optimize for web playback
          "-c:a", "aac",
          "-b:a", "128k"
        );
      }

      ffmpegArgs.push(outputName);

      console.log("⚙️ FFmpeg command:", ffmpegArgs.join(" "));
      console.log("🚀 Starting FFmpeg execution...");

      if (!processingRef.current) {
        throw new Error("Processing cancelled by user");
      }

      // Run FFmpeg command to trim and resize
      await ffmpeg.exec(ffmpegArgs);

      if (!processingRef.current) {
        throw new Error("Processing cancelled by user");
      }

      console.log("✅ FFmpeg execution completed");
      console.log("📖 Reading output file...");

      // Read the output file
      const data = await ffmpeg.readFile(outputName);
      const dataBuffer = data as Uint8Array;
      console.log("✅ Output file read, size:", dataBuffer.byteLength);

      // Clean up
      console.log("🧹 Cleaning up temporary files...");
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);
      console.log("✅ Cleanup complete");

      // Convert to Blob - slice to create a copy with proper ArrayBuffer type
      const buffer = dataBuffer.slice();
      const blob = new Blob([buffer], { type: "video/mp4" });
      console.log("🎉 Processing complete! Output blob size:", blob.size);
      
      return blob;
    } catch (error) {
      console.error("❌ FFmpeg processing error:", error);
      throw new Error(error instanceof Error ? error.message : "Video processing failed");
    }
  };

  return {
    isLoaded,
    isLoading,
    loadError,
    processVideo,
    cancelProcessing,
  };
}
