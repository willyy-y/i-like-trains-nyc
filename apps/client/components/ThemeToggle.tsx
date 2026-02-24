"use client";

import { useThemeStore, type ThemeMode } from "@/lib/stores/theme-store";

const MODES: { value: ThemeMode; label: string; icon: string }[] = [
  { value: "auto", label: "Auto", icon: "\u2600\uFE0F\u{1F319}" },
  { value: "light", label: "Light", icon: "\u2600\uFE0F" },
  { value: "dark", label: "Dark", icon: "\u{1F319}" },
];

export default function ThemeToggle() {
  const mode = useThemeStore((s) => s.mode);
  const resolved = useThemeStore((s) => s.resolved);
  const setMode = useThemeStore((s) => s.setMode);

  const isDark = resolved === "dark";

  return (
    <div
      className={`fixed top-4 right-4 z-40 flex gap-1 p-1 rounded-lg border select-none ${
        isDark
          ? "bg-black/60 backdrop-blur-xl border-white/10"
          : "bg-white/60 backdrop-blur-xl border-black/10"
      }`}
    >
      {MODES.map((m) => (
        <button
          key={m.value}
          onClick={() => setMode(m.value)}
          className={`px-2 py-1 text-xs rounded-md transition-colors cursor-pointer ${
            mode === m.value
              ? isDark
                ? "bg-white/20 text-white"
                : "bg-black/20 text-black"
              : isDark
              ? "text-white/50 hover:text-white hover:bg-white/10"
              : "text-black/50 hover:text-black hover:bg-black/10"
          }`}
          title={m.label}
        >
          {m.icon}
        </button>
      ))}
    </div>
  );
}
