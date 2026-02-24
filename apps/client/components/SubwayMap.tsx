"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

import TimeControls from "./TimeControls";
import Legend from "./Legend";
import StationPanel from "./StationPanel";
import ThemeToggle from "./ThemeToggle";

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SubwayMap() {
  // ---- Animation store ----------------------------------------------------
  const isPlaying = useAnimationStore((s) => s.isPlaying);
  const simTimeMs = useAnimationStore((s) => s.simTimeMs);
  const activeDate = useAnimationStore((s) => s.activeDate);
  const advanceTime = useAnimationStore((s) => s.advanceTime);
  const setActiveTrainCount = useAnimationStore((s) => s.setActiveTrainCount);

  // ---- Theme store --------------------------------------------------------
  const resolved = useThemeStore((s) => s.resolved);
  const daylight = useThemeStore((s) => s.daylight);
  const resolveForTime = useThemeStore((s) => s.resolveForTime);
  const isDark = resolved === "dark";

  // Twilight overlay: warm golden tint during sunrise/sunset transitions
  // Active when daylight is between 0.05 and 0.95 (i.e., during transitions)
  const isTwilight = daylight > 0.05 && daylight < 0.95;
  const twilightIntensity = isTwilight
    ? Math.sin(daylight * Math.PI) * 0.3 // peaks at 0.3 opacity when daylight=0.5
    : 0;

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
  const [viewState, setViewState] = useState<any>({...CONFIG.DEFAULT_VIEW});
  const [loading, setLoading] = useState(true);

  const rafRef = useRef<number>(0);
  const lastDateRef = useRef<string>("");

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
    // Only re-run when the hour bucket changes, not every frame
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDate, Math.floor(secondsSinceMidnight(simTimeMs) / 3600), stations]);

  // ---- Resolve theme when sim time changes (every ~minute) ----------------
  useEffect(() => {
    resolveForTime(simTimeMs);
    // Only check every simulated minute to avoid excessive updates
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

  // ---- Update active train count ------------------------------------------
  const currentTimeSec = secondsSinceMidnight(simTimeMs);
  const activeTrains = getCurrentTrains(trains, currentTimeSec);
  useEffect(() => {
    setActiveTrainCount(activeTrains.length);
  }, [activeTrains.length, setActiveTrainCount]);

  // ---- Keyboard shortcuts -------------------------------------------------
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        useAnimationStore.getState().togglePlay();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // ---- Station click handler ----------------------------------------------
  const handleClick = useCallback(
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

  // ---- Build layers -------------------------------------------------------
  const layers = [
    // 1. Ghost tracks
    new PathLayer<TrackGeometry>({
      id: "ghost-tracks",
      data: tracks,
      getPath: (d) => d.coordinates,
      getColor: (d) => [...d.color, CONFIG.TRACK_OPACITY] as [number, number, number, number],
      getWidth: CONFIG.TRACK_WIDTH_PX,
      widthUnits: "pixels" as const,
      widthMinPixels: 1,
      capRounded: true,
      jointRounded: true,
      pickable: false,
    }),

    // 2. Station glow (outer halo)
    new ScatterplotLayer<StationWithRidership>({
      id: "station-glow",
      data: stationsWithRidership,
      getPosition: (d) => [d.lng, d.lat],
      getRadius: (d) => d.glowRadius,
      getFillColor: (d) => [...getStationColor(d.lines), CONFIG.STATION_GLOW_OPACITY] as [number, number, number, number],
      radiusUnits: "meters" as const,
      pickable: true,
      onClick: handleClick,
      autoHighlight: true,
      highlightColor: [255, 255, 255, 60],
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
        return [
          Math.min(255, Math.round((c[0] / 255) * brightness + (255 - brightness))),
          Math.min(255, Math.round((c[1] / 255) * brightness + (255 - brightness))),
          Math.min(255, Math.round((c[2] / 255) * brightness + (255 - brightness))),
          CONFIG.STATION_CORE_OPACITY,
        ] as [number, number, number, number];
      },
      radiusUnits: "meters" as const,
      pickable: true,
      onClick: handleClick,
    }),

    // 4. Train worms (TripsLayer)
    new TripsLayer<ProcessedTrain>({
      id: "trains",
      data: activeTrains,
      getPath: (d) => d.path,
      getTimestamps: (d) => d.timestamps,
      getColor: (d) => [...d.color, 240] as [number, number, number, number],
      currentTime: currentTimeSec,
      trailLength: CONFIG.TRAIN_TRAIL_LENGTH,
      widthMinPixels: CONFIG.TRAIN_WIDTH_PX,
      capRounded: true,
      jointRounded: true,
      fadeTrail: true,
      pickable: false,
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
      visible: (viewState.zoom ?? 11) > CONFIG.STATION_NAME_ZOOM_THRESHOLD,
      pickable: false,
    }),
  ];

  // ---- Render -------------------------------------------------------------
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

      <DeckGL
        viewState={viewState}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onViewStateChange={({ viewState: vs }: any) => setViewState(vs)}
        controller={true}
        layers={layers}
        getCursor={() => "grab"}
      >
        <Map
          mapboxAccessToken={CONFIG.MAPBOX_TOKEN}
          mapStyle={getMapStyle(resolved)}
          projection={{ name: "mercator" }}
        />
      </DeckGL>

      <TimeControls />
      <Legend />
      <ThemeToggle />

      <StationPanel
        station={selectedStation}
        ridership={selectedRidership}
        onClose={() => setSelectedStation(null)}
      />

      {/* Title watermark */}
      <div className="fixed top-4 left-4 z-40 select-none pointer-events-none">
        <h1 className={`text-lg font-bold tracking-tight ${isDark ? "text-white/80" : "text-black/80"}`}>
          I Like Trains NYC
        </h1>
        <p className={`text-[10px] ${isDark ? "text-white/30" : "text-black/30"}`}>
          Every subway train, visualized
        </p>
      </div>
    </div>
  );
}
