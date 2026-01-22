"use client";

import { useRef, useState } from "react";

interface UploadAreaProps {
  onUploadComplete: (videoUrl: string, sourceKey: string) => void;
}

export default function UploadArea({ onUploadComplete }: UploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const videoFile = files.find((file) => file.type.startsWith("video/"));

    if (videoFile) {
      await uploadFile(videoFile);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  };

  const uploadFile = async (file: File) => {
    try {
      setIsUploading(true);
      setProgress(0);

      // Check if we have real storage credentials or are in demo mode
      const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true" || 
                         (!process.env.R2_ENDPOINT && !process.env.GCS_PROJECT_ID) ||
                         (process.env.R2_ENDPOINT && process.env.R2_ENDPOINT.includes("placeholder"));

      // Get signed upload URL (or local endpoint)
      const urlResponse = await fetch("/api/r2/upload-url", {
        method: "POST",
      });

      if (!urlResponse.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { uploadUrl, key } = await urlResponse.json();

      // Check which storage mode we're using
      if (uploadUrl.startsWith("local://")) {
        // LOCAL STORAGE MODE: Upload to local API endpoint
        console.log("✓ Using Local Storage - uploading to server");

        const formData = new FormData();
        formData.append("file", file);
        formData.append("key", key);

        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            setProgress(percent);
          }
        });

        await new Promise((resolve, reject) => {
          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(xhr.response);
            } else {
              reject(new Error(`Upload failed: ${xhr.status}`));
            }
          });

          xhr.addEventListener("error", () => {
            reject(new Error("Upload failed"));
          });

          xhr.open("POST", "/api/storage/upload");
          xhr.send(formData);
        });

        const videoUrl = URL.createObjectURL(file);
        onUploadComplete(videoUrl, key);

      } else if (isDemoMode) {
        // DEMO MODE: Simulate upload progress
        console.log("🎬 Running in DEMO MODE - no upload needed");
        
        for (let i = 0; i <= 100; i += 10) {
          setProgress(i);
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const videoUrl = URL.createObjectURL(file);
        const demoKey = `demo/${Date.now()}-${file.name}`;

        console.log("✅ Demo upload complete");
        onUploadComplete(videoUrl, demoKey);

      } else {
        // CLOUD STORAGE MODE: Upload to signed URL (GCS or R2)
        console.log("✓ Using Cloud Storage (GCS or R2)");

        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            setProgress(percent);
          }
        });

        await new Promise((resolve, reject) => {
          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(xhr.response);
            } else {
              reject(new Error(`Upload failed: ${xhr.status}`));
            }
          });

          xhr.addEventListener("error", () => {
            reject(new Error("Upload failed"));
          });

          xhr.open("PUT", uploadUrl);
          xhr.setRequestHeader("Content-Type", file.type);
          xhr.send(file);
        });

        const videoUrl = URL.createObjectURL(file);
        onUploadComplete(videoUrl, key);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`
          relative flex min-h-[300px] cursor-pointer flex-col items-center justify-center
          rounded-xl border-2 border-dashed transition-all
          ${
            isDragging
              ? "border-nvidia-green bg-nvidia-green/5"
              : "border-nvidia-border bg-nvidia-gray/30 hover:border-nvidia-green/50 hover:bg-nvidia-gray/50"
          }
          ${isUploading ? "pointer-events-none opacity-75" : ""}
        `}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-nvidia-border border-t-nvidia-green" />
            <p className="text-lg font-medium text-white">
              Uploading... {progress}%
            </p>
            <div className="h-2 w-64 overflow-hidden rounded-full bg-nvidia-border">
              <div
                className="h-full bg-nvidia-green transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-nvidia-green/10 border border-nvidia-green/20">
              <svg
                className="h-10 w-10 text-nvidia-green"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>

            <div>
              <p className="text-lg font-medium text-white">
                Drop your video here
              </p>
              <p className="mt-1 text-sm text-gray-400">
                or click to browse files
              </p>
            </div>

            <p className="text-xs text-gray-500">
              Supports MP4, MOV, WebM and more
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
