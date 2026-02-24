"use client";

import type { Station } from "@/lib/types";
import { getSubwayColor } from "@/lib/subway-colors";

interface StationPanelProps {
  station: Station | null;
  ridership?: number;
  onClose: () => void;
}

export default function StationPanel({
  station,
  ridership,
  onClose,
}: StationPanelProps) {
  if (!station) return null;

  return (
    <div className="fixed top-4 right-4 w-80 bg-black/60 backdrop-blur-xl rounded-xl border border-white/10 p-5 z-50 animate-in slide-in-from-right">
      <div className="flex items-start justify-between mb-4">
        <h2 className="text-lg font-bold text-white leading-tight pr-4">
          {station.name}
        </h2>
        <button
          onClick={onClose}
          className="text-white/50 hover:text-white transition-colors text-xl leading-none shrink-0 cursor-pointer"
          aria-label="Close panel"
        >
          x
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {station.lines.map((line) => {
          const [r, g, b] = getSubwayColor(line);
          return (
            <span
              key={line}
              className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: `rgb(${r},${g},${b})` }}
            >
              {line}
            </span>
          );
        })}
      </div>

      {ridership !== undefined && (
        <div className="border-t border-white/10 pt-3">
          <div className="text-white/50 text-xs uppercase tracking-wide mb-1">
            Hourly Ridership
          </div>
          <div className="text-white text-xl font-bold tabular-nums">
            {ridership.toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}
