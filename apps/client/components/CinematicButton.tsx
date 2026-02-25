"use client";

import { useThemeStore } from "@/lib/stores/theme-store";
import { useCameraStore } from "@/lib/stores/camera-store";

export default function CinematicButton() {
  const isDark = useThemeStore((s) => s.resolved) === "dark";
  const isTouring = useCameraStore((s) => s.isTouring);
  const startTour = useCameraStore((s) => s.startTour);
  const stopTour = useCameraStore((s) => s.stopTour);

  const btnClass = isDark
    ? "bg-white/10 hover:bg-white/20 text-white/70 border-white/10"
    : "bg-black/5 hover:bg-black/10 text-black/70 border-black/10";

  return (
    <button
      onClick={isTouring ? stopTour : startTour}
      className={`fixed bottom-4 left-32 max-sm:bottom-20 max-sm:left-28 z-40 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${btnClass}`}
    >
      {isTouring ? "Stop Tour" : "Tour"}
    </button>
  );
}
