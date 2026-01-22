"use client";

import { useEffect, useState, useRef } from "react";

interface TrimControlsProps {
  videoDuration: number;
  onTrimChange: (startTime: number, duration: number, isValid: boolean) => void;
}

export default function TrimControls({ videoDuration, onTrimChange }: TrimControlsProps) {
  const [startTime, setStartTime] = useState(0);
  const [clipDuration, setClipDuration] = useState(4);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartTime, setDragStartTime] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);

  const endTime = startTime + clipDuration;
  const maxStartTime = Math.floor(Math.max(0, videoDuration - clipDuration));
  const isValid = clipDuration >= 3 && clipDuration <= 6 && endTime <= videoDuration;

  useEffect(() => {
    onTrimChange(startTime, clipDuration, isValid);
  }, [startTime, clipDuration, isValid, onTrimChange]);

  // Adjust start time if it exceeds video length with new duration
  useEffect(() => {
    if (startTime + clipDuration > videoDuration) {
      setStartTime(Math.max(0, videoDuration - clipDuration));
    }
  }, [clipDuration, videoDuration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  const startPercent = (startTime / videoDuration) * 100;
  const durationPercent = (clipDuration / videoDuration) * 100;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragStartTime(startTime);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragStartX;
    const deltaTime = Math.round((deltaX / rect.width) * videoDuration);
    const newStart = Math.max(0, Math.min(dragStartTime + deltaTime, videoDuration - clipDuration));
    setStartTime(newStart);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStartX, dragStartTime, clipDuration, videoDuration]);

  return (
    <div className="space-y-6">
      {/* Duration Selector */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-300">
          Clip Duration
        </label>
        <div className="flex gap-2">
          {[3, 4, 5, 6].map((duration) => (
            <button
              key={duration}
              onClick={() => setClipDuration(duration)}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all ${
                clipDuration === duration
                  ? 'bg-nvidia-green text-black shadow-lg shadow-nvidia-green/30'
                  : 'bg-nvidia-gray border border-nvidia-border text-gray-300 hover:border-nvidia-green/50 hover:text-white'
              }`}
            >
              {duration}s
            </button>
          ))}
        </div>
      </div>

      {/* Draggable Timeline */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-300">
          Position on Timeline
        </label>

        <div 
          ref={timelineRef}
          className="relative h-12 rounded-lg bg-nvidia-gray/50 border border-nvidia-border select-none"
        >
          {/* Unselected area (left) */}
          <div 
            className="absolute top-0 left-0 h-full bg-nvidia-gray/80 rounded-l-lg pointer-events-none"
            style={{ width: `${startPercent}%` }}
          />
          
          {/* Selected clip - Simple draggable green bar */}
          <div 
            className={`absolute top-0 h-full bg-nvidia-green rounded transition-all ${
              isDragging ? 'cursor-grabbing opacity-90' : 'cursor-grab hover:opacity-80'
            }`}
            style={{ 
              left: `${startPercent}%`, 
              width: `${durationPercent}%` 
            }}
            onMouseDown={handleMouseDown}
          />

          {/* Unselected area (right) */}
          <div 
            className="absolute top-0 right-0 h-full bg-nvidia-gray/80 rounded-r-lg pointer-events-none"
            style={{ width: `${100 - startPercent - durationPercent}%` }}
          />

          {/* Time markers */}
          <div className="absolute -bottom-6 left-0 text-xs text-gray-500">
            0s
          </div>
          <div className="absolute -bottom-6 right-0 text-xs text-gray-500">
            {formatTime(Math.floor(videoDuration))}
          </div>
        </div>

        <div className="text-xs text-gray-400 text-center pt-5">
          Drag the green bar to position your {clipDuration}s clip
        </div>
      </div>

      {/* Summary Card */}
      <div className="rounded-lg border border-nvidia-border bg-nvidia-gray/50 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Selected Range:</span>
          <span className="font-medium text-white">
            {Math.floor(startTime / 60)}:{(startTime % 60).toString().padStart(2, '0')}-{Math.floor(endTime / 60)}:{(endTime % 60).toString().padStart(2, '0')}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-gray-400">Clip Duration:</span>
          <span className="font-semibold text-nvidia-green">
            {clipDuration} second{clipDuration !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
