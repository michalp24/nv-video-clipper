"use client";

import { useState } from "react";
import type { ExportSize, Job } from "@/types";

interface ExportControlsProps {
  onExport: (size: ExportSize, removeAudio: boolean) => void;
  onCancel?: () => void;
  disabled: boolean;
  currentJob?: Job | null;
  isExporting?: boolean;
}

export default function ExportControls({ 
  onExport, 
  onCancel,
  disabled, 
  currentJob,
  isExporting = false 
}: ExportControlsProps) {
  const [size, setSize] = useState<ExportSize>("1920x1080");
  const [removeAudio, setRemoveAudio] = useState(false);

  const handleExport = () => {
    console.log("Exporting with removeAudio:", removeAudio);
    onExport(size, removeAudio);
  };
  
  const handleDownload = () => {
    if (currentJob?.resultUrl) {
      const link = document.createElement('a');
      link.href = currentJob.resultUrl;
      link.download = `clip-${currentJob.size}-${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-4">
      {/* Size and Format - 2 Columns */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Export Size
          </label>
          <select
            value={size}
            onChange={(e) => setSize(e.target.value as ExportSize)}
            disabled={isExporting}
            className={`w-full rounded-lg border border-nvidia-border bg-nvidia-gray px-3 py-2.5 text-white text-sm
              focus:border-nvidia-green focus:outline-none focus:ring-2 focus:ring-nvidia-green/20
              transition-colors ${isExporting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <option value="630x354">630 × 354</option>
            <option value="850x480">850 × 480</option>
            <option value="1920x1080">1920 × 1080</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Format
          </label>
          <select
            value="mp4"
            disabled
            className="w-full rounded-lg border border-nvidia-border bg-nvidia-gray px-3 py-2.5 text-white text-sm
              opacity-75 cursor-not-allowed"
          >
            <option value="mp4">MP4 (H.264)</option>
          </select>
        </div>
      </div>

      {/* Audio Settings - Radio Buttons */}
      <div className="rounded-lg border border-nvidia-border bg-nvidia-gray/50 p-3">
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Audio
        </label>
        <div className="flex gap-3">
          <label className={`flex flex-1 items-center gap-2 rounded-lg border border-nvidia-border bg-nvidia-dark/50 p-3 transition-all 
            ${isExporting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-nvidia-green/50'}`}>
            <input
              type="radio"
              name="audio"
              checked={!removeAudio}
              onChange={() => setRemoveAudio(false)}
              disabled={isExporting}
              className="h-4 w-4 border-nvidia-border bg-nvidia-gray text-nvidia-green 
                focus:ring-2 focus:ring-nvidia-green focus:ring-offset-2 focus:ring-offset-nvidia-dark
                disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="text-sm font-medium text-white">On</span>
          </label>
          
          <label className={`flex flex-1 items-center gap-2 rounded-lg border border-nvidia-border bg-nvidia-dark/50 p-3 transition-all 
            ${isExporting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-nvidia-green/50'}`}>
            <input
              type="radio"
              name="audio"
              checked={removeAudio}
              onChange={() => setRemoveAudio(true)}
              disabled={isExporting}
              className="h-4 w-4 border-nvidia-border bg-nvidia-gray text-nvidia-green 
                focus:ring-2 focus:ring-nvidia-green focus:ring-offset-2 focus:ring-offset-nvidia-dark
                disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="text-sm font-medium text-white">Off</span>
          </label>
        </div>
      </div>

      {/* Export Button / Progress / Download */}
      {!isExporting && currentJob?.status !== "completed" ? (
        // Export Button
        <button
          onClick={handleExport}
          disabled={disabled}
          className={`
            w-full rounded-lg px-6 py-3 text-base font-semibold transition-all
            focus:outline-none focus:ring-2 focus:ring-nvidia-green focus:ring-offset-2
            focus:ring-offset-nvidia-dark
            ${
              disabled
                ? 'cursor-not-allowed bg-nvidia-gray text-gray-500'
                : 'bg-nvidia-green text-black hover:bg-nvidia-green-hover shadow-lg shadow-nvidia-green/20'
            }
          `}
        >
          Export Clip
        </button>
      ) : currentJob?.status === "completed" ? (
        // Download Button
        <button
          onClick={handleDownload}
          className="w-full rounded-lg px-6 py-3 text-base font-semibold transition-all
            bg-nvidia-green text-black hover:bg-nvidia-green-hover shadow-lg shadow-nvidia-green/20
            focus:outline-none focus:ring-2 focus:ring-nvidia-green focus:ring-offset-2
            focus:ring-offset-nvidia-dark flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Clip
        </button>
      ) : (
        // Progress Bar with Cancel Button
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300">Processing...</span>
              <span className="font-semibold text-nvidia-green">{currentJob?.progress || 0}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-nvidia-border">
              <div
                className="h-full bg-nvidia-green transition-all duration-300"
                style={{ width: `${currentJob?.progress || 0}%` }}
              />
            </div>
          </div>
          
          {/* Cancel Button */}
          {onCancel && (
            <button
              onClick={onCancel}
              className="w-full rounded-lg px-6 py-2.5 text-sm font-medium transition-all
                border border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500
                focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
                focus:ring-offset-nvidia-dark"
            >
              Cancel Processing
            </button>
          )}
        </div>
      )}
    </div>
  );
}
