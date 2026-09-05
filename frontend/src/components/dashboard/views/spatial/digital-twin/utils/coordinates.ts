export type ScreenPoint = {
  x: number;
  y: number;
};

export type WorldPoint = {
  x: number;
  y: number;
};

export type GridPoint = {
  col: number;
  row: number;
};

export type Camera = {
  x: number;
  y: number;
  zoom: number;
};

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4.0;
export const ZOOM_STEP_FACTOR = 1.25;

/**
 * Converts a screen coordinate (e.g. from mouse event on the canvas)
 * to a world coordinate, applying the camera transform.
 */
export function screenToWorld(
  screenPt: ScreenPoint,
  camera: Camera,
  canvasRect: DOMRect
): WorldPoint {
  // camera.x and camera.y represent the top-left of the world view in world units?
  // No, let's say camera.x and camera.y are the world coordinates at the TOP LEFT of the screen.
  // Wait, standard SVG viewBox approach:
  // SVG viewBox is "minX minY width height".
  // If camera.x is minX, camera.y is minY.
  // Then screenPt.x / rect.width = (worldX - camera.x) / viewBox.width
  // Since viewBox.width = rect.width / camera.zoom (assuming 1 world unit = 1 pixel at 100% zoom).
  
  // So: worldX = camera.x + (screenPt.x / camera.zoom)
  
  return {
    x: camera.x + (screenPt.x / camera.zoom),
    y: camera.y + (screenPt.y / camera.zoom),
  };
}

/**
 * Converts world coordinates to grid coordinates (snapping to cells).
 * World units are exactly 1 unit = 1 cell.
 */
export function worldToGrid(worldPt: WorldPoint): GridPoint {
  return {
    col: Math.floor(worldPt.x),
    row: Math.floor(worldPt.y),
  };
}

/**
 * Convenience function: Screen -> Grid directly.
 */
export function screenToGrid(
  screenPt: ScreenPoint,
  camera: Camera,
  canvasRect: DOMRect
): GridPoint {
  return worldToGrid(screenToWorld(screenPt, camera, canvasRect));
}

/**
 * Calculates a new camera state so that zooming is centered on the given screen point.
 */
export function calculateZoom(
  currentCamera: Camera,
  zoomFactor: number,
  centerScreen: ScreenPoint
): Camera {
  let newZoom = currentCamera.zoom * zoomFactor;
  newZoom = Math.max(MIN_ZOOM, Math.min(newZoom, MAX_ZOOM));
  
  if (newZoom === currentCamera.zoom) {
    return currentCamera;
  }

  // To keep the world point exactly under the screen point,
  // the world point at centerScreen must remain the same before and after zoom.
  
  // worldX = currentCamera.x + (centerScreen.x / currentCamera.zoom)
  // we want newCamera.x + (centerScreen.x / newZoom) to equal worldX
  
  // newCamera.x = worldX - (centerScreen.x / newZoom)
  //             = currentCamera.x + (centerScreen.x / currentCamera.zoom) - (centerScreen.x / newZoom)
  
  const nx = currentCamera.x + centerScreen.x * (1 / currentCamera.zoom - 1 / newZoom);
  const ny = currentCamera.y + centerScreen.y * (1 / currentCamera.zoom - 1 / newZoom);
  
  return {
    x: nx,
    y: ny,
    zoom: newZoom,
  };
}
