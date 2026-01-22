"use client";

import { useEffect, useRef } from "react";

interface VideoPreviewProps {
  videoUrl: string;
  onLoadedMetadata?: (duration: number) => void;
}

export default function VideoPreview({ videoUrl, onLoadedMetadata }: VideoPreviewProps) {
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
