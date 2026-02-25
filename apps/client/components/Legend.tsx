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

interface LegendProps {
  selectedLines: Set<string>;
  onToggleLine: (lines: string[]) => void;
  onSelectAll: () => void;
}

export default function Legend({ selectedLines, onToggleLine, onSelectAll }: LegendProps) {
  const isDark = useThemeStore((s) => s.resolved) === "dark";

  const panel = isDark
    ? "bg-black/60 backdrop-blur-xl border-white/10"
    : "bg-white/60 backdrop-blur-xl border-black/10";

  const allSelected = selectedLines.size === 0;

  function isGroupSelected(group: LineGroup): boolean {
    if (allSelected) return true;
    return group.lines.some((l) => selectedLines.has(l));
  }

  function handleGroupClick(group: LineGroup) {
    if (allSelected) {
      // All showing + click a group → isolate just that group
      onToggleLine(group.lines);
    } else if (isGroupSelected(group)) {
      // Group is selected → remove it
      const remaining = new Set(selectedLines);
      for (const l of group.lines) remaining.delete(l);
      if (remaining.size === 0) {
        // If removing makes it empty, back to all
        onSelectAll();
      } else {
        // Convert remaining to the lines to keep
        onToggleLine([...remaining]);
      }
    } else {
      // Group not selected → add it (union)
      const merged = new Set(selectedLines);
      for (const l of group.lines) merged.add(l);
      onToggleLine([...merged]);
    }
  }

  return (
    <div className={`fixed top-[220px] left-4 max-sm:hidden ${panel} rounded-xl border p-2 z-40 select-none`}>
      {/* Select All toggle */}
      <button
        onClick={onSelectAll}
        className={`w-full text-[9px] uppercase tracking-widest mb-1.5 px-1 py-0.5 rounded cursor-pointer transition-all ${
          allSelected
            ? isDark ? "text-white/60 bg-white/10" : "text-black/60 bg-black/10"
            : isDark ? "text-white/30 hover:text-white/50" : "text-black/30 hover:text-black/50"
        }`}
      >
        All
      </button>
      <div className="flex flex-col gap-0.5">
        {LINE_GROUPS.map((group) => {
          const [r, g, b] = group.color;
          const selected = isGroupSelected(group);
          return (
            <div
              key={group.label}
              className={`flex items-center gap-1 px-1 py-0.5 rounded-lg cursor-pointer transition-all ${
                !allSelected && selected
                  ? "ring-1 ring-white/40 bg-white/10"
                  : !allSelected
                  ? "opacity-30"
                  : "hover:bg-white/5"
              }`}
              onClick={() => handleGroupClick(group)}
            >
              <div className="flex gap-0.5">
                {group.lines.map((line) => (
                  <span
                    key={line}
                    className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold text-white"
                    style={{ backgroundColor: `rgb(${r},${g},${b})` }}
                  >
                    {line}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
