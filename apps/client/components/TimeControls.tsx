"use client";

import { useAnimationStore } from "@/lib/stores/animation-store";
import { useThemeStore } from "@/lib/stores/theme-store";
import { CONFIG } from "@/lib/config";

export default function TimeControls() {
  const isPlaying = useAnimationStore((s) => s.isPlaying);
  const speedup = useAnimationStore((s) => s.speedup);
  const simTimeMs = useAnimationStore((s) => s.simTimeMs);
  const activeDate = useAnimationStore((s) => s.activeDate);
  const activeTrainCount = useAnimationStore((s) => s.activeTrainCount);
  const togglePlay = useAnimationStore((s) => s.togglePlay);
  const setSpeedup = useAnimationStore((s) => s.setSpeedup);
  const jumpToDate = useAnimationStore((s) => s.jumpToDate);
  const setSimTimeMs = useAnimationStore((s) => s.setSimTimeMs);

  const isDark = useThemeStore((s) => s.resolved) === "dark";

  const d = new Date(simTimeMs);
  const secondsSinceMidnight =
    d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();

  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  function handleScrub(e: React.ChangeEvent<HTMLInputElement>) {
    const secs = Number(e.target.value);
    const base = new Date(simTimeMs);
    base.setHours(0, 0, 0, 0);
    setSimTimeMs(base.getTime() + secs * 1000);
  }

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    jumpToDate(e.target.value);
  }

  function handleSpeedChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSpeedup(Number(e.target.value));
  }

  const panel = isDark
    ? "bg-black/60 backdrop-blur-xl border-white/10"
    : "bg-white/60 backdrop-blur-xl border-black/10";
  const textMuted = isDark ? "text-white/30" : "text-black/30";

  return (
    <div className={`fixed top-20 left-4 ${panel} rounded-xl border p-3 z-50 select-none`}>
      {/* Time + play/pause row */}
      <div className="flex items-center gap-2">
        <button
          onClick={togglePlay}
          className={`w-7 h-7 rounded-full transition-colors flex items-center justify-center text-sm cursor-pointer shrink-0 ${isDark ? "bg-white/15 hover:bg-white/25 text-white" : "bg-black/15 hover:bg-black/25 text-black"}`}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? "\u23F8" : "\u25B6"}
        </button>
        <div className={`text-lg font-bold tabular-nums leading-none ${isDark ? "text-white" : "text-black"}`}>
          {time}
        </div>
        <select
          value={speedup}
          onChange={handleSpeedChange}
          className={`ml-auto text-[10px] rounded-md px-1.5 py-0.5 outline-none cursor-pointer border ${isDark ? "bg-white/10 border-white/10 text-white/70" : "bg-black/5 border-black/10 text-black/70"}`}
        >
          {CONFIG.SPEED_PRESETS.map((s, i) => (
            <option key={s} value={s}>
              {CONFIG.SPEED_LABELS[i]}
            </option>
          ))}
        </select>
      </div>

      {/* Scrub bar */}
      <div className="mt-2">
        <input
          type="range"
          min={0}
          max={86400}
          value={secondsSinceMidnight}
          onChange={handleScrub}
          className={`w-full h-1 appearance-none rounded-full outline-none cursor-pointer ${isDark ? "bg-white/20 accent-white" : "bg-black/20 accent-black"}`}
        />
        <div className={`flex justify-between text-[9px] ${textMuted} -mt-0.5`}>
          <span>12a</span>
          <span>6a</span>
          <span>12p</span>
          <span>6p</span>
          <span>12a</span>
        </div>
      </div>

      {/* Date + train count row */}
      <div className="flex items-center gap-2 mt-1.5">
        <input
          type="date"
          value={activeDate}
          min={CONFIG.DATA_START_DATE}
          max={CONFIG.DATA_END_DATE}
          onChange={handleDateChange}
          className={`border rounded-md px-1.5 py-0.5 text-[10px] outline-none cursor-pointer ${isDark ? "bg-white/10 border-white/10 text-white" : "bg-black/10 border-black/10 text-black"}`}
        />
        <span className={`ml-auto text-[9px] ${textMuted}`}>
          {activeTrainCount > 0
            ? `${activeTrainCount.toLocaleString()} trains`
            : "No data"}
        </span>
      </div>
    </div>
  );
}
