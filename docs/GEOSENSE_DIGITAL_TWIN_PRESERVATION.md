# GEOSENSE DIGITAL TWIN PRESERVATION SNAPSHOT

This document serves as a strict baseline to ensure no existing functionalities are lost during the Interactive Disaster Enhancement phase.

## 1. Components & Files to Preserve
- `frontend/src/components/dashboard/views/spatial/DigitalTwinView.tsx` (Will be expanded, but core logic retained)
- `frontend/src/components/dashboard/views/spatial/GeoRiskMapView.tsx` (Will remain untouched unless specifically merging hazard visuals)

## 2. States to Preserve
- `mapImage`: Base64 string of the uploaded floor plan.
- `nodes`: Array of objects containing `{ id, x, y, type }`. Types include `waypoint` and `exit`.
- `edges`: Array of objects containing `{ id, from, to }`.
- `activeTool`: Editor state (`select`, `waypoint`, `exit`, `path`, `delete`).
- `draggingId`: Drag-and-drop state.
- `pathStart`: State for path drawing.

## 3. Storage & API to Preserve
- The Digital Twin is tied to `activeSchool.id`.
- Saving occurs via `apiClient.post('/api/digital-twin/:id', { mapImage, nodes, edges })`.
- Fetching occurs via `apiClient.get('/api/digital-twin/:id')`.
- No new tables or collections are strictly required for runtime simulations unless we want to persist specific hazard configurations.

## 4. UI Elements to Preserve
- Upload button (`handleImageUpload`).
- Clear map button (`clearData`).
- Save updates button (`saveFloorPlan`).
- Switch to Edit Map mode.
- Interactive SVG `<image>` renderer and node `<circle>` / edge `<line>` renderers.
- Validation warning for teachers ("Tahap Validasi: Minimal 1 Pintu Keluar").

## 5. Summary
The enhancement will inject new layers on top of the SVG canvas and introduce new control panels, but the underlying Editor architecture (Nodes, Edges, Image Upload, and Save logic) will be structurally preserved.
