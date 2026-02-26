# Multi-City Expansion Plan

## 1. Japan Rail GTFS Sources

| Source | Coverage | Format | Notes |
|--------|----------|--------|-------|
| [ODPT API](https://api.odpt.org) | Tokyo Metro, Toei, JR East, private railways | GTFS-realtime + static | Requires API key registration |
| Tokyo Metro Open Data | Tokyo Metro 9 lines | GTFS static + realtime | Free tier available |
| Toei (Tokyo Metropolitan Bureau) | Toei Subway 4 lines, Toden, Nippori-Toneri | GTFS static | Via ODPT |
| JR East | Yamanote, Chuo, Sobu, etc. | Custom API → GTFS conversion needed | Most complex; partial GTFS via Transitland |
| [Transitland](https://transit.land) | Aggregated Japanese feeds | GTFS static | Good starting point for static schedules |

**Recommended approach**: Start with ODPT API for Tokyo Metro + Toei (well-structured GTFS), add JR Yamanote via Transitland static data.

## 2. Multi-City Architecture

### Config-per-city pattern

```
cities/
  nyc.ts      — coordinates, colors, GTFS URLs, ridership API
  tokyo.ts    — coordinates, colors, GTFS URLs, ridership source
  index.ts    — city registry + auto-detect or URL param
```

Each city config exports:
```ts
interface CityConfig {
  id: string;
  name: string;
  center: { lat: number; lng: number };
  defaultZoom: number;
  gtfsUrl: string;
  ridershipSource?: string;
  subwayColors: Record<string, [number, number, number]>;
  mapStyle?: string;
  timezone: string;
}
```

### Processing pipeline

Parameterize the `packages/processing` pipeline with a `--city` flag:

```bash
bun run process --city tokyo
bun run process --city nyc    # default
```

The pipeline steps (download GTFS → parse stops → build trips → generate batches) are generic. City-specific parts:
- GTFS feed URL
- Color mapping
- Stop filtering (e.g., subway-only vs all rail)
- Coordinate bounds for clipping

### Client routing

```
/          → NYC (default)
/tokyo     → Tokyo
?city=tokyo → alternative
```

## 3. NYC-Specific vs Generic

| Component | NYC-Specific | Generic/Reusable |
|-----------|-------------|-----------------|
| `subway-colors.ts` | Line colors (A=blue, 7=purple, etc.) | Color lookup pattern |
| `config.ts` center coords | NYC coordinates | Config structure |
| GTFS URL | MTA static feed | Configurable per city |
| Ridership API | MTA ridership CSV | Interface (can be swapped) |
| `animation-store.ts` | - | Fully reusable |
| `camera-store.ts` | Tour keyframes are NYC-specific | Tour system is reusable |
| `SubwayMap.tsx` | - | Fully reusable (reads from config) |
| `train-data-service.ts` | - | Fully reusable |
| Batch processing | - | Fully reusable |
| Types (`ProcessedTrain`, etc.) | - | Fully reusable |
| DeckGL layers | - | Fully reusable |

**Estimated split**: ~80% reusable, ~20% city-specific configuration.

## 4. Scope for Tokyo v1

### Phase 1: Tokyo Metro + Yamanote (minimum viable)
- **Tokyo Metro**: 9 lines, 180 stations — well-structured GTFS from ODPT
- **JR Yamanote**: Iconic loop line, 30 stations — via Transitland static
- **Total**: ~210 stations, ~10 lines
- Skip: Private railways (Tokyu, Odakyu, Keio, etc.), Shinkansen, buses

### Phase 2: Full Tokyo rail
- Add Toei Subway (4 lines)
- Add major JR lines (Chuo, Sobu, Keihin-Tohoku)
- Add select private railways

### Phase 3: Shinkansen
- Tokaido Shinkansen (Tokyo → Osaka)
- Tohoku Shinkansen (Tokyo → Sendai/Morioka)
- Requires wider map bounds, different zoom levels
- Different visualization style (longer trails, fewer stops)

## 5. Estimated Effort

| Task | Effort |
|------|--------|
| City config abstraction | 2-3 days |
| Processing pipeline `--city` flag | 2-3 days |
| Tokyo Metro GTFS integration | 3-4 days |
| Tokyo color scheme + map styling | 1-2 days |
| Yamanote line addition | 1-2 days |
| Tokyo-specific camera tours | 1 day |
| Testing + polish | 2-3 days |
| **Total for Tokyo v1** | **~2-3 weeks** |

### Key risks
- ODPT API rate limits / registration delays
- JR East GTFS quality (may need manual corrections)
- Time zone handling in animation store (currently assumes local TZ)
- Mapbox style may need Tokyo-specific adjustments (different base map labels)
