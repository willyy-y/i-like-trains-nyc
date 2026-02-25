"use client";

import { useCallback, useState } from "react";
import { useThemeStore } from "@/lib/stores/theme-store";
import { useAnimationStore } from "@/lib/stores/animation-store";

interface ShareButtonProps {
  deckRef: React.RefObject<DeckGL | null>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DeckGL = any;

export default function ShareButton({ deckRef }: ShareButtonProps) {
  const isDark = useThemeStore((s) => s.resolved) === "dark";
  const [copied, setCopied] = useState(false);

  const handleScreenshot = useCallback(async () => {
    try {
      // Get the deck.gl canvas
      const canvas = document.querySelector("canvas");
      if (!canvas) return;

      // Create a composite canvas with watermark
      const composite = document.createElement("canvas");
      composite.width = canvas.width;
      composite.height = canvas.height;
      const ctx = composite.getContext("2d");
      if (!ctx) return;

      // Draw the map
      ctx.drawImage(canvas, 0, 0);

      // Add semi-transparent overlay at bottom
      const store = useAnimationStore.getState();
      const d = new Date(store.simTimeMs);
      const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
      const dateStr = store.activeDate;

      // Watermark text
      const scale = window.devicePixelRatio || 1;
      ctx.font = `bold ${14 * scale}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.textAlign = "right";
      ctx.fillText("iliketrainsnyc.com", composite.width - 16 * scale, composite.height - 16 * scale);

      // Date + time + train count in bottom-left
      ctx.textAlign = "left";
      ctx.font = `${12 * scale}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillText(
        `${dateStr} ${timeStr} | ${store.activeTrainCount} trains`,
        16 * scale,
        composite.height - 16 * scale
      );

      // Convert to blob and trigger download or share
      composite.toBlob(async (blob) => {
        if (!blob) return;

        // Try Web Share API on mobile
        if (typeof navigator.share === "function" && typeof navigator.canShare === "function") {
          const file = new File([blob], "subway-map.png", { type: "image/png" });
          try {
            await navigator.share({
              files: [file],
              title: "I Like Trains NYC",
              text: "Watch NYC's subway system breathe",
            });
            return;
          } catch {
            // Fall through to download
          }
        }

        // Fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `subway-${dateStr}-${timeStr.replace(/[: ]/g, "")}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    } catch (err) {
      console.error("Screenshot failed", err);
    }
  }, []);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  }, []);

  const btnClass = isDark
    ? "bg-white/10 hover:bg-white/20 text-white/70 border-white/10"
    : "bg-black/5 hover:bg-black/10 text-black/70 border-black/10";

  return (
    <div className="fixed bottom-4 right-4 z-40 flex gap-2">
      <button
        onClick={handleCopyLink}
        className={`px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${btnClass}`}
        title="Copy link to current view"
      >
        {copied ? "Copied!" : "Share Link"}
      </button>
      <button
        onClick={handleScreenshot}
        className={`px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${btnClass}`}
        title="Save screenshot"
      >
        Screenshot
      </button>
    </div>
  );
}
