"use client";

import { useRef, useState } from "react";

interface UploadAreaProps {
  onUploadComplete: (videoUrl: string, sourceKey: string, file?: File) => void;
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

      // CLIENT-SIDE ONLY: No server upload needed!
      // Simulate progress for UX
      for (let i = 0; i <= 100; i += 20) {
        setProgress(i);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Create local URL for the video
      const videoUrl = URL.createObjectURL(file);
      const key = `client/${Date.now()}-${file.name}`;

      console.log("✅ Video loaded for client-side processing");
      onUploadComplete(videoUrl, key, file);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to load video. Please try again.");
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
