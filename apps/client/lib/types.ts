export interface Station {
  id: string;
  complexId: string;
  name: string;
  lat: number;
  lng: number;
  lines: string[];
}

export interface TrackGeometry {
  routeId: string;
  routeShortName: string;
  shapeId: string;
  coordinates: [number, number][]; // [lng, lat][]
  color: [number, number, number];
}

export interface TrainTrip {
  tripId: string;
  routeShortName: string;
  directionId: number;
  waypoints: Float64Array; // interleaved [lng, lat, time, lng, lat, time, ...]
  color: [number, number, number];
}

export interface ProcessedTrain {
  tripId: string;
  routeShortName: string;
  path: [number, number][]; // [lng, lat][]
  timestamps: number[];     // seconds since midnight
  color: [number, number, number];
}

export interface RidershipEntry {
  stationComplexId: string;
  hour: number; // 0-23
  ridership: number;
  ridershipNormalized: number;
}

export interface AnimationState {
  isPlaying: boolean;
  speedup: number;
  simTimeMs: number;        // milliseconds since epoch for current simulation time
  activeDate: string;       // YYYY-MM-DD
  activeTrainCount: number;
  lastFrameTime: number;    // performance.now() of last frame
}

export interface StationWithRidership extends Station {
  ridership: number;
  ridershipNormalized: number;
  glowRadius: number;
}
