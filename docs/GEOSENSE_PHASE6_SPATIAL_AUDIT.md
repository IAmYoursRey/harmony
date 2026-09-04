# GEOSENSE PHASE 6 SPATIAL AUDIT

The Spatial Map feature relies heavily on the `School` entity.

### Data Sources
1. **Latitude/Longitude**:
   - **SOURCE**: Backend `GET /api/schools` -> `SchoolContext.selection.school`.
   - **TRANSFORMATION**: Bound to Leaflet map center.
   - **CONSUMER**: `SpatialViews.tsx`.
2. **School Risk Levels**:
   - **SOURCE**: Backend `GET /api/schools` -> `SchoolContext.selection.school`.
   - **TRANSFORMATION**: Used to render UI badges and compute baseline resilience.
   - **CONSUMER**: `AnalyticsViews.tsx`, `SpatialViews.tsx`.
3. **Map Tiles**:
   - **SOURCE**: OpenStreetMap (Static public tiles).
   - **CONSUMER**: Leaflet `TileLayer`.
4. **Digital Twin Nodes/Edges**:
   - **SOURCE**: Backend `GET /api/digital-twin/:schoolId`.
   - **TRANSFORMATION**: Merged with local state array (X/Y coordinates relative to an uploaded floorplan).
   - **CONSUMER**: `SpatialViews.tsx` (Graph Mode).
