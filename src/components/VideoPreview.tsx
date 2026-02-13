"use client";

import { useEffect, useRef } from "react";

interface VideoPreviewProps {
  videoUrl: string;
  currentTime?: number;  // New prop to control video position
  onLoadedMetadata?: (duration: number) => void;
}

export default function VideoPreview({ videoUrl, currentTime, onLoadedMetadata }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      onLoadedMetadata?.(video.duration);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [onLoadedMetadata]);

  // Sync video current time with the currentTime prop
  useEffect(() => {
    const video = videoRef.current;
    if (!video || currentTime === undefined) return;

    // Only seek if the difference is significant (more than 0.5 seconds)
    // to avoid constant seeking while playing
    if (Math.abs(video.currentTime - currentTime) > 0.5) {
      video.currentTime = currentTime;
    }
  }, [currentTime]);

  return (
    <div className="w-full overflow-hidden rounded-xl border border-nvidia-border bg-black">
      <video
        ref={videoRef}
        src={videoUrl}
        controls
        className="h-auto w-full"
        preload="metadata"
      />
    </div>
  );
}
