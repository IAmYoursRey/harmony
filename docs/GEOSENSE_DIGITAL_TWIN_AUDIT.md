# GeoSense Digital Twin — Full Forensic Audit
_Conducted: Phase A — 2026-09-05_

---

## 1. Existing Architecture Overview

```
Frontend (Vite/React/TypeScript @ :5173)
  ↓ Vite Proxy
Backend (Express.js @ :3001)
  ↓
database.json (flat-file JSON store)
```

**Database Layer:** `backend/repository.js` — `readDB()` / `writeDB()` using `fs.readFileSync` / `writeFileSync` synchronously on `database.json`. Thread-safe only because Node.js is single-threaded; no migration system exists. The schema is flat:

```json
{
  "accounts": [],
  "profiles": [],
  "digitalTwins": {},
  "surveys": []
}
```

**API Client:** `frontend/src/services/apiClient.ts` — A lean typed wrapper around `fetch()`. Reads `TOKEN_KEY` from `localStorage`. Supports `GET`, `POST`, `PUT`, `DELETE`. All API calls in the frontend MUST go through this module.

---

## 2. Existing Digital Twin State

### Backend Route: `backend/routes/digitalTwin.js`
- `GET /api/digital-twin/:schoolId` — Returns `db.digitalTwins[schoolId]` or `null`. **No auth required.**
- `POST /api/digital-twin/:schoolId` — Requires JWT. RBAC: `role === 'dev' || 'teacher'`. Saves `{ mapImage, nodes, edges }`.

### Current Database Schema per schoolId:
```json
{
  "mapImage": "<base64 string | null | 'mock'>",
  "nodes": [{ "id": "node_xyz", "x": 455.2, "y": 69.8, "type": "waypoint|exit" }],
  "edges": [{ "id": "edge_xyz", "from": "node_a", "to": "node_b" }],
  "lastUpdated": "<ISO string>"
}
```

### Frontend Components (built in previous session):
| File | Purpose |
|---|---|
| `DigitalTwinView.tsx` (405 lines) | State orchestrator — loads/saves to backend, coordinates sub-components |
| `digital-twin/types.ts` | GraphNode, GraphEdge, Hazard, DisasterType, SimulationState, MapPosition |
| `digital-twin/routeEngine.ts` | Dijkstra pathfinding (single-source to nearest exit, hazard penalty) |
| `digital-twin/geolocation.ts` | Vibration API wrappers |
| `digital-twin/DigitalTwinCanvas.tsx` | SVG renderer: image + nodes + edges + overlay layers |
| `digital-twin/DigitalTwinEditor.tsx` | Teacher toolbar (Select/Waypoint/Exit/Path/Delete) |
| `digital-twin/DisasterSimulationPanel.tsx` | Bottom panel: disaster selector + START/STOP button |
| `digital-twin/DisasterAlert.tsx` | Fixed overlay alert during simulation |
| `digital-twin/HazardOverlay.tsx` | SVG hazard zone circles |
| `digital-twin/EvacuationArrow.tsx` | Animated SVG path with moving dot |
| `digital-twin/UserLocationMarker.tsx` | Pulsing user dot on canvas |

---

## 3. Authentication & RBAC

| Concern | Implementation |
|---|---|
| JWT | `jsonwebtoken` in backend; token issued on login |
| Token storage | `localStorage.getItem(TOKEN_KEY)` in `apiClient.ts` |
| Auth middleware | `backend/middleware/authMiddleware.js` — injects `req.user = { id, role }` |
| Roles | `dev`, `teacher`, `student` |
| Current DT RBAC | POST requires `dev` or `teacher`. GET is open (no auth). |
| School isolation | **NOT IMPLEMENTED.** Backend currently does zero school-ownership validation. Any teacher can overwrite any school's twin. |
| Class isolation | **NOT IMPLEMENTED.** No concept of class/group at backend. |

---

## 4. Data Model Gaps (vs. the new requirements)

| Required Entity | Current Status | Gap |
|---|---|---|
| Grid-based Map | Not present | Needs new schema key `gridMaps` in DB |
| MapCell | Not present | Needs type definition and storage |
| Room | Not present | Needs type + storage |
| Door | Not present | Needs type + storage |
| SafePoint | Not present (nodes have `exit` type) | Needs formal SafePoint type |
| SpawnPoint | Not present | Needs new node type `spawn` |
| DisasterSimulation | Not present | Needs new schema key `simulations` |
| SimulationHazard | Not present (only runtime in frontend) | Needs persistence |
| SimulationEvent | Not present | Needs type + storage |
| SimulationRoom | Not present | Needs `rooms` schema key |
| SimulationResult | Not present | Needs `results` schema key |
| Class/Group | Partial — `UserProfile.classSection` + `supervisedClasses` on teacher | No enforcement in Digital Twin |

---

## 5. Teacher Flow (Existing)

1. Login → Dashboard → Digital Twin tab
2. If school selected → `GET /api/digital-twin/:schoolId` loads `mapImage`, `nodes`, `edges`
3. Teacher uploads floor plan image → base64 encoded → stored in `mapImage`
4. Editor toolbar: add waypoints, exits, connect with paths, drag nodes
5. Save → `POST /api/digital-twin/:schoolId` persists to DB
6. Start Simulation (bottom panel) → client-side only — runs Dijkstra, triggers vibration, shows hazard overlay

**Existing teacher flow is entirely functional and MUST be preserved.**

---

## 6. Student Flow (Existing)

Currently students see the same Digital Twin view with:
- Read-only map (no editor tools)
- Simulation start button (active only after map + nodes exist)
- No "join room" or class-isolation concept

---

## 7. Components Available for Reuse

| Component | Reuse Plan |
|---|---|
| `apiClient.ts` | All new API calls go through this |
| `useAuth` hook | `currentUser`, `currentProfile`, `role` |
| `useSchool` hook | `activeSchool.id` for school-scoped API calls |
| `useToast` | All error/success notifications |
| `useI18n` | All user-facing strings |
| `digital-twin/types.ts` | Extend with new Grid/Simulation types |
| `digital-twin/routeEngine.ts` | Extend for grid-based BFS/A* |
| `digital-twin/geolocation.ts` | Keep as-is for vibration |
| `digital-twin/DisasterAlert.tsx` | Keep and extend |
| `digital-twin/HazardOverlay.tsx` | Keep — will overlay on grid |
| `backend/repository.js` | All new DB reads/writes through `readDB`/`writeDB` |
| `backend/middleware/authMiddleware.js` | All new routes use this |

---

## 8. Components That Need Modification

| Component | What Changes |
|---|---|
| `DigitalTwinView.tsx` | Becomes router/dispatcher between Map Management, Simulation, and Game views |
| `digital-twin/types.ts` | Extended with `GridMap`, `MapCell`, `DisasterSimulation`, `SimulationRoom`, `GameState`, `PlayerState` |
| `digital-twin/routeEngine.ts` | Generalized to support grid-based coords (not just SVG float coords) |
| `backend/routes/digitalTwin.js` | Extended with new routes for maps, simulations, rooms, results |
| `backend/repository.js` | `DEFAULT_DB` updated with new collection keys |
| `database.json` | New collections added on first write (safe, additive) |

---

## 9. Components That Should Be Extracted

| Current Location | Extract To | Reason |
|---|---|---|
| `DigitalTwinView.tsx` main state | `digital-twin/TeacherView.tsx` + `StudentView.tsx` | Separate teacher/student UX clearly |
| `DigitalTwinCanvas.tsx` | Keep but wrap in `MapEditorView.tsx` | Map editor is distinct from grid game |
| `DigitalTwinEditor.tsx` | Absorbed into `MapEditorView.tsx` | Currently isolated, should be co-located |

---

## 10. Genuinely Dead/Mock Code

| Item | Location | Action |
|---|---|---|
| `mapImage: "mock"` | `database.json:89` | Clear this on next POST — no code change needed |
| `sch_smax_123` entry (no mapImage) | `database.json:94-96` | Orphaned test entry — safe to leave, not harmful |
| `defaultHazards` constant | Was in old DigitalTwinView — **already removed** | N/A |
| `emergencyRoutes` constant | Was in old DigitalTwinView — **already removed** | N/A |
| SVG `createIcon` function | Was in old DigitalTwinView — **already removed** | N/A |
| Empty `frontend/src/types/` directory | **Already deleted** in previous session | N/A |

---

## 11. Empty Directories

None currently. All directories contain files.

---

## 12. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| `database.json` growing too large with grid data (100x100 grid = 10,000 cells) | HIGH | Use RLE compression or sparse cell storage (only non-empty cells) |
| Concurrent write collisions (teacher + student hitting DB simultaneously) | MEDIUM | Node.js is single-threaded; synchronous `writeFileSync` serializes access. Acceptable for prototype scale. |
| School isolation is currently absent on the backend | HIGH | Add `schoolId` ownership check to all new DT routes immediately |
| `mapImage` base64 strings are extremely large (130KB DB is already 50KB+ from one image) | MEDIUM | Consider storing only grid maps going forward; keep legacy mapImage for existing data |
| Game loop performance on mobile with large grids | MEDIUM | Cap grid at 40×40 for browser comfort; use CSS grid or canvas only for rendering |
| Class isolation not enforced server-side | HIGH | Every room creation and join must validate `profile.classSection` matches room's target class |

---

## 13. Recommended Architecture

```
backend/routes/
├── auth.js            (existing — NO CHANGE)
├── profile.js         (existing — NO CHANGE)
├── ai.js              (existing — NO CHANGE)
├── schools.js         (existing — NO CHANGE)
├── surveys.js         (existing — NO CHANGE)
└── digitalTwin.js     (EXTEND — add grid maps, simulations, rooms, results sub-routes)

database.json schema additions:
{
  "gridMaps": {},          // keyed by mapId
  "simulations": {},       // keyed by simulationId
  "dtRooms": {},           // keyed by roomId
  "dtResults": []          // array of SimulationResult
}

frontend/src/components/dashboard/views/spatial/
├── DigitalTwinView.tsx           (MODIFY — route dispatcher)
├── GeoRiskMapView.tsx            (NO CHANGE)
└── digital-twin/
    ├── types.ts                  (EXTEND with grid types)
    ├── routeEngine.ts            (EXTEND for grid BFS/A*)
    ├── geolocation.ts            (NO CHANGE)
    │
    ├── teacher/
    │   ├── TeacherDTView.tsx     (NEW — teacher hub: maps + sims + rooms)
    │   ├── MapList.tsx           (NEW)
    │   ├── MapEditor.tsx         (NEW — grid editor, wraps existing canvas as reference layer)
    │   ├── GridCanvas.tsx        (NEW — grid rendering)
    │   ├── GridToolbar.tsx       (NEW — teacher tools for grid)
    │   ├── SimulationCreator.tsx (NEW)
    │   ├── RoomManager.tsx       (NEW)
    │   └── RoomStatus.tsx        (NEW)
    │
    ├── student/
    │   ├── StudentDTView.tsx     (NEW — room list + join)
    │   ├── RoomLobby.tsx         (NEW — waiting room)
    │   └── GameView.tsx          (NEW — the actual game)
    │
    └── game/
        ├── GameGrid.tsx          (NEW — 2D grid renderer)
        ├── GameHUD.tsx           (NEW — HP bar + timer)
        ├── VirtualJoystick.tsx   (NEW — mobile d-pad)
        ├── PlayerMarker.tsx      (NEW — replaces UserLocationMarker)
        ├── HazardRenderer.tsx    (extends HazardOverlay)
        └── GameResult.tsx        (NEW — win/lose screen)
```

---

## 14. API Design

New endpoints to add to `digitalTwin.js`:

```
// Grid Maps
GET    /api/digital-twin/maps?schoolId=:id        → list maps for school
POST   /api/digital-twin/maps                      → create map (teacher/dev only)
GET    /api/digital-twin/maps/:mapId              → get single map
PUT    /api/digital-twin/maps/:mapId              → update map (owner/dev only)
DELETE /api/digital-twin/maps/:mapId              → delete map (owner/dev only)

// Simulations
GET    /api/digital-twin/simulations?schoolId=:id → list simulations for school
POST   /api/digital-twin/simulations              → create simulation (teacher/dev only)
GET    /api/digital-twin/simulations/:simId       → get simulation
PUT    /api/digital-twin/simulations/:simId       → update simulation
DELETE /api/digital-twin/simulations/:simId       → delete simulation

// Rooms
POST   /api/digital-twin/rooms                    → create room (teacher/dev only)
GET    /api/digital-twin/rooms?schoolId=:id       → list rooms for school (with class filter)
GET    /api/digital-twin/rooms/:roomId            → get room status
POST   /api/digital-twin/rooms/:roomId/join       → join room (student, class-validated)
POST   /api/digital-twin/rooms/:roomId/start      → start room (teacher/dev only)
POST   /api/digital-twin/rooms/:roomId/end        → end room (teacher/dev only)
POST   /api/digital-twin/rooms/:roomId/result     → submit result (student, room must be RUNNING)
```

---

## 15. Implementation Phases

| Phase | Description | Files Affected |
|---|---|---|
| C | Types + DB schema extension | `types.ts`, `repository.js`, `database.json` |
| D | Grid Map CRUD backend | `digitalTwin.js` |
| E | Grid Map CRUD frontend (teacher map list + editor) | `TeacherDTView.tsx`, `MapList.tsx`, `MapEditor.tsx`, `GridCanvas.tsx`, `GridToolbar.tsx` |
| F | Simulation + Room backend | `digitalTwin.js` |
| G | Simulation creator frontend | `SimulationCreator.tsx`, `RoomManager.tsx` |
| H | Student game frontend | `StudentDTView.tsx`, `RoomLobby.tsx`, `GameView.tsx`, `GameGrid.tsx`, `GameHUD.tsx`, `VirtualJoystick.tsx`, `HazardRenderer.tsx`, `GameResult.tsx` |
| I | Game loop (movement, collision, HP, timer, hazards) | `GameView.tsx`, `routeEngine.ts`, game sub-components |
| J | Security (school isolation, class isolation, RBAC) | `digitalTwin.js`, `authMiddleware.js` |
| K | Tests (security + gameplay) | `tests/test_digital_twin.js` |
| L | Cleanup + Final validation | All files |
