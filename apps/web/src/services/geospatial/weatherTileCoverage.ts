import type Map from 'ol/Map';
import type TileLayer from 'ol/layer/Tile';
import type XYZ from 'ol/source/XYZ';
import { getCacheKey } from 'ol/tilecoord';
import TileState from 'ol/TileState';
import { getRotatedViewport } from 'ol/extent';

export function readWeatherTileCoverage(map: Map, layer: TileLayer<XYZ>) {
  const counts = { activeRequested: 0, activeLoaded: 0, activeError: 0 };
  const size = map.getSize();
  if (!size) return counts;
  const source = layer.getSource();
  if (!source) return counts;
  const view = map.getView();
  const resolution = view.getResolution();
  if (resolution === undefined) return counts;
  const grid = source.getTileGridForProjection(view.getProjection());
  const zoom = grid.getZForResolution(resolution, source.zDirection);
  const fullRange = grid.getFullTileRange(zoom);
  const rotation = view.getRotation();
  const center = view.getCenter();
  const viewport = rotation && center ? getRotatedViewport(center, resolution, rotation, size) : null;
  // Peek at objects already used by the renderer. Inspection must never create
  // new IDLE tiles or count old viewport load events as current coverage.
  const cache = layer.getRenderer()?.getTileCache();
  grid.forEachTileCoord(view.calculateExtent(size), zoom, coord => {
    if (viewport && !grid.tileCoordIntersectsViewport(coord, viewport)) return;
    if (fullRange && (coord[2] < fullRange.minY || coord[2] > fullRange.maxY)) return;
    if (fullRange && !source.getWrapX() && (coord[1] < fullRange.minX || coord[1] > fullRange.maxX)) return;
    counts.activeRequested++;
    const tile = cache?.peek(getCacheKey(source, source.getKey(), coord[0], coord[1], coord[2]));
    if (tile?.getState() === TileState.LOADED) counts.activeLoaded++;
    else if (tile?.getState() === TileState.ERROR) counts.activeError++;
  });
  return counts;
}
