# GEOSENSE COORDINATE & CAMERA AUDIT

## 1. Current Coordinate System
- **GridCanvas.tsx**: Uses raw pixel manipulation. `cellSize` is dynamically calculated as `CELL_PX (24) * zoom`. 
  - `x` and `y` are in pixels.
  - Cell positions are calculated as `cell.x * (CELL_PX * zoom)`.
- **ScenarioEditor.tsx**: Renders the `scenarioOverlay` by passing an SVG `<g>` into `GridCanvas.tsx`.
  - It hardcodes `cellSize = 24`.
  - It does **not** scale with zoom, meaning when `GridCanvas` zooms, the base map scales, but the scenario objects stay fixed at `x * 24`. This causes massive misalignment.
- **GameCanvas.tsx**: Hardcodes `CELL_PX = 32`. No zoom implemented natively.

## 2. Current Camera System
- **Pan**: Works via raw offset (`pan.x`, `pan.y`). Middle click is supported.
- **Zoom**: Uses a cursor-centered algorithm in `GridCanvas.tsx`, but because `GridCanvas` modifies the physical `width` and `height` of the SVG rather than using SVG `viewBox`, external overlays (`scenarioOverlay`) break completely.
- **Fit-to-Screen**: Exists in `GridCanvas.tsx` but is slightly flawed because it calculates `newZoom` and defers panning to a `setTimeout`, causing flicker and occasionally incorrect alignment if window resizes.

## 3. Current Bugs
- **Bug A (Obstacle Grid Mismatch)**: The hardcoded `cellSize` in `ScenarioEditor.tsx` vs dynamic `cellSize` in `GridCanvas.tsx` causes the obstacle and scenario layers to completely misalign with the base map at any zoom level other than 100%.
- **Pan vs Place Priorities**: `GridCanvas` fires `onPaint` during pointer down without proper state priority checks, leading to accidental placements while panning.
- **Grid Disappearance**: Grid is drawn with a stroke width of 0.5. At low zoom levels (e.g., 25%), anti-aliasing causes the grid lines to vanish completely.

## 4. Root Cause
- Lack of a Single Source of Truth for coordinates.
- Using physical SVG dimensions (`width={totalW} height={totalH}`) combined with dynamic element scaling (`rect width={cellSize}`) instead of leveraging SVG's native `viewBox` for camera transforms.
- Hardcoded constants duplicated across files (`CELL_PX` = 24 in GridCanvas, 24 in ScenarioEditor, 32 in GameCanvas).

## 5. Planned Architecture
1. **Coordinate Utility (`frontend/src/components/dashboard/views/spatial/digital-twin/utils/coordinates.ts`)**:
   - Establish `WorldPoint`, `GridPoint`, `ScreenPoint`.
   - Implement `screenToWorld`, `worldToGrid`, `gridToScreen`.
2. **SVG ViewBox Camera**:
   - Refactor `GridCanvas` and `GameCanvas` to use `viewBox` for zoom and pan.
   - The internal rendering will ALWAYS use `1 cell = 1 unit` (or a fixed constant like `CELL_BASE_SIZE = 1`). This way, `x: 5, y: 4` is literally `x={5} y={4}` in world coordinates.
   - Zoom and Pan are entirely handled by the `viewBox`, ensuring overlays (like `ScenarioEditor`) scale perfectly without manual math.
3. **Adaptive Grid Rendering**:
   - Implement major (every 5 cells) and minor grids. 
   - Hide minor grids when `zoom < 0.5` by passing zoom level to the render function.
4. **Interaction Priorities**:
   - Add explicit `InteractionMode` (Pan vs Place) in `GridCanvas.tsx`.
   - Prevent `onPaint` from firing if spacebar is held or middle-mouse is used.
5. **Ghost Previews**:
   - Render a temporary ghost object mapped to the hovered cell during place mode.

## 6. Files Affected
- `frontend/src/components/dashboard/views/spatial/digital-twin/types.ts`
- `frontend/src/components/dashboard/views/spatial/digital-twin/utils/coordinates.ts` (NEW)
- `frontend/src/components/dashboard/views/spatial/digital-twin/teacher/GridCanvas.tsx`
- `frontend/src/components/dashboard/views/spatial/digital-twin/teacher/ScenarioEditor.tsx`
- `frontend/src/components/dashboard/views/spatial/digital-twin/game/GameCanvas.tsx`
