"use client";

import { useAnimationStore } from "@/lib/stores/animation-store";

export default function TimeDisplay() {
  const simTimeMs = useAnimationStore((s) => s.simTimeMs);
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
      <div className="text-white/60 text-xs tracking-wide uppercase">
        {formatted}
      </div>
      <div className="text-white text-2xl font-bold tabular-nums">{time}</div>
    </div>
  );
}
