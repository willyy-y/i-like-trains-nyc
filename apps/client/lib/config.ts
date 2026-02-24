export const CONFIG = {
  // Mapbox
  MAPBOX_STYLE_DARK: "mapbox://styles/mapbox/dark-v11",
  MAPBOX_STYLE_LIGHT: "mapbox://styles/mapbox/light-v11",
  MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "",

  // NYC sunrise/sunset approximate times (hours, varies by season)
  // Used for auto theme switching
  NYC_LAT: 40.7128,
  NYC_LNG: -74.006,

  // NYC center
  DEFAULT_VIEW: {
    longitude: -73.985,
    latitude: 40.748,
    zoom: 11.5,
    pitch: 0,
    bearing: 0,
  },

  // Animation
  DEFAULT_SPEED: 60, // 1 minute per second
  SPEED_PRESETS: [1, 10, 60, 120, 180, 300, 3600] as const,
  SPEED_LABELS: ["1x", "10x", "1min/s", "2min/s", "3min/s", "5min/s", "1hr/s"] as const,
  MAX_FRAME_DELTA_MS: 100, // Cap to prevent jumps on tab switch

  // Train rendering
  TRAIN_TRAIL_LENGTH: 45, // seconds of trail behind train
  TRAIN_WIDTH_PX: 5,
  TRAIN_WORM_SEGMENTS: 8, // number of segments in the worm body

  // Station rendering
  STATION_CORE_RADIUS: 40, // meters
  STATION_GLOW_RADIUS_MIN: 60,
  STATION_GLOW_RADIUS_MAX: 400,
  STATION_GLOW_OPACITY: 35,
  STATION_CORE_OPACITY: 200,
  STATION_NAME_ZOOM_THRESHOLD: 14,

  // Track rendering
  TRACK_WIDTH_PX: 1.5,
  TRACK_OPACITY: 60,

  // Data
  DATA_BASE_URL: "/data", // local dev; swap to CDN for prod
  BATCH_DURATION_MINUTES: 30,
  PREFETCH_THRESHOLD_MINUTES: 5,

  // Time range
  DATA_START_DATE: "2022-02-01",
  DATA_END_DATE: "2024-12-31",
} as const;
