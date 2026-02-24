# I Like Trains NYC — Development Scratchpad

## Project Overview
Historical NYC subway time machine. Pick any date from Feb 2022 onward, hit play, and watch trains flow through the system as smooth worm-like shapes while stations pulse with ridership intensity.

**Inspiration**: bikemap.nyc (architecture), aptransit.co (colored trains), subwaynow.app (clean layout)

---

## Progress Log

### Session 1 — 2026-02-24
**Status: Phase 1 In Progress**

#### Completed
- [x] Monorepo structure created (Bun workspaces)
- [x] All dependencies installed (Next.js 15, React 19, deck.gl 9, Mapbox GL, Zustand 5, DuckDB WASM, Tailwind 4)
- [x] Core lib files written (config.ts, subway-colors.ts, types.ts)
- [x] TypeScript + PostCSS + Next.js config
- [x] Git repo initialized

#### In Progress
- [ ] Data pipeline scripts (6 files: download-gtfs, build-track-geometry, build-stations, build-train-trips, build-ridership, validate)
- [ ] Frontend components (SubwayMap, TimeControls, TimeDisplay, StationPanel, Legend)
- [ ] Services (duckdb-service, train-data-service, ridership-data-service)
- [ ] Animation store (Zustand)
- [ ] App shell (layout, page, globals.css)

#### Pending
- [ ] Run data pipeline to generate track geometry + stations
- [ ] Run data pipeline to generate train trips for sample day
- [ ] Verify map renders with tracks
- [ ] Verify train worms animate smoothly
- [ ] Deploy to Vercel

---

## Design Decisions

### Train Rendering — "Worms"
Trains render as smooth worm-like shapes flowing through the system, NOT triangles or dots.
- deck.gl TripsLayer with ~45s trail length creates the worm body
- 5px wide minimum, rounded caps and joints
- Head is bright, tail fades out
- Each worm colored by MTA line color

### Architecture
- Bun monorepo: `packages/processing` (offline pipeline) + `apps/client` (Next.js frontend)
- Data flows: GTFS/Ridership → pipeline scripts → JSON/Parquet → DuckDB WASM in-browser → deck.gl GPU layers
- Animation: requestAnimationFrame loop, Zustand store for time/speed/play state

### Tech Stack
| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 + React 19 |
| Map | deck.gl 9 + Mapbox GL (dark-v11) |
| Data | DuckDB WASM + JSON (dev) |
| State | Zustand 5 |
| Style | Tailwind 4 |
| Package | Bun |

---

## Known Issues / TODOs
- Need Mapbox token for map tiles (set NEXT_PUBLIC_MAPBOX_TOKEN)
- DuckDB service is stubbed — using JSON files for dev
- Ridership API may need pagination handling for large date ranges
- GTFS station IDs ≠ ridership station IDs — fuzzy matching needed
