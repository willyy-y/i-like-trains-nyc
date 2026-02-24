"use client";

import { useAnimationStore } from "@/lib/stores/animation-store";
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

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-xl rounded-xl border border-white/10 p-4 z-50 w-[480px] max-w-[95vw] select-none">
      <TimeDisplay />

      {/* Scrub bar */}
      <div className="mt-3">
        <input
          type="range"
          min={0}
          max={86400}
          value={secondsSinceMidnight}
          onChange={handleScrub}
          className="w-full h-1 appearance-none bg-white/20 rounded-full outline-none cursor-pointer accent-white"
        />
        <div className="flex justify-between text-[10px] text-white/30 mt-0.5">
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
          className="bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none cursor-pointer"
        />

        {/* Play / Pause */}
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 transition-colors flex items-center justify-center text-white text-lg cursor-pointer"
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
                  ? "bg-white/25 text-white"
                  : "bg-white/5 text-white/50 hover:bg-white/15 hover:text-white"
              }`}
            >
              {CONFIG.SPEED_LABELS[i]}
            </button>
          ))}
        </div>
      </div>

      {/* Train count */}
      <div className="text-center mt-2 text-[10px] text-white/30">
        {activeTrainCount > 0
          ? `${activeTrainCount.toLocaleString()} active trains`
          : "No train data loaded"}
      </div>
    </div>
  );
}
