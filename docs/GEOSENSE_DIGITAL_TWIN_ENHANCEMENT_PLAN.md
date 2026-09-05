# GEOSENSE DIGITAL TWIN ENHANCEMENT PLAN

## EXISTING DIGITAL TWIN FEATURES
- SVG-based map rendering (`<image>`) with node and edge graph.
- Editable Waypoints, Exits, and Paths.
- Shortest-path routing (Multi-source Dijkstra) from all nodes to exits during "simulation".
- Backend persistence via `/api/digital-twin/:id`.

## PRESERVED FEATURES
- `mapImage` upload logic and rendering.
- Editor tools (Select, Waypoint, Exit, Path, Delete).
- Saving and fetching from the existing API.
- `SchoolContext` and `AuthContext` integration.

## NEW FEATURES TO ADD
- **Disaster Simulation Panel**: Moved to the bottom, includes glowing START button and disaster types.
- **Disaster Alert**: A toast/banner UI showing the active hazard.
- **Mobile Vibration**: Haptic feedback on start (`navigator.vibrate([300, 150, 300])`).
- **Realtime GPS**: `navigator.geolocation.watchPosition` mapped to local map bounds (if available) or fallback to manual position.
- **Evacuation Arrow**: Clear SVG arrow indicating the next hop.
- **Hazard Overlay**: Visual translucent representations of Fire, Flood, Earthquake over the SVG.
- **Rerouting**: Dynamic Dijkstra computation if user goes off route.
- **Completion State**: When user reaches the exit, stop simulation and show completion UI.

## FILES TO MODIFY
- `frontend/src/components/dashboard/views/spatial/DigitalTwinView.tsx` (Will be refactored into modular components).
- `frontend/src/components/dashboard/views/spatial/GeoRiskMapView.tsx` (Minor adjustments if shared types move).

## FILES TO CREATE (inside `frontend/src/components/dashboard/views/spatial/digital-twin/`)
- `types.ts`
- `routeEngine.ts`
- `geolocation.ts`
- `DigitalTwinCanvas.tsx`
- `DigitalTwinEditor.tsx`
- `DisasterSimulationPanel.tsx`
- `DisasterAlert.tsx`
- `HazardOverlay.tsx`
- `EvacuationArrow.tsx`
- `UserLocationMarker.tsx`

## FILES SAFE TO DELETE
- `frontend/src/types` (Empty directory, already deleted).

## API CHANGES
- None. (Existing `GET`/`POST` `/api/digital-twin/:id` is sufficient).

## RISKS
- **Coordinate Mapping**: GPS provides Lat/Lng, but the uploaded map has an arbitrary SVG scale (800x500). Mapping Lat/Lng directly to a non-georeferenced uploaded floor plan image is mathematically impossible without calibration points. 
*Mitigation*: We will implement `Location Mode` that allows either fake/demo moving (for testing) or manual placement, and if GPS is requested, we will warn the user that GPS requires a georeferenced map, falling back to "Local Map" tracking (user manually selects start position, or system creates a demo dot).
- **Vibration API**: Might be blocked by browser policies if not triggered by a direct user gesture. *Mitigation*: Trigger it inside the onClick handler of the START SIMULATION button.
