"use client";

import { useThemeStore } from "@/lib/stores/theme-store";
import { useAnimationStore } from "@/lib/stores/animation-store";

export interface FastestTrain {
  routeShortName: string;
  color: [number, number, number];
  speedMph: number;
}

interface LiveStatsPanelProps {
  fastestTrain: FastestTrain | null;
  totalDistanceMiles: number;
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function formatDistance(miles: number): string {
  if (miles >= 1000) return `${(miles / 1000).toFixed(1)}k`;
  return String(miles);
}

export default function LiveStatsPanel({
  fastestTrain,
  totalDistanceMiles,
}: LiveStatsPanelProps) {
  const isDark = useThemeStore((s) => s.resolved) === "dark";
  const simTimeMs = useAnimationStore((s) => s.simTimeMs);
  const activeTrainCount = useAnimationStore((s) => s.activeTrainCount);

  const textPrimary = isDark ? "text-white" : "text-black";
  const textMuted = isDark ? "text-white/50" : "text-black/50";
  const textDim = isDark ? "text-white/35" : "text-black/35";
  const panel = isDark
    ? "bg-black/60 backdrop-blur-xl border-white/10"
    : "bg-white/60 backdrop-blur-xl border-black/10";

  return (
    <div className={`w-48 ${panel} rounded-xl border p-3 z-50`}>
      {/* Header: LIVE + time */}
      <div className="flex items-center gap-2 mb-2.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        <span className={`text-[10px] uppercase tracking-widest font-semibold ${textMuted}`}>
          Live
        </span>
        <span className={`text-[10px] ml-auto font-mono ${textDim}`}>
          {formatTime(simTimeMs)}
        </span>
      </div>

      {/* Active train count */}
      <div className="mb-2.5">
        <div className={`text-[9px] uppercase tracking-wider mb-0.5 ${textDim}`}>
          Trains Active
        </div>
        <div className={`text-2xl font-bold tabular-nums leading-tight ${textPrimary}`}>
          {activeTrainCount}
        </div>
      </div>

      {/* Fastest train */}
      <div className="mb-2.5">
        <div className={`text-[9px] uppercase tracking-wider mb-0.5 ${textDim}`}>
          Fastest Train
        </div>
        {fastestTrain ? (
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white shrink-0"
              style={{ backgroundColor: `rgb(${fastestTrain.color.join(",")})` }}
            >
              {fastestTrain.routeShortName}
            </span>
            <span className={`text-lg font-bold tabular-nums leading-tight ${textPrimary}`}>
              {fastestTrain.speedMph}
            </span>
            <span className={`text-[10px] ${textMuted}`}>mph</span>
          </div>
        ) : (
          <div className={`text-sm ${textDim}`}>---</div>
        )}
      </div>

      {/* Distance traveled */}
      <div>
        <div className={`text-[9px] uppercase tracking-wider mb-0.5 ${textDim}`}>
          Distance Traveled
        </div>
        <div className="flex items-baseline gap-1">
          <span className={`text-lg font-bold tabular-nums leading-tight ${textPrimary}`}>
            {formatDistance(totalDistanceMiles)}
          </span>
          <span className={`text-[10px] ${textMuted}`}>mi</span>
        </div>
      </div>
    </div>
  );
}
