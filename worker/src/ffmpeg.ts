import { spawn } from "child_process";
import type { ExportSize } from "./types.js";

interface FFmpegOptions {
  inputPath: string;
  outputPath: string;
  startTime: number;
  duration: number;
  size: ExportSize;
  removeAudio: boolean;
  onProgress?: (progress: number) => void;
}

/**
 * Process video with FFmpeg
 * 
 * FFmpeg command explanation:
 * -ss: Start time for trimming
 * -t: Duration to trim
 * -i: Input file
 * -vf scale: Scale video to exact dimensions
 * -c:v libx264: Use H.264 codec
 * -preset medium: Balance between speed and compression
 * -crf 30: Constant Rate Factor (lower = better quality, 18-28 is good, 30-32 for smaller files)
 * -an: Remove audio (if removeAudio is true)
 * -c:a copy: Copy audio stream (if removeAudio is false)
 * -movflags +faststart: Enable streaming (move metadata to beginning)
 * -y: Overwrite output file
 */
export async function processVideo(options: FFmpegOptions): Promise<void> {
  const { inputPath, outputPath, startTime, duration, size, removeAudio, onProgress } = options;

  // Parse size
  const [width, height] = size.split("x").map(Number);

  // Build FFmpeg arguments
  const args = [
    "-ss", startTime.toString(),
    "-t", duration.toString(),
    "-i", inputPath,
    "-vf", `scale=${width}:${height}`,
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "30",
  ];

  // Handle audio
  if (removeAudio) {
    args.push("-an");
  } else {
    args.push("-c:a", "copy");
  }

  // Add streaming support and overwrite flag
  args.push(
    "-movflags", "+faststart",
    "-y",
    outputPath
  );

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", args);

    let stderr = "";

    ffmpeg.stderr.on("data", (data) => {
      stderr += data.toString();
      
      // Parse progress from FFmpeg output
      // FFmpeg outputs progress like: "time=00:00:03.45"
      const timeMatch = stderr.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
      if (timeMatch && onProgress) {
        const hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2], 10);
        const seconds = parseFloat(timeMatch[3]);
        const currentTime = hours * 3600 + minutes * 60 + seconds;
        
        // Calculate progress percentage
        const progress = Math.min(100, Math.round((currentTime / duration) * 100));
        onProgress(progress);
      }
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}\nStderr: ${stderr}`));
      }
    });

    ffmpeg.on("error", (error) => {
      reject(new Error(`FFmpeg error: ${error.message}`));
    });
  });
}
