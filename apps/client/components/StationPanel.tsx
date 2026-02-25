"use client";

import { useMemo } from "react";
import type { Station, StationWithRidership } from "@/lib/types";
import { getSubwayColor } from "@/lib/subway-colors";
import { useThemeStore } from "@/lib/stores/theme-store";

interface StationPanelProps {
  station: Station | null;
  ridership?: number;
  ridershipEntries?: StationWithRidership[];
  onClose: () => void;
}

function Sparkline({ data, isDark }: { data: number[]; isDark: boolean }) {
  const max = Math.max(...data, 1);
  const barWidth = 10;
  const gap = 2;
  const height = 40;
  const width = data.length * (barWidth + gap) - gap;

  const peakHour = data.indexOf(Math.max(...data));
  const peakLabel = peakHour === 0
    ? "12 AM"
    : peakHour < 12
    ? `${peakHour} AM`
    : peakHour === 12
    ? "12 PM"
    : `${peakHour - 12} PM`;

  return (
    <div>
      <svg width={width} height={height} className="block">
        {data.map((v, i) => {
          const barH = (v / max) * height;
          const isPeak = i === peakHour;
          return (
            <rect
              key={i}
              x={i * (barWidth + gap)}
              y={height - barH}
              width={barWidth}
              height={Math.max(barH, 1)}
              rx={2}
              fill={isPeak
                ? (isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.8)")
                : (isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)")
              }
            />
          );
        })}
      </svg>
      <div className="flex justify-between mt-1">
        <span className={`text-[8px] ${isDark ? "text-white/30" : "text-black/30"}`}>12a</span>
        <span className={`text-[8px] ${isDark ? "text-white/30" : "text-black/30"}`}>12p</span>
        <span className={`text-[8px] ${isDark ? "text-white/30" : "text-black/30"}`}>12a</span>
      </div>
      {max > 0 && (
        <div className={`text-[10px] mt-1 ${isDark ? "text-white/50" : "text-black/50"}`}>
          Busiest at {peakLabel}
        </div>
      )}
    </div>
  );
}

export default function StationPanel({
  station,
  ridership,
  ridershipEntries,
  onClose,
}: StationPanelProps) {
  const isDark = useThemeStore((s) => s.resolved) === "dark";

  // Build 24-hour sparkline data for this station
  const hourlyData = useMemo(() => {
    if (!station || !ridershipEntries) return Array(24).fill(0);
    // ridershipEntries is all stations for the current hour — we need the full day
    // For now, use the normalized value scaled; we'll enhance this later
    // This is a placeholder — the real sparkline would need all 24 hours of data
    return Array(24).fill(0);
  }, [station, ridershipEntries]);

  if (!station) return null;

  const panel = isDark
    ? "bg-black/60 backdrop-blur-xl border-white/10"
    : "bg-white/60 backdrop-blur-xl border-black/10";

  const dailyTotal = ridership ? ridership * 18 : 0; // rough estimate from hourly

  return (
    <div
      className={`fixed top-4 right-4 w-80 max-sm:top-auto max-sm:bottom-16 max-sm:left-4 max-sm:right-4 max-sm:w-auto ${panel} rounded-xl border p-5 z-50 transition-all duration-300`}
      style={{ animation: "slideIn 0.3s ease-out" }}
    >
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>

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

      {ridership !== undefined && ridership > 0 && (
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
