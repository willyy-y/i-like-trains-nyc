"use client";

import { useAnimationStore } from "@/lib/stores/animation-store";
import { useThemeStore } from "@/lib/stores/theme-store";

export default function TimeDisplay() {
  const simTimeMs = useAnimationStore((s) => s.simTimeMs);
  const isDark = useThemeStore((s) => s.resolved) === "dark";
  const d = new Date(simTimeMs);

  const formatted = d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return (
    <div className="text-center select-none">
      <div className={`text-xs tracking-wide uppercase ${isDark ? "text-white/60" : "text-black/60"}`}>
        {formatted}
      </div>
      <div className={`text-2xl font-bold tabular-nums ${isDark ? "text-white" : "text-black"}`}>{time}</div>
    </div>
  );
}
