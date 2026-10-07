import React, { useState, useRef, useEffect, useMemo } from 'react';
import OLMap from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';
import Point from 'ol/geom/Point';
import { fromLonLat } from 'ol/proj';
import { Style, Text, Fill, Stroke, Icon } from 'ol/style';
import 'ol/ol.css';
import {
  Flame,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sliders,
  Crosshair,
  MapPin,
  ExternalLink,
  CheckCircle2,
  Paintbrush,
  Radio,
  Eye,
  EyeOff,
} from 'lucide-react';
import { HotspotRecord } from '../../../../../services/geospatial/firmsService';
import { AreaOfInterest } from '../../../../../services/geospatial/aoiService';

interface GeospatialHotspotMapViewProps {
  hotspots: HotspotRecord[];
  activeAOI: AreaOfInterest | null;
  effectiveBBox?: [number, number, number, number];
  lat: number;
  lng: number;
  regionName: string;
  selectedHotspot: HotspotRecord | null;
  onSelectHotspot: (hotspot: HotspotRecord | null) => void;
  onApplyToMainMap?: () => void;
  appliedToMainMap?: boolean;
}

// Memory texture cache for feathered thermal brush anomaly block textures
const thermalBrushTextureCache = new Map<string, HTMLCanvasElement>();

/**
 * Creates an organic, feathered thermal brush texture that "ngeblok" the anomaly area.
 * Blends painterly brush strokes, soft translucent radial falloff, an incandescent core,
 * and a softened rectangular block contour that hugs the affected land.
 */
function getThermalBrushTexture(
  color: string,
  isSelected: boolean
): HTMLCanvasElement {
  const cacheKey = `${color}_${isSelected}`;
  const existing = thermalBrushTextureCache.get(cacheKey);
  if (existing) return existing;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const cx = size / 2;
  const cy = size / 2;

  // 1. Wide feathered airbrush falloff (soft atmospheric thermal plume)
  const plumeGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 62);
  if (color === '#ef4444') {
    plumeGrad.addColorStop(0, 'rgba(239, 68, 68, 0.42)');
    plumeGrad.addColorStop(0.35, 'rgba(249, 115, 22, 0.26)');
    plumeGrad.addColorStop(0.70, 'rgba(245, 158, 11, 0.10)');
    plumeGrad.addColorStop(1.0, 'rgba(239, 68, 68, 0.0)');
  } else if (color === '#f97316') {
    plumeGrad.addColorStop(0, 'rgba(249, 115, 22, 0.40)');
    plumeGrad.addColorStop(0.35, 'rgba(245, 158, 11, 0.22)');
    plumeGrad.addColorStop(0.70, 'rgba(234, 179, 8, 0.08)');
    plumeGrad.addColorStop(1.0, 'rgba(249, 115, 22, 0.0)');
  } else {
    plumeGrad.addColorStop(0, 'rgba(234, 179, 8, 0.36)');
    plumeGrad.addColorStop(0.35, 'rgba(234, 179, 8, 0.18)');
    plumeGrad.addColorStop(0.70, 'rgba(234, 179, 8, 0.06)');
    plumeGrad.addColorStop(1.0, 'rgba(234, 179, 8, 0.0)');
  }
  ctx.fillStyle = plumeGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 62, 0, Math.PI * 2);
  ctx.fill();

  // 2. Feathered Brush Block (Organic rounded rectangle covering and smudging the anomaly footprint)
  const blockW = 68;
  const blockH = 68;
  const r = 18;
  const bx = cx - blockW / 2;
  const by = cy - blockH / 2;

  const blockGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 46);
  if (color === '#ef4444') {
    blockGrad.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
    blockGrad.addColorStop(0.18, 'rgba(254, 202, 202, 0.82)');
    blockGrad.addColorStop(0.48, 'rgba(239, 68, 68, 0.70)');
    blockGrad.addColorStop(0.80, 'rgba(249, 115, 22, 0.36)');
    blockGrad.addColorStop(1.0, 'rgba(239, 68, 68, 0.02)');
  } else if (color === '#f97316') {
    blockGrad.addColorStop(0, 'rgba(255, 255, 255, 0.90)');
    blockGrad.addColorStop(0.18, 'rgba(254, 215, 170, 0.78)');
    blockGrad.addColorStop(0.48, 'rgba(249, 115, 22, 0.65)');
    blockGrad.addColorStop(0.80, 'rgba(245, 158, 11, 0.30)');
    blockGrad.addColorStop(1.0, 'rgba(249, 115, 22, 0.02)');
  } else {
    blockGrad.addColorStop(0, 'rgba(255, 255, 255, 0.86)');
    blockGrad.addColorStop(0.18, 'rgba(254, 240, 138, 0.72)');
    blockGrad.addColorStop(0.48, 'rgba(234, 179, 8, 0.58)');
    blockGrad.addColorStop(0.80, 'rgba(234, 179, 8, 0.24)');
    blockGrad.addColorStop(1.0, 'rgba(234, 179, 8, 0.02)');
  }

  ctx.fillStyle = blockGrad;
  ctx.beginPath();
  ctx.roundRect(bx, by, blockW, blockH, r);
  ctx.fill();

  // 3. Painterly cross brush dabs (creates authentic texture of a brush smudge)
  ctx.save();
  ctx.fillStyle = color === '#ef4444' ? 'rgba(239, 68, 68, 0.34)' : 'rgba(249, 115, 22, 0.30)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 32, 16, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, cy, 30, 14, -0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 4. Epicenter incandescent white core
  ctx.beginPath();
  ctx.arc(cx, cy, isSelected ? 4.5 : 3.2, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = color;
  ctx.shadowBlur = isSelected ? 12 : 6;
  ctx.fill();

  // 5. Selected tactical boundary ring
  if (isSelected) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(bx - 3, by - 3, blockW + 6, blockH + 6, r + 3);
    ctx.stroke();
  }

  thermalBrushTextureCache.set(cacheKey, canvas);
  return canvas;
}

/**
 * Constructs an exact geographic bounding polygon (in EPSG:3857 coordinates)
 * representing the real-world satellite ground sensor pixel footprint.
 * - VIIRS (Suomi-NPP, NOAA-20, NOAA-21): nominal 375m x 375m at nadir
 * - MODIS (Terra, Aqua): nominal 1000m x 1000m at nadir
 * Derived from NASA FIRMS scan and track telemetry parameters with latitude geodetic correction.
 */
function createSatelliteFootprintGeometry(h: HotspotRecord): Polygon {
  const [cx, cy] = fromLonLat([h.longitude, h.latitude]);
  const scanKm = h.scanKm ?? (h.instrument === 'VIIRS' ? 0.375 : 1.0);
  const trackKm = h.trackKm ?? (h.instrument === 'VIIRS' ? 0.375 : 1.0);
  const latRad = (h.latitude * Math.PI) / 180;
  const cosLat = Math.max(0.15, Math.cos(latRad));
  const halfX = ((scanKm * 1000) / 2) / cosLat;
  const halfY = (trackKm * 1000) / 2;

  return new Polygon([[
    [cx - halfX, cy - halfY],
    [cx + halfX, cy - halfY],
    [cx + halfX, cy + halfY],
    [cx - halfX, cy + halfY],
    [cx - halfX, cy - halfY],
  ]]);
}

export const GeospatialHotspotMapView: React.FC<GeospatialHotspotMapViewProps> = ({
  hotspots,
  activeAOI,
  effectiveBBox,
  lat,
  lng,
  regionName,
  selectedHotspot,
  onSelectHotspot,
  onApplyToMainMap,
  appliedToMainMap,
}) => {
  const [opacity, setOpacity] = useState<number>(0.92);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [hoveredHotspot, setHoveredHotspot] = useState<HotspotRecord | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<OLMap | null>(null);
  const satLayerRef = useRef<TileLayer | null>(null);
  const footprintVectorSourceRef = useRef<VectorSource | null>(null);
  const footprintVectorLayerRef = useRef<VectorLayer | null>(null);

  const computedBBox: [number, number, number, number] = useMemo(() => {
    return (
      effectiveBBox ||
      activeAOI?.bbox || [lng - 0.25, lat - 0.25, lng + 0.25, lat + 0.25]
    );
  }, [effectiveBBox, activeAOI, lat, lng]);

  const [minLng, minLat, maxLng, maxLat] = computedBBox;
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // 1. Satellite Base Tile Layer (ESRI World Imagery)
    const satSource = new XYZ({
      urls: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      maxZoom: 19,
      crossOrigin: 'anonymous',
    });

    const satLayer = new TileLayer({
      source: satSource,
      opacity: opacity,
      zIndex: 1,
    });
    satLayerRef.current = satLayer;

    // 2. Real-World Ground Footprint Vector Layer with Dynamic Feathered Brush Smudge
    const footprintSource = new VectorSource();
    footprintVectorSourceRef.current = footprintSource;

    const footprintVectorLayer = new VectorLayer({
      source: footprintSource,
      zIndex: 15,
      style: (feature, resolution) => {
        const rawH = feature.get('hotspotData') as HotspotRecord | undefined;
        if (!rawH) return undefined;
        const isSelected = selectedHotspot && selectedHotspot.id === rawH.id;
        const isHovered = hoveredHotspot && hoveredHotspot.id === rawH.id;
        const conf = rawH.confidenceLevel || 'nominal';

        const scanKm = rawH.scanKm ?? (rawH.instrument === 'VIIRS' ? 0.375 : 1.0);
        const trackKm = rawH.trackKm ?? (rawH.instrument === 'VIIRS' ? 0.375 : 1.0);
        const scanMeters = scanKm * 1000;
        const trackMeters = trackKm * 1000;

        const pixelWidth = scanMeters / resolution;
        const pixelHeight = trackMeters / resolution;

        const baseColor =
          conf === 'high' ? '#ef4444' : conf === 'nominal' ? '#f97316' : '#eab308';

        const brushCanvas = getThermalBrushTexture(baseColor, !!isSelected);

        // Ground-scale tied brush sizing:
        // Texture core is 68px.
        // At map resolution, target pixel width is pixelWidth.
        // Clamp minimum size to 4px on national overview so it remains a discrete pinpoint and never covers an entire island!
        const effPixelWidth = Math.max(4.0, pixelWidth);
        const effPixelHeight = Math.max(4.0, pixelHeight);

        const scaleX = effPixelWidth / 68;
        const scaleY = effPixelHeight / 68;

        const styles: Style[] = [];

        // 1. Organic Feathered Thermal Brush Smudge (sapuan kuas yang ngeblok area anomali)
        styles.push(
          new Style({
            geometry: new Point(fromLonLat([rawH.longitude, rawH.latitude])),
            image: new Icon({
              img: brushCanvas,
              scale: [scaleX, scaleY],
              anchor: [0.5, 0.5],
              opacity: isSelected ? 1.0 : isHovered ? 0.95 : 0.88,
            }),
          })
        );

        // 2. Tactical Anomaly Boundary & Text (only when zoomed in enough to see the parcel, e.g. pixelWidth >= 18)
        if (pixelWidth >= 18) {
          let textStyle: Text | undefined = undefined;
          if (showLabels && (pixelWidth >= 28 || isSelected)) {
            const tempC = rawH.brightnessKelvin ? `${Math.round(rawH.brightnessKelvin - 273.15)}°C` : '';
            const frpText = rawH.frpMw ? `${Math.round(rawH.frpMw)}MW` : '';
            const label = [tempC, frpText].filter(Boolean).join(' • ');
            if (label) {
              textStyle = new Text({
                text: label,
                font: 'bold 10px monospace',
                fill: new Fill({ color: '#ffffff' }),
                stroke: new Stroke({ color: '#000000', width: 2.8 }),
                offsetY: -effPixelHeight / 2 - 8,
              });
            }
          }

          styles.push(
            new Style({
              stroke: new Stroke({
                color: isSelected
                  ? '#ffffff'
                  : isHovered
                  ? 'rgba(255, 255, 255, 0.90)'
                  : 'rgba(255, 255, 255, 0.45)',
                width: isSelected ? 2.2 : 1.2,
                lineDash: isSelected ? undefined : [4, 4],
              }),
              text: textStyle,
            })
          );
        }

        return styles;
      },
    });
    footprintVectorLayerRef.current = footprintVectorLayer;

    // 3. Build OpenLayers Map Instance (Strictly Vector Footprints + Satellite Base)
    const map = new OLMap({
      target: mapContainerRef.current,
      layers: [satLayer, footprintVectorLayer],
      view: new View({
        center: fromLonLat([centerLng, centerLat]),
        zoom: 9.5,
        maxZoom: 19,
        minZoom: 4,
      }),
      controls: [],
    });
    mapInstanceRef.current = map;

    // Hover tooltip listener
    map.on('pointermove', (evt) => {
      let found: HotspotRecord | null = null;
      map.forEachFeatureAtPixel(evt.pixel, (feat) => {
        const hData = feat.get('hotspotData') as HotspotRecord | undefined;
        if (hData) {
          found = hData;
          return true;
        }
      });
      setHoveredHotspot(found);
    });

    // Click select listener
    map.on('click', (evt) => {
      let found: HotspotRecord | null = null;
      map.forEachFeatureAtPixel(evt.pixel, (feat) => {
        const hData = feat.get('hotspotData') as HotspotRecord | undefined;
        if (hData) {
          found = hData;
          return true;
        }
      });
      onSelectHotspot(found);
    });

    return () => {
      map.setTarget(undefined);
      mapInstanceRef.current = null;
    };
  }, [centerLat, centerLng]);

  // Sync hotspots into footprint vector source
  useEffect(() => {
    const footprintSource = footprintVectorSourceRef.current;
    if (!footprintSource) return;

    footprintSource.clear();

    hotspots.forEach((h) => {
      const polygonGeom = createSatelliteFootprintGeometry(h);
      const polygonFeature = new Feature({
        geometry: polygonGeom,
        hotspotData: h,
        name: `Hotspot ${h.instrument} (${h.confidenceLevel.toUpperCase()})`,
      });
      footprintSource.addFeature(polygonFeature);
    });

    if (hotspots.length > 0 && mapInstanceRef.current) {
      const extent = footprintSource.getExtent();
      if (
        extent &&
        isFinite(extent[0]) &&
        isFinite(extent[1]) &&
        isFinite(extent[2]) &&
        isFinite(extent[3])
      ) {
        mapInstanceRef.current.getView().fit(extent, {
          padding: [50, 50, 50, 50],
          maxZoom: 13,
          duration: 600,
        });
      }
    }
  }, [hotspots]);

  // Sync selected hotspot center animation
  useEffect(() => {
    if (!selectedHotspot || !mapInstanceRef.current) return;
    const view = mapInstanceRef.current.getView();
    view.animate({
      center: fromLonLat([selectedHotspot.longitude, selectedHotspot.latitude]),
      zoom: Math.max(view.getZoom() || 10, 13),
      duration: 600,
    });
    footprintVectorLayerRef.current?.changed();
  }, [selectedHotspot]);

  // Sync opacity
  useEffect(() => {
    if (satLayerRef.current) {
      satLayerRef.current.setOpacity(opacity);
    }
  }, [opacity]);

  // Sync labels
  useEffect(() => {
    footprintVectorLayerRef.current?.changed();
  }, [showLabels]);

  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      const view = mapInstanceRef.current.getView();
      view.animate({ zoom: (view.getZoom() || 10) + 1, duration: 250 });
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      const view = mapInstanceRef.current.getView();
      view.animate({ zoom: (view.getZoom() || 10) - 1, duration: 250 });
    }
  };

  const handleResetView = () => {
    if (mapInstanceRef.current) {
      const view = mapInstanceRef.current.getView();
      view.animate({
        center: fromLonLat([centerLng, centerLat]),
        zoom: 9.5,
        duration: 500,
      });
    }
  };

  const handleFitToHotspots = () => {
    if (!mapInstanceRef.current || !footprintVectorSourceRef.current) return;
    const extent = footprintVectorSourceRef.current.getExtent();
    if (
      extent &&
      isFinite(extent[0]) &&
      isFinite(extent[1]) &&
      isFinite(extent[2]) &&
      isFinite(extent[3])
    ) {
      mapInstanceRef.current.getView().fit(extent, {
        padding: [60, 60, 60, 60],
        maxZoom: 14,
        duration: 500,
      });
    }
  };

  const activeFocusHotspot = hoveredHotspot || selectedHotspot;

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
      {/* Top Map Header & Controls */}
      <div className="p-3 sm:p-4 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white flex items-center justify-center shadow-md shadow-rose-500/25">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-slate-100 flex items-center gap-1.5">
                Peta Resolusi Footprint Anomali Satelit
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-semibold">
                  Sapuan Kuas Tanah Nyata Tetap
                </span>
              </h4>
            </div>
            <p className="text-[11px] text-slate-400">
              {regionName} • {hotspots.length} Deteksi Anomali Sensor Termal
            </p>
          </div>
        </div>

        {/* Tactical Toolbar Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Label Toggle */}
          <button
            type="button"
            onClick={() => setShowLabels(!showLabels)}
            className={`px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer text-xs font-semibold ${
              showLabels
                ? 'bg-slate-800 text-slate-200 border border-slate-700'
                : 'bg-slate-900 text-slate-500 border border-slate-800 hover:text-slate-300'
            }`}
            title="Tampilkan label suhu (°C) dan daya radiasi api (MW) di atas blok"
          >
            {showLabels ? <Eye className="w-3.5 h-3.5 text-rose-400" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Label Suhu & FRP</span>
          </button>

          <button
            type="button"
            onClick={handleFitToHotspots}
            disabled={hotspots.length === 0}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Crosshair className="w-3.5 h-3.5 text-rose-400" />
            <span>Fokus ke Anomali</span>
          </button>

          <button
            type="button"
            onClick={handleResetView}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-sky-400" />
            <span>Pusatkan ke Wilayah</span>
          </button>
        </div>
      </div>

      {/* Map Viewport Area */}
      <div className="relative w-full h-84 sm:h-96 bg-slate-950 overflow-hidden select-none">
        <div ref={mapContainerRef} className="w-full h-full block cursor-crosshair" />

        {/* Legend for Ground Footprint Pixels */}
        <div className="absolute bottom-3 left-3 bg-slate-950/90 backdrop-blur-md border border-slate-800 px-3.5 py-2.5 rounded-2xl text-[10px] font-mono space-y-2 pointer-events-none z-20 shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <span className="font-bold text-slate-200 tracking-wider flex items-center gap-1.5">
              <Paintbrush className="w-3 h-3 text-rose-400" />
              Sapuan Kuas Anomali (Footprint Tanah Nyata)
            </span>
            <span className="text-[9px] text-emerald-400 font-bold">NASA NRT</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-rose-400">
              <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                <span className="absolute inline-flex h-full w-full rounded-full bg-rose-500/50 blur-[1px]"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
              </span>
              <span>Tinggi (≥80%)</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-400">
              <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                <span className="absolute inline-flex h-full w-full rounded-full bg-amber-500/50 blur-[1px]"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
              </span>
              <span>Nominal (30-79%)</span>
            </div>
            <div className="flex items-center gap-1.5 text-yellow-400">
              <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                <span className="absolute inline-flex h-full w-full rounded-full bg-yellow-500/50 blur-[1px]"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
              </span>
              <span>Rendah (&lt;30%)</span>
            </div>
          </div>
          <div className="text-[9px] text-slate-400 pt-0.5 border-t border-slate-800/80">
            VIIRS: 375m × 375m • MODIS: 1000m × 1000m (1.00 km)
          </div>
        </div>

        {/* Floating Zoom & Center Buttons */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 bg-slate-900/85 backdrop-blur-md border border-slate-800 p-1 rounded-xl shadow-xl z-20">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Perbesar Peta"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Perkecil Peta"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="h-px bg-slate-800 my-0.5" />
          <button
            type="button"
            onClick={handleResetView}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Pusatkan Ulang"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Hotspot Telemetry Popup with Satellite Sensor Physics */}
        {activeFocusHotspot && (
          <div className="absolute top-3 left-3 bg-slate-950/95 backdrop-blur-md border border-rose-500/40 p-3.5 rounded-2xl shadow-2xl z-20 font-mono text-[11px] space-y-2 max-w-sm animate-fadeIn">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <span className="font-bold text-rose-400 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-rose-500" />
                {activeFocusHotspot.instrument} ({activeFocusHotspot.satellite})
              </span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase ${
                  activeFocusHotspot.confidenceLevel === 'high'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : activeFocusHotspot.confidenceLevel === 'nominal'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                }`}
              >
                Keyakinan: {activeFocusHotspot.confidenceLevel}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px] text-slate-300">
              <div>
                <span className="text-slate-500">Suhu Sensor: </span>
                <strong className="text-rose-400">
                  {activeFocusHotspot.brightnessKelvin != null
                    ? `${activeFocusHotspot.brightnessKelvin} K (${(activeFocusHotspot.brightnessKelvin - 273.15).toFixed(1)}°C)`
                    : '—'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500">Radiasi Termal (FRP): </span>
                <strong className="text-amber-400">{activeFocusHotspot.frpMw != null ? `${activeFocusHotspot.frpMw} MW` : '—'}</strong>
              </div>
              <div>
                <span className="text-slate-500">Ukuran Blok Tanah: </span>
                <span className="text-slate-200">
                  {((activeFocusHotspot.scanKm ?? (activeFocusHotspot.instrument === 'VIIRS' ? 0.375 : 1.0)) * 1000).toFixed(0)}m × {((activeFocusHotspot.trackKm ?? (activeFocusHotspot.instrument === 'VIIRS' ? 0.375 : 1.0)) * 1000).toFixed(0)}m
                </span>
              </div>
              <div>
                <span className="text-slate-500">Waktu Deteksi: </span>
                <span className="text-slate-200">{activeFocusHotspot.acqTimeUtc}</span>
              </div>
              <div>
                <span className="text-slate-500">Tanggal Akuisisi: </span>
                <span className="text-slate-200">{activeFocusHotspot.acqDate}</span>
              </div>
              <div>
                <span className="text-slate-500">Kondisi Orbit: </span>
                <span className="text-slate-200">{activeFocusHotspot.dayNight === 'D' ? 'Siang Hari (Day)' : 'Malam Hari (Night)'}</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-800/80">
              <span>Koordinat: {activeFocusHotspot.latitude.toFixed(4)}°, {activeFocusHotspot.longitude.toFixed(4)}°</span>
              <span className="text-sky-400">NASA FIRMS LANCE NRT</span>
            </div>
          </div>
        )}

        {/* Observation Status Tag */}
        <div className="absolute bottom-3 right-3 bg-slate-950/85 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-xl text-[10px] font-mono text-slate-400 pointer-events-none z-20">
          <span>Observasi: {regionName} • {hotspots.length} Anomali Termal Satelit</span>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Opacity Slider */}
          <div className="flex items-center gap-2 text-slate-400">
            <Sliders className="w-3.5 h-3.5" />
            <span>Opasitas Citra Satelit:</span>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.05"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-24 accent-rose-500 cursor-pointer"
            />
            <span className="text-white font-bold">{Math.round(opacity * 100)}%</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400">
            <Radio className="w-3 h-3 text-emerald-400" />
            <span>Sapuan Kuas Presisi Terikat Skala Tanah Nyata</span>
          </div>
        </div>

        {onApplyToMainMap && (
          <button
            type="button"
            onClick={onApplyToMainMap}
            disabled={hotspots.length === 0}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-600 text-white font-bold hover:brightness-110 active:scale-95 transition-all shadow-sm shadow-rose-500/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {appliedToMainMap ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>Tersinkron ke Peta Utama!</span>
              </>
            ) : (
              <>
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Tampilkan di Peta Utama Dashboard</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
