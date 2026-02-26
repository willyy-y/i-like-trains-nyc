"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DeckGL } from "@deck.gl/react";
import Map from "react-map-gl";
import { PathLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import { TripsLayer } from "@deck.gl/geo-layers";
import "mapbox-gl/dist/mapbox-gl.css";

import { CONFIG } from "@/lib/config";
import { useAnimationStore } from "@/lib/stores/animation-store";
import { useThemeStore, getMapStyle } from "@/lib/stores/theme-store";
import { getSubwayColor, getStationColor } from "@/lib/subway-colors";
import type {
  Station,
  TrackGeometry,
  ProcessedTrain,
  StationWithRidership,
} from "@/lib/types";
import { loadTrainsForDate, getCurrentTrains } from "@/services/train-data-service";
import {
  loadRidershipForDate,
  getRidershipForHour,
} from "@/services/ridership-data-service";

import { canLoadMap, recordMapLoad, getRemainingLoads } from "@/lib/map-budget";
import { parseURLState, useURLStateSync } from "@/lib/use-url-state";
import TimeControls from "./TimeControls";
import Legend from "./Legend";
import StationPanel from "./StationPanel";
import ThemeToggle from "./ThemeToggle";
import ShareButton from "./ShareButton";
import LiveStatsPanel from "./LiveStatsPanel";
import CinematicButton from "./CinematicButton";
import { useCameraStore } from "@/lib/stores/camera-store";

// ---------------------------------------------------------------------------
// Types for raw JSON payloads
// ---------------------------------------------------------------------------

interface StationJSON {
  id: string;
  complexId: string;
  name: string;
  lat: number;
  lng: number;
  lines: string[];
}

interface TrackJSON {
  routeId: string;
  routeShortName: string;
  shapeId: string;
  coordinates: [number, number][];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function secondsSinceMidnight(ms: number): number {
  const d = new Date(ms);
  return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerpViewState(
  from: Record<string, number>,
  to: Record<string, number>,
  t: number
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const key of Object.keys(from)) {
    result[key] = from[key] + (to[key] - from[key]) * t;
  }
  return result;
}

// Line group definitions (shared between isolation and stats)
const LINE_GROUPS: { group: string; lines: string[] }[] = [
  { group: "123", lines: ["1", "2", "3"] },
  { group: "456", lines: ["4", "5", "6"] },
  { group: "7", lines: ["7"] },
  { group: "ACE", lines: ["A", "C", "E"] },
  { group: "BDFM", lines: ["B", "D", "F", "M"] },
  { group: "G", lines: ["G"] },
  { group: "JZ", lines: ["J", "Z"] },
  { group: "L", lines: ["L"] },
  { group: "NQRW", lines: ["N", "Q", "R", "W"] },
  { group: "S", lines: ["S"] },
];

// Build a route→group lookup
const ROUTE_TO_GROUP: Record<string, string[]> = {};
for (const g of LINE_GROUPS) {
  for (const l of g.lines) {
    ROUTE_TO_GROUP[l] = g.lines;
  }
}

// Intro camera keyframes
const INTRO_KEYFRAMES = [
  { time: 0, view: { longitude: -73.985, latitude: 40.748, zoom: 3, pitch: 0, bearing: 0 } },
  { time: 1.5, view: { longitude: -73.985, latitude: 40.748, zoom: 8, pitch: 20, bearing: -10 } },
  { time: 3.5, view: { longitude: -73.985, latitude: 40.748, zoom: 11.5, pitch: 0, bearing: 0 } },
];

const INTRO_DURATION = 3500; // ms

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SubwayMap() {
  // ---- Animation store ----------------------------------------------------
  const isPlaying = useAnimationStore((s) => s.isPlaying);
  const activeDate = useAnimationStore((s) => s.activeDate);
  const advanceTime = useAnimationStore((s) => s.advanceTime);
  const setActiveTrainCount = useAnimationStore((s) => s.setActiveTrainCount);
  const systemLoad = useAnimationStore((s) => s.systemLoad);

  // ---- Throttled sim time (updates once per sim-second, not every frame) --
  const [currentTimeSec, setCurrentTimeSec] = useState(() =>
    secondsSinceMidnight(useAnimationStore.getState().simTimeMs)
  );
  const [simTimeMs, setSimTimeMsLocal] = useState(() =>
    useAnimationStore.getState().simTimeMs
  );
  const lastSecRef = useRef(currentTimeSec);

  // Sync local time state from store at ~integer-second boundaries
  useEffect(() => {
    if (!isPlaying) {
      // When paused, subscribe to store changes directly
      const unsub = useAnimationStore.subscribe((state) => {
        const sec = secondsSinceMidnight(state.simTimeMs);
        if (sec !== lastSecRef.current) {
          lastSecRef.current = sec;
          setCurrentTimeSec(sec);
          setSimTimeMsLocal(state.simTimeMs);
        }
      });
      return unsub;
    }

    // When playing, poll from rAF instead of subscribing to every store update
    let raf = 0;
    function poll() {
      const state = useAnimationStore.getState();
      const sec = secondsSinceMidnight(state.simTimeMs);
      if (sec !== lastSecRef.current) {
        lastSecRef.current = sec;
        setCurrentTimeSec(sec);
        setSimTimeMsLocal(state.simTimeMs);
      }
      raf = requestAnimationFrame(poll);
    }
    raf = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying]);

  // ---- Theme store --------------------------------------------------------
  const resolved = useThemeStore((s) => s.resolved);
  const daylight = useThemeStore((s) => s.daylight);
  const resolveForTime = useThemeStore((s) => s.resolveForTime);
  const isDark = resolved === "dark";

  // ---- Camera store (flythrough tour) -------------------------------------
  const isTouring = useCameraStore((s) => s.isTouring);
  const cameraGetViewState = useCameraStore((s) => s.getViewState);
  const cameraTick = useCameraStore((s) => s.tick);
  const isBreathingEnabled = useCameraStore((s) => s.isBreathingEnabled);
  const isDynamicStations = useCameraStore((s) => s.isDynamicStations);

  // Twilight overlay: warm golden tint during sunrise/sunset transitions
  const isTwilight = daylight > 0.05 && daylight < 0.95;
  const twilightIntensity = isTwilight
    ? Math.sin(daylight * Math.PI) * 0.3
    : 0;

  // ---- Map budget check ----------------------------------------------------
  const [budgetOk, setBudgetOk] = useState(true);
  const [remaining, setRemaining] = useState(45000);

  useEffect(() => {
    if (!canLoadMap()) {
      setBudgetOk(false);
      setRemaining(0);
      return;
    }
    recordMapLoad();
    setRemaining(getRemainingLoads());
  }, []);

  // ---- Local state --------------------------------------------------------
  const [tracks, setTracks] = useState<TrackGeometry[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [stationsWithRidership, setStationsWithRidership] = useState<
    StationWithRidership[]
  >([]);
  const [trains, setTrains] = useState<ProcessedTrain[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [selectedRidership, setSelectedRidership] = useState<
    number | undefined
  >(undefined);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [viewState, setViewState] = useState<any>({
    ...INTRO_KEYFRAMES[0].view, // Start at the intro zoom-out position
  });
  const [loading, setLoading] = useState(true);

  // ---- Intro state machine ------------------------------------------------
  const [introPhase, setIntroPhase] = useState<"zoom" | "reveal" | "done">("zoom");
  const introStartRef = useRef<number>(0);
  const introRafRef = useRef<number>(0);

  // ---- Line isolation state (multi-select) --------------------------------
  const [selectedLines, setSelectedLines] = useState<Set<string>>(new Set());

  // Serialized key for updateTriggers (stable string from Set)
  const selectedLinesKey = useMemo(
    () => [...selectedLines].sort().join(","),
    [selectedLines]
  );

  // ---- Train following state (Step 5c) ------------------------------------
  const [followedTrain, setFollowedTrain] = useState<ProcessedTrain | null>(null);

  const rafRef = useRef<number>(0);
  const lastDateRef = useRef<string>("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deckRef = useRef<any>(null);

  // ---- URL state restoration on mount -------------------------------------
  useEffect(() => {
    const urlState = parseURLState();
    if (urlState.date) {
      useAnimationStore.getState().jumpToDate(urlState.date);
    }
    if (urlState.t !== undefined) {
      const store = useAnimationStore.getState();
      const d = new Date(store.simTimeMs);
      d.setHours(0, 0, 0, 0);
      useAnimationStore.getState().setSimTimeMs(d.getTime() + urlState.t * 1000);
    }
    if (urlState.speed) {
      useAnimationStore.getState().setSpeedup(urlState.speed);
    }
    if (urlState.lines && urlState.lines.length > 0) {
      setSelectedLines(new Set(urlState.lines));
    }
    if (urlState.lat && urlState.lng && urlState.z) {
      setViewState((prev: Record<string, number>) => ({
        ...prev,
        latitude: urlState.lat,
        longitude: urlState.lng,
        zoom: urlState.z,
      }));
      // Skip intro zoom if URL state is present
      setIntroPhase("reveal");
    }
  }, []);

  // ---- URL state sync (debounced) -----------------------------------------
  useURLStateSync(viewState, selectedLines);

  // ---- Load static data (tracks + stations) once --------------------------
  useEffect(() => {
    async function loadStatic() {
      try {
        const [trackRes, stationRes] = await Promise.all([
          fetch("/track-geometry.json"),
          fetch("/stations.json"),
        ]);

        if (trackRes.ok) {
          const raw: TrackJSON[] = await trackRes.json();
          setTracks(
            raw.map((t) => ({
              ...t,
              color: getSubwayColor(t.routeShortName),
            }))
          );
        }

        if (stationRes.ok) {
          const raw: StationJSON[] = await stationRes.json();
          setStations(raw);
        }
      } catch (err) {
        console.error("Failed to load static data", err);
      } finally {
        setLoading(false);
      }
    }
    loadStatic();
  }, []);

  // ---- Cinematic intro zoom -----------------------------------------------
  // Uses a ref to accumulate view state and only triggers React setState
  // at ~30fps to avoid jank from layer re-creation every frame.
  const viewStateRef = useRef(viewState);
  const introSyncRef = useRef<number>(0);

  useEffect(() => {
    if (loading || introPhase !== "zoom") return;

    introStartRef.current = performance.now();
    let lastSync = 0;
    const SYNC_INTERVAL = 33; // ~30fps React updates

    function introTick(now: number) {
      const elapsed = now - introStartRef.current;
      const progress = Math.min(elapsed / INTRO_DURATION, 1);

      const totalDuration = INTRO_KEYFRAMES[INTRO_KEYFRAMES.length - 1].time;
      const currentTime = progress * totalDuration;

      let fromIdx = 0;
      for (let i = 0; i < INTRO_KEYFRAMES.length - 1; i++) {
        if (currentTime >= INTRO_KEYFRAMES[i].time) fromIdx = i;
      }
      const toIdx = Math.min(fromIdx + 1, INTRO_KEYFRAMES.length - 1);

      const segStart = INTRO_KEYFRAMES[fromIdx].time;
      const segEnd = INTRO_KEYFRAMES[toIdx].time;
      const segProgress = segEnd > segStart
        ? easeInOutCubic((currentTime - segStart) / (segEnd - segStart))
        : 1;

      const interpolated = lerpViewState(
        INTRO_KEYFRAMES[fromIdx].view,
        INTRO_KEYFRAMES[toIdx].view,
        segProgress
      );

      viewStateRef.current = interpolated;

      // Throttle React state updates to reduce layer re-creation
      if (now - lastSync > SYNC_INTERVAL || progress >= 1) {
        lastSync = now;
        setViewState(interpolated);
      }

      if (progress < 1) {
        introRafRef.current = requestAnimationFrame(introTick);
      } else {
        setIntroPhase("reveal");
      }
    }

    introRafRef.current = requestAnimationFrame(introTick);
    return () => cancelAnimationFrame(introRafRef.current);
  }, [loading, introPhase]);

  // ---- After reveal, auto-play --------------------------------------------
  useEffect(() => {
    if (introPhase !== "reveal") return;

    // Let UI stagger in over 1s, then mark intro done and start playback
    const timer = setTimeout(() => {
      setIntroPhase("done");
      useAnimationStore.getState().play();
    }, 1200);

    return () => clearTimeout(timer);
  }, [introPhase]);

  // ---- Load trains when activeDate changes --------------------------------
  useEffect(() => {
    if (activeDate === lastDateRef.current) return;
    lastDateRef.current = activeDate;

    loadTrainsForDate(activeDate).then((data) => {
      setTrains(data);
    });
  }, [activeDate]);

  // ---- Load ridership for the current hour --------------------------------
  useEffect(() => {
    const hour = new Date(simTimeMs).getHours();

    loadRidershipForDate(activeDate).then((entries) => {
      const hourMap = getRidershipForHour(entries, hour);
      setStationsWithRidership(
        stations.map((s) => {
          const r = hourMap.get(s.complexId);
          const ridership = r?.ridership ?? 0;
          const ridershipNormalized = r?.ridershipNormalized ?? 0;
          const glowRadius =
            CONFIG.STATION_GLOW_RADIUS_MIN +
            ridershipNormalized *
              (CONFIG.STATION_GLOW_RADIUS_MAX - CONFIG.STATION_GLOW_RADIUS_MIN);
          return { ...s, ridership, ridershipNormalized, glowRadius };
        })
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDate, Math.floor(secondsSinceMidnight(simTimeMs) / 3600), stations]);

  // ---- Resolve theme when sim time changes (every ~minute) ----------------
  useEffect(() => {
    resolveForTime(simTimeMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.floor(secondsSinceMidnight(simTimeMs) / 60), resolveForTime]);

  // ---- Animation loop -----------------------------------------------------
  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    let lastTs = performance.now();

    function tick(now: number) {
      const delta = now - lastTs;
      lastTs = now;
      advanceTime(delta);
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, advanceTime]);

  // ---- Flythrough tour animation ------------------------------------------
  // Throttled to ~30fps React updates to avoid jank from layer re-creation.
  useEffect(() => {
    if (!isTouring) return;
    let lastTs = performance.now();
    let lastSync = 0;
    const SYNC_INTERVAL = 33; // ~30fps React updates

    function tourTick(now: number) {
      const delta = (now - lastTs) / 1000;
      lastTs = now;
      cameraTick(delta);
      const vs = useCameraStore.getState().getViewState();
      if (vs) {
        viewStateRef.current = vs;
        if (now - lastSync > SYNC_INTERVAL) {
          lastSync = now;
          setViewState(vs);
        }
      }
      if (useCameraStore.getState().isTouring) {
        requestAnimationFrame(tourTick);
      } else {
        // Tour ended — sync final position
        if (vs) setViewState(vs);
      }
    }

    const raf = requestAnimationFrame(tourTick);
    return () => cancelAnimationFrame(raf);
  }, [isTouring, cameraTick]);

  // ---- Memoize activeTrains (1a) ------------------------------------------
  const activeTrains = useMemo(
    () => getCurrentTrains(trains, currentTimeSec),
    [trains, currentTimeSec]
  );

  useEffect(() => {
    setActiveTrainCount(activeTrains.length);
  }, [activeTrains.length, setActiveTrainCount]);

  // ---- Follow train: update camera to track followed train ----------------
  useEffect(() => {
    if (!followedTrain) return;

    const t = followedTrain;
    const ts = t.timestamps;
    if (ts.length < 2) return;

    // Binary search for current position
    let lo = 0;
    let hi = ts.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (ts[mid] <= currentTimeSec) lo = mid;
      else hi = mid;
    }

    // Lerp between bracketing points
    const segLen = ts[hi] - ts[lo];
    const frac = segLen > 0 ? (currentTimeSec - ts[lo]) / segLen : 0;
    const clampedFrac = Math.max(0, Math.min(1, frac));

    const lng = t.path[lo][0] + clampedFrac * (t.path[hi][0] - t.path[lo][0]);
    const lat = t.path[lo][1] + clampedFrac * (t.path[hi][1] - t.path[lo][1]);

    // If train has ended, release follow
    if (currentTimeSec > ts[ts.length - 1] + 30) {
      setFollowedTrain(null);
      return;
    }

    setViewState((prev: Record<string, number>) => ({
      ...prev,
      longitude: lng,
      latitude: lat,
      zoom: Math.max(prev.zoom ?? 11.5, 14),
      transitionDuration: 300,
    }));
  }, [followedTrain, currentTimeSec]);

  // ---- Keyboard shortcuts -------------------------------------------------
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        useAnimationStore.getState().togglePlay();
      }
      if (e.code === "Escape") {
        setSelectedLines(new Set());
        setFollowedTrain(null);
        setSelectedStation(null);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // ---- Station click handler ----------------------------------------------
  const handleStationClick = useCallback(
    (info: { object?: unknown }) => {
      const obj = info.object as StationWithRidership | undefined;
      if (obj && "complexId" in obj) {
        setSelectedStation(obj);
        setSelectedRidership(obj.ridership);
      } else {
        setSelectedStation(null);
      }
    },
    []
  );

  // ---- Train click handler (follow a train) --------------------------------
  const handleTrainClick = useCallback(
    (info: { object?: unknown }) => {
      const obj = info.object as ProcessedTrain | undefined;
      if (obj && "tripId" in obj) {
        setFollowedTrain(obj);
      }
    },
    []
  );

  // ---- Map background click (deselect) ------------------------------------
  const handleMapClick = useCallback(() => {
    // Only clear if clicking the map background (not a picked object)
    if (followedTrain) setFollowedTrain(null);
  }, [followedTrain]);

  // ---- Line isolation helpers (multi-select) ------------------------------
  const allSelected = selectedLines.size === 0;

  const lineAlpha = useCallback(
    (route: string): number => {
      if (allSelected) return 255;
      if (selectedLines.has(route)) return 255;
      return 20; // 8% opacity
    },
    [allSelected, selectedLines]
  );

  const stationMatchesLine = useCallback(
    (stationLines: string[]): boolean => {
      if (allSelected) return true;
      return stationLines.some((l) => selectedLines.has(l));
    },
    [allSelected, selectedLines]
  );

  // ---- Legend handlers ----------------------------------------------------
  const handleToggleLine = useCallback((lines: string[]) => {
    setSelectedLines(new Set(lines));
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedLines(new Set());
  }, []);

  // ---- Accumulate total distance traveled across all trains (resets on refresh)
  const distanceRef = useRef(0);
  const prevTimeSecRef = useRef(currentTimeSec);

  useMemo(() => {
    const prevSec = prevTimeSecRef.current;
    const dtSec = currentTimeSec - prevSec;
    prevTimeSecRef.current = currentTimeSec;

    // Only accumulate for reasonable forward steps (skip jumps/rewinds)
    if (dtSec <= 0 || dtSec > 10) return distanceRef.current;

    for (const train of activeTrains) {
      const ts = train.timestamps;
      const path = train.path;
      if (ts.length < 2) continue;

      // Find current segment
      let lo = 0;
      let hi = ts.length - 1;
      while (lo < hi - 1) {
        const mid = (lo + hi) >> 1;
        if (ts[mid] <= currentTimeSec) lo = mid;
        else hi = mid;
      }

      const segDt = ts[hi] - ts[lo];
      if (segDt <= 0) continue;

      const lat1 = path[lo][1] * Math.PI / 180;
      const lat2 = path[hi][1] * Math.PI / 180;
      const dLat = lat2 - lat1;
      const dLng = (path[hi][0] - path[lo][0]) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
      const segDistMiles = 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      const speedMph = (segDistMiles / segDt) * 3600;
      if (speedMph > 120) continue; // skip bad data

      // Distance this train traveled in dtSec
      distanceRef.current += (segDistMiles / segDt) * dtSec;
    }
    return distanceRef.current;
  }, [activeTrains, currentTimeSec]);

  const totalDistanceMiles = Math.round(distanceRef.current);

  // ---- Memoize layers (1b) -----------------------------------------------
  const zoomLevel = viewState.zoom ?? 11;
  const layers = useMemo(
    () => [
      // 1. Ghost tracks
      new PathLayer<TrackGeometry>({
        id: "ghost-tracks",
        data: tracks,
        getPath: (d) => d.coordinates,
        getColor: (d) => [...d.color, !allSelected ? lineAlpha(d.routeShortName) * (CONFIG.TRACK_OPACITY / 255) : CONFIG.TRACK_OPACITY] as [number, number, number, number],
        getWidth: CONFIG.TRACK_WIDTH_PX,
        widthUnits: "pixels" as const,
        widthMinPixels: 1,
        capRounded: true,
        jointRounded: true,
        pickable: false,
        updateTriggers: { getColor: [selectedLinesKey] },
      }),

      // 2. Station glow (outer halo) — uniform in default mode, ridership-based in rush hour
      new ScatterplotLayer<StationWithRidership>({
        id: "station-glow",
        data: stationsWithRidership,
        getPosition: (d) => [d.lng, d.lat],
        getRadius: (d) => isDynamicStations ? d.glowRadius : CONFIG.STATION_GLOW_RADIUS,
        getFillColor: (d) => {
          const match = stationMatchesLine(d.lines);
          let alpha = match ? CONFIG.STATION_GLOW_OPACITY : 5;
          if (isBreathingEnabled) {
            alpha = Math.round(alpha * (0.3 + 0.7 * systemLoad));
          }
          return [...getStationColor(d.lines), alpha] as [number, number, number, number];
        },
        radiusUnits: "meters" as const,
        radiusMaxPixels: isDynamicStations ? undefined : CONFIG.STATION_GLOW_MAX_PIXELS,
        pickable: true,
        onClick: handleStationClick,
        autoHighlight: true,
        highlightColor: [255, 255, 255, 60],
        updateTriggers: { getFillColor: [selectedLinesKey, isBreathingEnabled, systemLoad], getRadius: [isDynamicStations] },
      }),

      // 3. Station core (inner dot)
      new ScatterplotLayer<StationWithRidership>({
        id: "station-core",
        data: stationsWithRidership,
        getPosition: (d) => [d.lng, d.lat],
        getRadius: CONFIG.STATION_CORE_RADIUS,
        getFillColor: (d) => {
          const c = getStationColor(d.lines);
          const brightness = 120 + Math.round(d.ridershipNormalized * 135);
          const match = stationMatchesLine(d.lines);
          const alpha = match ? CONFIG.STATION_CORE_OPACITY : 15;
          return [
            Math.min(255, Math.round((c[0] / 255) * brightness + (255 - brightness))),
            Math.min(255, Math.round((c[1] / 255) * brightness + (255 - brightness))),
            Math.min(255, Math.round((c[2] / 255) * brightness + (255 - brightness))),
            alpha,
          ] as [number, number, number, number];
        },
        radiusUnits: "meters" as const,
        radiusMaxPixels: CONFIG.STATION_CORE_MAX_PIXELS,
        pickable: true,
        onClick: handleStationClick,
        updateTriggers: { getFillColor: [selectedLinesKey] },
      }),

      // 4. Train worms (TripsLayer)
      new TripsLayer<ProcessedTrain>({
        id: "trains",
        data: activeTrains,
        getPath: (d) => d.path,
        getTimestamps: (d) => d.timestamps,
        getColor: (d) => {
          const alpha = !allSelected ? lineAlpha(d.routeShortName) : 240;
          return [...d.color, alpha] as [number, number, number, number];
        },
        currentTime: currentTimeSec,
        trailLength: CONFIG.TRAIN_TRAIL_LENGTH,
        widthMinPixels: CONFIG.TRAIN_WIDTH_PX,
        capRounded: true,
        jointRounded: true,
        fadeTrail: true,
        pickable: true,
        onClick: handleTrainClick,
        updateTriggers: { getColor: [selectedLinesKey] },
      }),

      // 5. Station names (visible at high zoom)
      new TextLayer<StationWithRidership>({
        id: "station-names",
        data: stationsWithRidership,
        getPosition: (d) => [d.lng, d.lat],
        getText: (d) => d.name,
        getSize: 12,
        getColor: isDark ? [255, 255, 255, 200] : [30, 30, 30, 220],
        getTextAnchor: "start" as const,
        getAlignmentBaseline: "center" as const,
        getPixelOffset: [10, 0],
        fontFamily: "Inter, system-ui, sans-serif",
        visible: zoomLevel > CONFIG.STATION_NAME_ZOOM_THRESHOLD,
        pickable: false,
      }),

      // 6. Selected station name label (always visible when selected)
      new TextLayer<Station>({
        id: "selected-station-name",
        data: selectedStation ? [selectedStation] : [],
        getPosition: (d) => [d.lng, d.lat],
        getText: (d) => d.name,
        getSize: 14,
        getColor: isDark ? [255, 255, 255, 240] : [20, 20, 20, 240],
        getTextAnchor: "middle" as const,
        getAlignmentBaseline: "bottom" as const,
        getPixelOffset: [0, -20],
        fontFamily: "Inter, system-ui, sans-serif",
        fontWeight: 700,
        outlineWidth: 2,
        outlineColor: isDark ? [0, 0, 0, 200] : [255, 255, 255, 200],
        visible: true,
        pickable: false,
      }),
    ],
    [
      tracks,
      stationsWithRidership,
      activeTrains,
      currentTimeSec,
      daylight,
      isDark,
      selectedLinesKey,
      allSelected,
      zoomLevel,
      lineAlpha,
      stationMatchesLine,
      handleStationClick,
      handleTrainClick,
      selectedStation,
      isBreathingEnabled,
      isDynamicStations,
      systemLoad,
    ]
  );

  // ---- Render -------------------------------------------------------------

  // Budget exceeded — block map entirely
  if (!budgetOk) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-black text-white">
        <h1 className="text-2xl font-bold mb-4">Monthly Map Limit Reached</h1>
        <p className="text-white/60 text-sm max-w-md text-center">
          To stay within the Mapbox free tier (50,000 loads/month), map loading
          has been paused. The counter resets on the 1st of next month.
        </p>
        <p className="text-white/30 text-xs mt-4">
          Used: {45000 - remaining} / 45,000 (hard cap with 5K safety buffer)
        </p>
      </div>
    );
  }

  const uiVisible = introPhase === "reveal" || introPhase === "done";

  return (
    <div
      className={`w-screen h-screen relative transition-colors duration-[3000ms] ${isDark ? "bg-black" : "bg-gray-100"}`}
    >
      {loading && (
        <div className={`absolute inset-0 z-50 flex items-center justify-center transition-colors duration-[3000ms] ${isDark ? "bg-black" : "bg-gray-100"}`}>
          <div className={`text-sm ${isDark ? "text-white/60" : "text-black/60"}`}>Loading map data...</div>
        </div>
      )}

      {/* Twilight overlay — warm golden tint during sunrise/sunset */}
      {twilightIntensity > 0 && (
        <div
          className="absolute inset-0 z-10 pointer-events-none transition-opacity duration-1000"
          style={{
            background: `radial-gradient(ellipse at 50% 100%, rgba(255, 140, 50, ${twilightIntensity}), rgba(255, 80, 30, ${twilightIntensity * 0.5}) 50%, transparent 80%)`,
          }}
        />
      )}

      {/* Activity vignette — deep navy at night, warm amber during peak */}
      {isDark && (
        <div
          className="absolute inset-0 z-10 pointer-events-none transition-opacity duration-[2000ms]"
          style={{
            opacity: 0.15 + 0.1 * (1 - systemLoad),
            background: systemLoad > 0.5
              ? `radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(180, 100, 30, ${0.15 * systemLoad}) 100%)`
              : `radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(10, 15, 40, ${0.25 * (1 - systemLoad)}) 100%)`,
          }}
        />
      )}

      <DeckGL
        ref={deckRef}
        viewState={viewState}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onViewStateChange={({ viewState: vs }: any) => {
          if (introPhase === "zoom") return; // lock camera during intro
          setViewState(vs);
        }}
        controller={introPhase !== "zoom"}
        layers={layers}
        getCursor={() => "grab"}
        onClick={(info) => {
          if (!info.object) handleMapClick();
        }}
      >
        <Map
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""}
          mapStyle={getMapStyle(resolved)}
          projection={{ name: "mercator" }}
        />
      </DeckGL>

      {/* Staggered UI reveal */}
      <div
        className={`fixed top-4 left-4 z-40 select-none pointer-events-none transition-all duration-[800ms] ${
          uiVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
        }`}
        style={{ transitionDelay: "0ms" }}
      >
        <h1 className={`text-lg font-bold tracking-tight ${isDark ? "text-white/80" : "text-black/80"}`}>
          I Like Trains NYC
        </h1>
        <p className={`text-[10px] ${isDark ? "text-white/30" : "text-black/30"}`}
           style={{ transitionDelay: "200ms" }}
        >
          Every subway train, visualized
        </p>
      </div>

      <div
        className={`transition-all duration-[600ms] ${
          uiVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
        }`}
        style={{ transitionDelay: "400ms" }}
      >
        <TimeControls />
      </div>

      <div
        className={`transition-all duration-[600ms] ${
          uiVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
        }`}
        style={{ transitionDelay: "600ms" }}
      >
        <Legend
          selectedLines={selectedLines}
          onToggleLine={handleToggleLine}
          onSelectAll={handleSelectAll}
        />
      </div>

      <div
        className={`transition-all duration-[600ms] ${
          uiVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
        }`}
        style={{ transitionDelay: "800ms" }}
      >
        <ThemeToggle />
      </div>

      <div
        className={`fixed bottom-4 left-4 max-sm:bottom-20 z-40 flex gap-2 items-end transition-all duration-[600ms] ${
          uiVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
        style={{ transitionDelay: "900ms" }}
      >
        <LiveStatsPanel
          totalDistanceMiles={totalDistanceMiles}
        />
        <CinematicButton />
      </div>

      <StationPanel
        station={selectedStation}
        ridership={selectedRidership}
        ridershipEntries={stationsWithRidership}
        onClose={() => setSelectedStation(null)}
      />

      <div
        className={`transition-all duration-[600ms] ${
          uiVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
        style={{ transitionDelay: "800ms" }}
      >
        <ShareButton deckRef={deckRef} />
      </div>

      {/* Followed train tooltip */}
      {followedTrain && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl border text-sm ${
          isDark ? "bg-black/80 backdrop-blur-xl border-white/10 text-white" : "bg-white/80 backdrop-blur-xl border-black/10 text-black"
        }`}>
          <span className="font-bold" style={{ color: `rgb(${followedTrain.color.join(",")})` }}>
            {followedTrain.routeShortName}
          </span>
          {" "}train
          <button
            onClick={() => setFollowedTrain(null)}
            className={`ml-3 text-xs cursor-pointer ${isDark ? "text-white/50 hover:text-white" : "text-black/50 hover:text-black"}`}
          >
            Release
          </button>
        </div>
      )}
    </div>
  );
}
