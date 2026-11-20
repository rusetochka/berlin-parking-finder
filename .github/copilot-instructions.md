# Berlin Parking Search — Copilot Instructions

## What this app does

A progressive web app (PWA) for finding parking in Berlin. Users type an address; the app queries the OpenStreetMap Overpass API for nearby parking spots, clusters them geographically, scores them by estimated difficulty, and displays results on an interactive Leaflet map alongside a filterable list panel.

## Tech stack

| Layer | Technology |
|---|---|
| Bundler | Vite 4 + vite-plugin-pwa |
| UI | React 18 + CSS Modules |
| State | Zustand 4 (single flat store, named selectors) |
| Maps | Leaflet 1.9 + react-leaflet 4 |
| Data | OpenStreetMap Overpass API + Nominatim geocoding |
| Tests | Vitest 0.34 + Testing Library React 14 + jsdom |
| Types | TypeScript 5 (strict) |
| Deploy | Vercel (SPA rewrites, `npm run build` pipeline) |
| Node | v16 (constrains some package versions) |

Path alias `@` resolves to `src/`.

---

## Feature overview

### Address search (`SearchBar`)
- Debounced Nominatim geocoding (350 ms) via `useGeocoding` hook
- Dropdown of up to 5 suggestions; each shows short label + secondary sub-label
- Selecting a result writes a `SearchLocation` to the store and persists it to `recentSearches` (localStorage, max 5, deduped)
- Suggestions are dismissed on blur or item selection via `onPointerDown`

### Parking data (`overpassAdapter`, `parkingService`)
- `buildOverpassQuery` generates an Overpass QL query for `amenity=parking` nodes/ways within a configurable radius
- `parseOverpassResult` maps raw OSM elements to `ParkingSpot` objects, resolving:
  - **Type**: garage, lot, park-and-ride, street zone, unknown
  - **Fee**: free / paid from `fee=*` tag
  - **Capacity**: `capacity=*` tag
  - **Opening hours**: raw string preserved; `24/7` detected for "open now" filter
- `haversineMetres` computes accurate great-circle distances; `estimateWalkingMinutes` at 80 m/min

### Difficulty scoring (`difficultyScorer`)
- Heuristic 0–100 score — **always marked as estimated**, never live occupancy data
- Factors: neighbourhood density (bounding-box lookup for 10+ Berlin districts), distance from Brandenburger Tor, parking type, time of day, day of week
- Outputs `DifficultyLevel` (`easy` / `medium` / `hard`) with a human-readable label and a `factors` string array for the legend tooltip

### Clustering (`clusterService`)
- Greedy spatial clustering: spots within 150 m of a cluster centre are merged; centre is recomputed as the geometric mean
- Returns the top 5 clusters sorted by spot count
- Each `ParkingCluster` exposes: `spotCount`, `totalCapacity`, `hasFreeParking`, `typeCounts` record, `avgDifficulty`

### Filters (`FilterBar`, `appStore.filters`)
- **Radius**: 250 m / 500 m / 1 000 m / 2 000 m chip selector
- **Type**: multi-select toggle for garage / lot / park-and-ride / street zone
- **Open now**: boolean checkbox
- **Sort**: nearest / cheapest / easiest dropdown
- Filters merged into store via `setFilters`; `resetFilters` restores `DEFAULT_FILTERS`

### Map view (`MapView`, `ClusterMarker`, `ParkingMarker`, `LocationPin`)
- Leaflet map centred on selected location
- Cluster markers show spot count; individual `ParkingMarker` shows type icon + difficulty colour
- `LocationPin` marks the searched address
- Long-press / right-click on map activates **mark mode** for user-placed marks

### User marks (`AddMarkDialog`, `UserMarkMarker`)
- Users can drop custom markers with a difficulty rating (`easy` / `moderate` / `hard`) and an optional note
- Marks are persisted to localStorage under `berlin-parking:user-marks`
- `AddMarkDialog` is a modal overlay triggered by `addMarkPending` state

### Results panel (`ResultsPanel`, `ClusterCard`, `ParkingCard`)
- Shows cluster cards; each card expands to list individual `ParkingCard` entries
- States: no location → prompt; loading → skeleton; error → message; empty → "no results"
- `ParkingCard` displays: name, `TypeBadge`, `DifficultyBadge`, distance, walking time, fee, opening hours; expand/collapse for full details

### Responsive layout / view modes
- Desktop: sidebar (filters + results) + map side by side
- Mobile: single panel; **Map** / **List** toggle buttons in the header switch between views
- Floating badge on map shows cluster count; tapping it switches to list view

### PWA
- Service worker via vite-plugin-pwa (`generateSW` mode)
- Precaches all production assets; manifest with 192 px and 512 px SVG icons

---

## Project structure conventions

```
src/
  components/   # Presentational + container components, co-located CSS Modules
    ui/         # Shared atomic components (DifficultyBadge, TypeBadge)
  hooks/        # Custom React hooks (useGeocoding, useParking)
  services/     # Pure business logic, no React (overpassAdapter, parkingService, …)
  stores/       # Zustand store (appStore.ts) + named selectors
  types/        # TypeScript interfaces and enums (parking.ts, geocoding.ts)
  styles/       # Global CSS reset + CSS custom properties (variables.css)
  test/         # Vitest setup (setup.ts)
```

Each feature directory has a `__tests__/` sibling for unit/component tests.

---

## Build pipeline

```
npm run typecheck   # tsc --noEmit  — type-checks without emitting
npm run test        # vitest run    — 166 tests across 15 files
npm run build       # all of the above, then vite build → dist/
```

`vercel.json` uses `npm run build` as the build command, so typecheck and tests run on every Vercel deployment.

---

## Key patterns

- **Store access**: always use named selectors (`selectFilters`, `selectSelectedLocation`, etc.) for component subscriptions to avoid over-rendering. Direct `useAppStore((s) => s.action)` for write actions.
- **No prop drilling**: components read from the store directly; only `ParkingCard` / `ClusterCard` accept data as props (they are pure display components).
- **CSS Modules**: all component styles are scoped via `.module.css` files. Global tokens live in `src/styles/variables.css` as CSS custom properties.
- **Testing fake timers**: debounced hooks use `vi.useFakeTimers()` + `await act(async () => { vi.advanceTimersByTime(ms); }); await act(async () => {});` to flush microtasks.
- **Leaflet in tests**: react-leaflet and leaflet are fully mocked in `vi.mock` blocks in component tests that render map views.
- **No live occupancy data**: the `isLiveData` flag on `ParkingSpot` is always `false` in the current MVP. The difficulty score is always shown with an "Estimated" disclaimer.
