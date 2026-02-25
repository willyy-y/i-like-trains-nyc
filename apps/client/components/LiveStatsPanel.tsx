"use client";

import { useThemeStore } from "@/lib/stores/theme-store";
import { useAnimationStore } from "@/lib/stores/animation-store";

export interface LineGroupStat {
  group: string;
  lines: string[];
  count: number;
  color: [number, number, number];
}

export interface TopStation {
  name: string;
  ridership: number;
}

interface LiveStatsPanelProps {
  lineStats: LineGroupStat[];
  topStations: TopStation[];
  onSelectLine: (line: string | null) => void;
  selectedLine: string | null;
  glowEnabled: boolean;
  onToggleGlow: () => void;
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function formatRidership(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function LiveStatsPanel({
  lineStats,
  topStations,
  onSelectLine,
  selectedLine,
  glowEnabled,
  onToggleGlow,
}: LiveStatsPanelProps) {
  const isDark = useThemeStore((s) => s.resolved) === "dark";
  const simTimeMs = useAnimationStore((s) => s.simTimeMs);
  const activeTrainCount = useAnimationStore((s) => s.activeTrainCount);
  const systemLoad = useAnimationStore((s) => s.systemLoad);

  const panel = isDark
    ? "bg-black/60 backdrop-blur-xl border-white/10"
    : "bg-white/60 backdrop-blur-xl border-black/10";

  const textPrimary = isDark ? "text-white" : "text-black";
  const textMuted = isDark ? "text-white/50" : "text-black/50";
  const textDim = isDark ? "text-white/35" : "text-black/35";

  const top4Lines = lineStats.slice(0, 4);
  const top3Stations = topStations.slice(0, 3);

  return (
    <div className={`w-56 ${panel} rounded-xl border p-3 z-50`}>
      {/* Header: LIVE + time */}
      <div className="flex items-center gap-2 mb-2">
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

      {/* Active trains + system load bar */}
      <div className="mb-2.5">
        <div className="flex items-baseline gap-1.5">
          <span className={`text-lg font-bold tabular-nums ${textPrimary}`}>
            {activeTrainCount}
          </span>
          <span className={`text-[10px] ${textMuted}`}>trains active</span>
        </div>
        <div className={`mt-1 h-1 rounded-full overflow-hidden ${isDark ? "bg-white/10" : "bg-black/10"}`}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.round(systemLoad * 100)}%`,
              background: systemLoad > 0.7
                ? "linear-gradient(90deg, #f59e0b, #ef4444)"
                : systemLoad > 0.4
                  ? "linear-gradient(90deg, #22c55e, #f59e0b)"
                  : "linear-gradient(90deg, #3b82f6, #22c55e)",
            }}
          />
        </div>
        <div className={`text-[9px] mt-0.5 ${textDim}`}>
          {Math.round(systemLoad * 100)}% system load
        </div>
      </div>

      {/* Top line groups */}
      {top4Lines.length > 0 && (
        <div className="mb-2.5">
          <div className={`text-[9px] uppercase tracking-wider mb-1.5 ${textDim}`}>
            Busiest Lines
          </div>
          <div className="flex flex-col gap-1">
            {top4Lines.map((ls) => {
              const isSelected = selectedLine && ls.lines.includes(selectedLine);
              return (
                <button
                  key={ls.group}
                  onClick={() =>
                    onSelectLine(isSelected ? null : ls.lines[0])
                  }
                  className={`flex items-center gap-2 px-1.5 py-0.5 rounded text-left cursor-pointer transition-colors ${
                    isSelected
                      ? isDark
                        ? "bg-white/15"
                        : "bg-black/10"
                      : isDark
                        ? "hover:bg-white/5"
                        : "hover:bg-black/5"
                  }`}
                >
                  <div className="flex gap-0.5">
                    {ls.lines.map((l) => (
                      <span
                        key={l}
                        className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[8px] font-bold text-white"
                        style={{ backgroundColor: `rgb(${ls.color.join(",")})` }}
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                  <span className={`text-[11px] ml-auto tabular-nums font-medium ${textPrimary}`}>
                    {ls.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Top stations */}
      {top3Stations.length > 0 && (
        <div className="mb-2.5">
          <div className={`text-[9px] uppercase tracking-wider mb-1 ${textDim}`}>
            Busiest Stations
          </div>
          <div className="flex flex-col gap-0.5">
            {top3Stations.map((s) => (
              <div key={s.name} className="flex items-center gap-2 px-1.5">
                <span className={`text-[10px] truncate flex-1 ${textMuted}`}>
                  {s.name}
                </span>
                <span className={`text-[10px] tabular-nums shrink-0 ${textDim}`}>
                  {formatRidership(s.ridership)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Glow toggle */}
      <div className={`pt-2 border-t ${isDark ? "border-white/5" : "border-black/5"}`}>
        <button
          onClick={onToggleGlow}
          className={`flex items-center gap-2 w-full text-left cursor-pointer rounded px-1.5 py-1 transition-colors ${
            isDark ? "hover:bg-white/5" : "hover:bg-black/5"
          }`}
        >
          <div
            className={`w-6 h-3.5 rounded-full relative transition-colors duration-200 ${
              glowEnabled
                ? "bg-purple-500"
                : isDark ? "bg-white/15" : "bg-black/15"
            }`}
          >
            <div
              className={`absolute top-0.5 w-2.5 h-2.5 rounded-full transition-all duration-200 ${
                glowEnabled
                  ? "left-3 bg-white"
                  : isDark ? "left-0.5 bg-white/60" : "left-0.5 bg-white"
              }`}
            />
          </div>
          <span className={`text-[10px] ${textMuted}`}>
            Train glow
          </span>
          <span className={`text-[8px] ml-auto ${textDim}`}>
            {glowEnabled ? "HD" : "Lite"}
          </span>
        </button>
      </div>
    </div>
  );
}
