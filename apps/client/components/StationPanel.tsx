"use client";

import type { Station } from "@/lib/types";
import { getSubwayColor } from "@/lib/subway-colors";
import { useThemeStore } from "@/lib/stores/theme-store";

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
  const isDark = useThemeStore((s) => s.resolved) === "dark";

  if (!station) return null;

  const panel = isDark
    ? "bg-black/60 backdrop-blur-xl border-white/10"
    : "bg-white/60 backdrop-blur-xl border-black/10";

  return (
    <div className={`fixed top-4 right-4 w-80 ${panel} rounded-xl border p-5 z-50`}>
      <div className="flex items-start justify-between mb-4">
        <h2 className={`text-lg font-bold leading-tight pr-4 ${isDark ? "text-white" : "text-black"}`}>
          {station.name}
        </h2>
        <button
          onClick={onClose}
          className={`text-xl leading-none shrink-0 cursor-pointer transition-colors ${isDark ? "text-white/50 hover:text-white" : "text-black/50 hover:text-black"}`}
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
        <div className={`border-t pt-3 ${isDark ? "border-white/10" : "border-black/10"}`}>
          <div className={`text-xs uppercase tracking-wide mb-1 ${isDark ? "text-white/50" : "text-black/50"}`}>
            Hourly Ridership
          </div>
          <div className={`text-xl font-bold tabular-nums ${isDark ? "text-white" : "text-black"}`}>
            {ridership.toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}
