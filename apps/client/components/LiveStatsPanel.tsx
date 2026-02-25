"use client";

import { useThemeStore } from "@/lib/stores/theme-store";
import { useAnimationStore } from "@/lib/stores/animation-store";

interface LiveStatsPanelProps {
  totalDistanceMiles: number;
}

function formatDistance(miles: number): string {
  if (miles >= 999999) return "999,999+";
  return miles.toLocaleString("en-US");
}

export default function LiveStatsPanel({
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
