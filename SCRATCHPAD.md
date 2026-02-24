# I Like Trains NYC — Development Scratchpad

## Project Overview
Historical NYC subway time machine. Pick any date from Feb 2022 onward, hit play, and watch trains flow through the system as smooth worm-like shapes while stations pulse with ridership intensity.

**Inspiration**: bikemap.nyc (architecture), aptransit.co (colored trains), subwaynow.app (clean layout)
**Repo**: https://github.com/willyy-y/i-like-trains-nyc

---

## Progress Log

### Session 1 — 2026-02-24
**Status: Phase 1-2 Complete (Tracks + Train Animation), Phase 3-4 Scaffolded**

#### Completed
- [x] Monorepo structure (Bun workspaces: `packages/processing` + `apps/client`)
- [x] All dependencies installed (Next.js 15, React 19, deck.gl 9, Mapbox GL, Zustand 5, DuckDB WASM, Tailwind 4)
- [x] Core lib files (config.ts, subway-colors.ts, types.ts)
- [x] TypeScript + PostCSS + Next.js config
- [x] Data pipeline: 6 scripts (download-gtfs, build-track-geometry, build-stations, build-train-trips, build-ridership, validate)
- [x] GTFS downloaded and processed: 29 routes, 496 stations, 58 track shapes, 8492 trips (for 2026-02-24)
- [x] Track geometry: 0.79MB JSON with all subway lines
- [x] Stations: 462 complexes with line assignments
- [x] Train trips: 8492 trips with ~407 waypoints each (140MB JSON for one day)
- [x] Frontend: All components written (SubwayMap, TimeControls, TimeDisplay, StationPanel, Legend)
- [x] Services: train-data-service, ridership-data-service, duckdb-service (stub)
- [x] Animation store (Zustand): play/pause, speed control, time advancement, date jumping
- [x] TypeScript compiles clean
- [x] Next.js production build succeeds
- [x] Git repo created and pushed to GitHub

- [x] Dark/light mode with sunrise/sunset auto-detection
- [x] Smooth twilight transitions (golden overlay, 3s CSS transitions, smoothstep interpolation)
- [x] ThemeToggle component (auto/light/dark selector)
- [x] All UI panels theme-aware

#### Needs Testing (requires Mapbox token)
- [ ] Verify map renders with dark basemap
- [ ] Verify ghost tracks display in correct MTA colors
- [ ] Verify train worms animate smoothly at 60fps
- [ ] Verify station glow pulses with ridership
- [ ] Verify time controls work (play/pause, speed, scrub, date jump)

#### Pending
- [ ] Run ridership pipeline (needs Socrata API access)
- [ ] Optimize: 140MB trip JSON is too large — consider splitting or compressing
- [ ] Deploy to Vercel
- [ ] Add .env.local with NEXT_PUBLIC_MAPBOX_TOKEN

---

## Design Decisions

### Train Rendering — "Worms"
Trains render as smooth worm-like shapes flowing through the system, NOT triangles or dots.
- deck.gl TripsLayer with ~45s trail length creates the worm body
- 5px wide minimum, rounded caps and joints
- Head is bright, tail fades out (fadeTrail: true)
- Each worm colored by MTA line color

### Architecture
- Bun monorepo: `packages/processing` (offline pipeline) + `apps/client` (Next.js frontend)
- Data flows: GTFS/Ridership → pipeline scripts → JSON → fetch in-browser → deck.gl GPU layers
- Animation: requestAnimationFrame loop, Zustand store for time/speed/play state
- 5 deck.gl layers stacked: ghost tracks → station glow → station core → train worms → station names

### Tech Stack
| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 + React 19 |
| Map | deck.gl 9 + Mapbox GL (dark-v11) |
| Data | JSON (dev), DuckDB WASM (planned) |
| State | Zustand 5 |
| Style | Tailwind 4 |
| Package | Bun |

---

## Data Stats
- GTFS: 1,488 stops, 29 routes, 20,304 trips, 562,597 stop_times, 149,834 shape points
- Track geometry: 58 deduplicated shapes across 27 routes
- Stations: 496 stations in 462 complexes
- Sample day trips: 8,492 active trips with avg 407 waypoints each

---

## Known Issues / TODOs
- Need Mapbox token for map tiles (set NEXT_PUBLIC_MAPBOX_TOKEN in .env.local)
- DuckDB service is stubbed — using JSON files for dev
- Trip JSON is 140MB/day — need to optimize (split into time chunks, or use parquet + DuckDB)
- Ridership API may need pagination handling for large date ranges
- GTFS station IDs ≠ ridership station IDs — fuzzy matching is set up via Fuse.js
- react-map-gl v7 doesn't have `react-map-gl/mapbox` subpath — use `react-map-gl` directly
