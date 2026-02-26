"use client";

import { useThemeStore } from "@/lib/stores/theme-store";
import { useCameraStore } from "@/lib/stores/camera-store";

export default function CinematicButton() {
  const isDark = useThemeStore((s) => s.resolved) === "dark";
  const activeTourType = useCameraStore((s) => s.activeTourType);
  const startTour = useCameraStore((s) => s.startTour);
  const stopTour = useCameraStore((s) => s.stopTour);

  const btnClass = isDark
    ? "bg-white/10 hover:bg-white/20 text-white/70 border-white/10"
    : "bg-black/5 hover:bg-black/10 text-black/70 border-black/10";

  const activeBtnClass = isDark
    ? "bg-white/20 text-white border-white/20"
    : "bg-black/15 text-black border-black/15";

  const isFlythrough = activeTourType === "flythrough";
  const isRushHour = activeTourType === "rush-hour";

  function handleClick(type: "flythrough" | "rush-hour") {
    if (activeTourType === type) {
      stopTour();
    } else {
      if (activeTourType) stopTour();
      startTour(type);
    }
  }

  return (
    <div className="flex gap-1.5">
      <button
        onClick={() => handleClick("flythrough")}
        className={`px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${isFlythrough ? activeBtnClass : btnClass}`}
      >
        {isFlythrough ? "Stop" : "Tour"}
      </button>
      <button
        onClick={() => handleClick("rush-hour")}
        className={`px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${isRushHour ? activeBtnClass : btnClass}`}
      >
        {isRushHour ? "Stop" : "Rush Hour"}
      </button>
    </div>
  );
}
