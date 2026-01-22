"use client";

import { useState } from "react";
import type { ExportSize } from "@/types";

interface ExportControlsProps {
  onExport: (size: ExportSize, removeAudio: boolean) => void;
  disabled: boolean;
}

export default function ExportControls({ onExport, disabled }: ExportControlsProps) {
  const [size, setSize] = useState<ExportSize>("1920x1080");
  const [removeAudio, setRemoveAudio] = useState(true);

  const handleExport = () => {
    onExport(size, removeAudio);
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
            className="w-full rounded-lg border border-nvidia-border bg-nvidia-gray px-3 py-2.5 text-white text-sm
              focus:border-nvidia-green focus:outline-none focus:ring-2 focus:ring-nvidia-green/20
              transition-colors cursor-pointer"
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

      {/* Remove Audio Toggle */}
      <div className="flex items-center justify-between rounded-lg border border-nvidia-border bg-nvidia-gray/50 p-3">
        <div>
          <p className="text-sm font-medium text-white">Remove Audio</p>
          <p className="mt-0.5 text-xs text-gray-400">
            Reduces file size
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={removeAudio}
          onClick={() => setRemoveAudio(!removeAudio)}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            focus:outline-none focus:ring-2 focus:ring-nvidia-green focus:ring-offset-2
            focus:ring-offset-nvidia-dark
            ${removeAudio ? 'bg-nvidia-green' : 'bg-nvidia-border'}
          `}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${removeAudio ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
      </div>

      {/* Export Button */}
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
    </div>
  );
}
