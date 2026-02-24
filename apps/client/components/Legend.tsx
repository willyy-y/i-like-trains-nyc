"use client";

import { SUBWAY_COLORS } from "@/lib/subway-colors";
import { useThemeStore } from "@/lib/stores/theme-store";

interface LineGroup {
  label: string;
  lines: string[];
  color: [number, number, number];
}

const LINE_GROUPS: LineGroup[] = [
  { label: "Broadway-7th Ave", lines: ["1", "2", "3"], color: SUBWAY_COLORS["1"] },
  { label: "Lexington Ave", lines: ["4", "5", "6"], color: SUBWAY_COLORS["4"] },
  { label: "Flushing", lines: ["7"], color: SUBWAY_COLORS["7"] },
  { label: "8th Ave", lines: ["A", "C", "E"], color: SUBWAY_COLORS["A"] },
  { label: "6th Ave", lines: ["B", "D", "F", "M"], color: SUBWAY_COLORS["B"] },
  { label: "Crosstown", lines: ["G"], color: SUBWAY_COLORS["G"] },
  { label: "Nassau St", lines: ["J", "Z"], color: SUBWAY_COLORS["J"] },
  { label: "14th St", lines: ["L"], color: SUBWAY_COLORS["L"] },
  { label: "Broadway", lines: ["N", "Q", "R", "W"], color: SUBWAY_COLORS["N"] },
  { label: "Shuttles", lines: ["S"], color: SUBWAY_COLORS["S"] },
];

export default function Legend() {
  const isDark = useThemeStore((s) => s.resolved) === "dark";

  const panel = isDark
    ? "bg-black/60 backdrop-blur-xl border-white/10"
    : "bg-white/60 backdrop-blur-xl border-black/10";

  return (
    <div className={`fixed top-[220px] left-4 ${panel} rounded-xl border p-3 z-40 select-none`}>
      <div className={`text-[10px] uppercase tracking-widest mb-2 ${isDark ? "text-white/50" : "text-black/50"}`}>
        Subway Lines
      </div>
      <div className="flex flex-col gap-1">
        {LINE_GROUPS.map((group) => {
          const [r, g, b] = group.color;
          return (
            <div key={group.label} className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {group.lines.map((line) => (
                  <span
                    key={line}
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: `rgb(${r},${g},${b})` }}
                  >
                    {line}
                  </span>
                ))}
              </div>
              <span className={`text-[10px] ${isDark ? "text-white/40" : "text-black/40"}`}>{group.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
