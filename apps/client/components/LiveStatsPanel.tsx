"use client";

import { useThemeStore } from "@/lib/stores/theme-store";
import { useAnimationStore } from "@/lib/stores/animation-store";

export interface FastestTrain {
  routeShortName: string;
  color: [number, number, number];
  speedMph: number;
}

interface LiveStatsPanelProps {
  fastestTrains: FastestTrain[];
  totalDistanceMiles: number;
}

function formatDistance(miles: number): string {
  if (miles >= 1000) return `${(miles / 1000).toFixed(1)}k`;
  return String(miles);
}

export default function LiveStatsPanel({
  fastestTrains,
  totalDistanceMiles,
}: LiveStatsPanelProps) {
  const isDark = useThemeStore((s) => s.resolved) === "dark";
  const activeTrainCount = useAnimationStore((s) => s.activeTrainCount);

  const textPrimary = isDark ? "text-white" : "text-black";
  const textMuted = isDark ? "text-white/50" : "text-black/50";
  const textDim = isDark ? "text-white/35" : "text-black/35";
  const panel = isDark
    ? "bg-black/60 backdrop-blur-xl border-white/10"
    : "bg-white/60 backdrop-blur-xl border-black/10";

  return (
    <div className={`w-48 ${panel} rounded-xl border p-3 z-50`}>
      {/* Active train count */}
      <div className="mb-2.5">
        <div className={`text-[9px] uppercase tracking-wider mb-0.5 ${textDim}`}>
          Trains Active
        </div>
        <div className={`text-2xl font-bold tabular-nums leading-tight ${textPrimary}`}>
          {activeTrainCount}
        </div>
      </div>

      {/* Top 5 fastest trains */}
      <div className="mb-2.5">
        <div className={`text-[9px] uppercase tracking-wider mb-1 ${textDim}`}>
          Fastest Trains
        </div>
        {fastestTrains.length > 0 ? (
          <div className="flex flex-col gap-1">
            {fastestTrains.map((train, i) => (
              <div key={`${train.routeShortName}-${i}`} className="flex items-center gap-2">
                <span
                  className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold text-white shrink-0"
                  style={{ backgroundColor: `rgb(${train.color.join(",")})` }}
                >
                  {train.routeShortName}
                </span>
                <span className={`text-sm font-bold tabular-nums leading-tight ${textPrimary}`}>
                  {train.speedMph}
                </span>
                <span className={`text-[9px] ${textMuted}`}>mph</span>
              </div>
            ))}
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
        <div className={`text-[8px] ${textDim}`}>resets on refresh</div>
      </div>
    </div>
  );
}
