"use client";

import { useState } from "react";
import { useThemeStore } from "@/lib/stores/theme-store";
import { useAnimationStore } from "@/lib/stores/animation-store";
import { STORY_PRESETS, type StoryPreset } from "@/lib/stories";

export default function StoriesDrawer() {
  const isDark = useThemeStore((s) => s.resolved) === "dark";
  const [open, setOpen] = useState(false);
  const [activeStory, setActiveStory] = useState<StoryPreset | null>(null);

  const panel = isDark
    ? "bg-black/60 backdrop-blur-xl border-white/10"
    : "bg-white/60 backdrop-blur-xl border-black/10";

  function playStory(story: StoryPreset) {
    const store = useAnimationStore.getState();
    store.jumpToDate(story.date);

    // Set to start time
    const d = new Date(store.simTimeMs);
    d.setHours(0, 0, 0, 0);
    store.setSimTimeMs(d.getTime() + story.startTimeSec * 1000);
    store.setSpeedup(story.speed);
    store.play();

    setActiveStory(story);
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className={`px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
          isDark
            ? "bg-white/10 hover:bg-white/20 text-white/70 border-white/10"
            : "bg-black/5 hover:bg-black/10 text-black/70 border-black/10"
        }`}
      >
        NYC Moments
      </button>

      {open && (
        <div className={`fixed bottom-14 left-4 max-sm:bottom-28 w-72 ${panel} rounded-xl border p-4 z-50`}>
          <div className={`text-[10px] uppercase tracking-widest mb-3 ${isDark ? "text-white/50" : "text-black/50"}`}>
            NYC Moments
          </div>
          <div className="flex flex-col gap-2">
            {STORY_PRESETS.map((story) => (
              <button
                key={story.id}
                onClick={() => playStory(story)}
                className={`text-left p-2.5 rounded-lg border cursor-pointer transition-all ${
                  isDark
                    ? "border-white/10 hover:bg-white/10 hover:border-white/20"
                    : "border-black/10 hover:bg-black/5 hover:border-black/20"
                }`}
              >
                <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-black"}`}>
                  {story.title}
                </div>
                <div className={`text-[11px] mt-0.5 ${isDark ? "text-white/50" : "text-black/50"}`}>
                  {story.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active story context card */}
      {activeStory && (
        <div
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 max-sm:bottom-20 z-40 px-4 py-2 rounded-xl border ${panel}`}
        >
          <div className="flex items-center gap-3">
            <div>
              <div className={`text-xs font-semibold ${isDark ? "text-white" : "text-black"}`}>
                {activeStory.title}
              </div>
              <div className={`text-[10px] ${isDark ? "text-white/50" : "text-black/50"}`}>
                {activeStory.description}
              </div>
            </div>
            <button
              onClick={() => setActiveStory(null)}
              className={`text-[10px] cursor-pointer shrink-0 ${isDark ? "text-white/40 hover:text-white" : "text-black/40 hover:text-black"}`}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </>
  );
}
