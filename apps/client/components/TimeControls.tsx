"use client";

import { useAnimationStore } from "@/lib/stores/animation-store";
import { useThemeStore } from "@/lib/stores/theme-store";
import { CONFIG } from "@/lib/config";
import TimeDisplay from "./TimeDisplay";

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

  // Seconds since midnight for the scrub bar
  const d = new Date(simTimeMs);
  const secondsSinceMidnight =
    d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();

  function handleScrub(e: React.ChangeEvent<HTMLInputElement>) {
    const secs = Number(e.target.value);
    const base = new Date(simTimeMs);
    base.setHours(0, 0, 0, 0);
    setSimTimeMs(base.getTime() + secs * 1000);
  }

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    jumpToDate(e.target.value);
  }

  const panel = isDark
    ? "bg-black/60 backdrop-blur-xl border-white/10"
    : "bg-white/60 backdrop-blur-xl border-black/10";
  const text = isDark ? "text-white" : "text-black";
  const textMuted = isDark ? "text-white/30" : "text-black/30";
  const textSoft = isDark ? "text-white/50" : "text-black/50";

  return (
    <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 ${panel} rounded-xl border p-4 z-50 w-[480px] max-w-[95vw] select-none`}>
      <TimeDisplay />

      {/* Scrub bar */}
      <div className="mt-3">
        <input
          type="range"
          min={0}
          max={86400}
          value={secondsSinceMidnight}
          onChange={handleScrub}
          className={`w-full h-1 appearance-none rounded-full outline-none cursor-pointer ${isDark ? "bg-white/20 accent-white" : "bg-black/20 accent-black"}`}
        />
        <div className={`flex justify-between text-[10px] ${textMuted} mt-0.5`}>
          <span>12 AM</span>
          <span>6 AM</span>
          <span>12 PM</span>
          <span>6 PM</span>
          <span>12 AM</span>
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-center gap-3 mt-3">
        {/* Date input */}
        <input
          type="date"
          value={activeDate}
          min={CONFIG.DATA_START_DATE}
          max={CONFIG.DATA_END_DATE}
          onChange={handleDateChange}
          className={`border rounded-lg px-2 py-1 text-xs outline-none cursor-pointer ${isDark ? "bg-white/10 border-white/10 text-white" : "bg-black/10 border-black/10 text-black"}`}
        />

        {/* Play / Pause */}
        <button
          onClick={togglePlay}
          className={`w-10 h-10 rounded-full transition-colors flex items-center justify-center text-lg cursor-pointer ${isDark ? "bg-white/15 hover:bg-white/25 text-white" : "bg-black/15 hover:bg-black/25 text-black"}`}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? "\u23F8" : "\u25B6"}
        </button>

        {/* Speed presets */}
        <div className="flex gap-1">
          {CONFIG.SPEED_PRESETS.map((s, i) => (
            <button
              key={s}
              onClick={() => setSpeedup(s)}
              className={`px-2 py-1 text-xs rounded-lg transition-colors cursor-pointer ${
                speedup === s
                  ? isDark ? "bg-white/25 text-white" : "bg-black/25 text-black"
                  : isDark ? "bg-white/5 text-white/50 hover:bg-white/15 hover:text-white" : "bg-black/5 text-black/50 hover:bg-black/15 hover:text-black"
              }`}
            >
              {CONFIG.SPEED_LABELS[i]}
            </button>
          ))}
        </div>
      </div>

      {/* Train count */}
      <div className={`text-center mt-2 text-[10px] ${textMuted}`}>
        {activeTrainCount > 0
          ? `${activeTrainCount.toLocaleString()} active trains`
          : "No train data loaded"}
      </div>
    </div>
  );
}
