import React, { useState, useRef, useEffect, useMemo } from 'react';
import OLMap from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Heatmap from 'ol/layer/Heatmap';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { fromLonLat } from 'ol/proj';
import { Style, Icon, Text, Fill, Stroke } from 'ol/style';
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
  Sparkles,
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

// Memory cache for offscreen canvas feathered brush textures
const brushTextureCache = new Map<string, HTMLCanvasElement>();

/**
 * Creates an organic, feathered radial airbrush canvas texture.
 * Features a soft translucent halo that feathers to 0% opacity at the edge,
 * perfectly hugging the fire anomaly without harsh borders or covering unrelated land.
 */
function createThermalBrushCanvas(
  color: string,
  baseRadius: number,
  brushSize: number,
  isSelected: boolean
): HTMLCanvasElement {
  const scaledRadius = Math.round(baseRadius * (brushSize / 16));
  const featherPadding = Math.round(brushSize * 1.1);
  const totalRadius = scaledRadius + featherPadding;
  const canvasSize = totalRadius * 2;
  const cacheKey = `${color}_${scaledRadius}_${brushSize}_${isSelected}`;

  const cached = brushTextureCache.get(cacheKey);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const cx = totalRadius;
  const cy = totalRadius;

  // Multi-stop translucent radial airbrush gradient
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, totalRadius);
  if (color === '#ef4444') {
    // High confidence / Intense heat plume
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');       // White-hot core
    grad.addColorStop(0.12, 'rgba(254, 202, 202, 0.90)');     // Incandescent amber-red
    grad.addColorStop(0.28, 'rgba(239, 68, 68, 0.72)');       // Fiery scarlet red
    grad.addColorStop(0.55, 'rgba(249, 115, 22, 0.36)');      // Warm thermal plume
    grad.addColorStop(0.80, 'rgba(245, 158, 11, 0.12)');      // Feathered translucent edge
    grad.addColorStop(1.0, 'rgba(239, 68, 68, 0.0)');         // 100% transparent falloff
  } else if (color === '#f97316') {
    // Nominal confidence
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.94)');
    grad.addColorStop(0.14, 'rgba(254, 215, 170, 0.85)');
    grad.addColorStop(0.32, 'rgba(249, 115, 22, 0.65)');
    grad.addColorStop(0.60, 'rgba(245, 158, 11, 0.28)');
    grad.addColorStop(0.82, 'rgba(234, 179, 8, 0.08)');
    grad.addColorStop(1.0, 'rgba(249, 115, 22, 0.0)');
  } else {
    // Low confidence / cooler thermal anomaly
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.90)');
    grad.addColorStop(0.18, 'rgba(254, 240, 138, 0.78)');
    grad.addColorStop(0.40, 'rgba(234, 179, 8, 0.52)');
    grad.addColorStop(0.70, 'rgba(234, 179, 8, 0.16)');
    grad.addColorStop(1.0, 'rgba(234, 179, 8, 0.0)');
  }

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, totalRadius, 0, Math.PI * 2);
  ctx.fill();

  // Subtle luminous micro-ember at the epicenter
  ctx.beginPath();
  ctx.arc(cx, cy, isSelected ? 3.5 : 2.2, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;
  ctx.fill();

  // Tactical accent ring only if currently selected
  if (isSelected) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(cx, cy, scaledRadius + 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  brushTextureCache.set(cacheKey, canvas);
  return canvas;
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
  const [brushSize, setBrushSize] = useState<number>(16);
  const [brushMode, setBrushMode] = useState<'dual' | 'brush' | 'heatmap'>('dual');
  const [hoveredHotspot, setHoveredHotspot] = useState<HotspotRecord | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<OLMap | null>(null);
  const satLayerRef = useRef<TileLayer | null>(null);
  const hotspotVectorSourceRef = useRef<VectorSource | null>(null);
  const hotspotVectorLayerRef = useRef<VectorLayer | null>(null);
  const heatmapLayerRef = useRef<Heatmap | null>(null);

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

    // 1. Satellite Base Tile Layer (ESRI World Imagery with CORS enabled)
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

    // 2. Shared Vector Source for Hotspots
    const hotspotSource = new VectorSource();
    hotspotVectorSourceRef.current = hotspotSource;

    // 3. Fluid Atmospheric Thermal Heatmap Layer (Soft Feathered Heat Smudge)
    const heatmapLayer = new Heatmap({
      source: hotspotSource,
      blur: Math.round(brushSize * 1.2),
      radius: Math.round(brushSize * 0.95),
      opacity: brushMode === 'brush' ? 0 : 0.78,
      visible: brushMode !== 'brush',
      zIndex: 10,
      gradient: [
        'rgba(0, 0, 0, 0)',
        'rgba(245, 158, 11, 0.22)',
        'rgba(249, 115, 22, 0.58)',
        'rgba(239, 68, 68, 0.82)',
        'rgba(255, 255, 255, 0.96)',
      ],
      weight: (feature) => {
        const rawH = feature.get('hotspotData') as HotspotRecord | undefined;
        const frp = rawH?.frpMw || 5;
        const conf = rawH?.confidenceLevel || 'nominal';
        const confMult = conf === 'high' ? 1.0 : conf === 'nominal' ? 0.75 : 0.45;
        return Math.min(1.0, Math.max(0.2, (Math.sqrt(frp) / 12) * confMult));
      },
    });
    heatmapLayerRef.current = heatmapLayer;

    // 4. Feathered Radial Brush Vector Layer (Direct Organic Brush Smudge on Anomaly Points)
    const hotspotVectorLayer = new VectorLayer({
      source: hotspotSource,
      zIndex: 15,
      visible: brushMode !== 'heatmap',
      style: (feature) => {
        const rawH = feature.get('hotspotData') as HotspotRecord | undefined;
        const conf = rawH?.confidenceLevel || 'nominal';
        const frp = rawH?.frpMw || 5;
        const isSelected = selectedHotspot && rawH && selectedHotspot.id === rawH.id;

        const baseColor =
          conf === 'high' ? '#ef4444' : conf === 'nominal' ? '#f97316' : '#eab308';
        const baseRadius = Math.max(6, Math.min(22, 6 + Math.sqrt(frp) * 1.6));
        const canvas = createThermalBrushCanvas(baseColor, baseRadius, brushSize, !!isSelected);

        return new Style({
          image: new Icon({
            img: canvas,
            anchor: [0.5, 0.5],
            opacity: isSelected ? 1.0 : 0.92,
          }),
          text:
            isSelected && frp >= 15
              ? new Text({
                  text: `${Math.round(frp)} MW`,
                  font: 'bold 10px monospace',
                  fill: new Fill({ color: '#ffffff' }),
                  stroke: new Stroke({ color: '#000000', width: 2.5 }),
                  offsetY: -baseRadius - 12,
                })
              : undefined,
        });
      },
    });
    hotspotVectorLayerRef.current = hotspotVectorLayer;

    // 5. Build OpenLayers Map Instance
    const map = new OLMap({
      target: mapContainerRef.current,
      layers: [satLayer, heatmapLayer, hotspotVectorLayer],
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

  // Sync hotspots into vector source
  useEffect(() => {
    const source = hotspotVectorSourceRef.current;
    if (!source) return;
    source.clear();

    hotspots.forEach((h) => {
      const feature = new Feature({
        geometry: new Point(fromLonLat([h.longitude, h.latitude])),
        hotspotData: h,
        name: `Hotspot ${h.instrument} (${h.confidenceLevel.toUpperCase()})`,
      });
      source.addFeature(feature);
    });

    if (hotspots.length > 0 && mapInstanceRef.current) {
      const extent = source.getExtent();
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
      zoom: Math.max(view.getZoom() || 10, 12),
      duration: 600,
    });
    hotspotVectorLayerRef.current?.changed();
  }, [selectedHotspot]);

  // Sync opacity
  useEffect(() => {
    if (satLayerRef.current) {
      satLayerRef.current.setOpacity(opacity);
    }
  }, [opacity]);

  // Sync brush size & mode
  useEffect(() => {
    if (heatmapLayerRef.current) {
      heatmapLayerRef.current.setBlur(Math.round(brushSize * 1.2));
      heatmapLayerRef.current.setRadius(Math.round(brushSize * 0.95));
      heatmapLayerRef.current.setVisible(brushMode !== 'brush');
    }
    if (hotspotVectorLayerRef.current) {
      hotspotVectorLayerRef.current.setVisible(brushMode !== 'heatmap');
      hotspotVectorLayerRef.current.changed();
    }
  }, [brushSize, brushMode]);

  const handleZoom = (delta: number) => {
    const view = mapInstanceRef.current?.getView();
    if (!view) return;
    view.animate({
      zoom: (view.getZoom() || 10) + delta,
      duration: 300,
    });
  };

  const handleFitToAOI = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.getView().animate({
      center: fromLonLat([centerLng, centerLat]),
      zoom: 10,
      duration: 500,
    });
  };

  const handleFitToHotspots = () => {
    const map = mapInstanceRef.current;
    const source = hotspotVectorSourceRef.current;
    if (!map || !source || source.getFeatures().length === 0) {
      handleFitToAOI();
      return;
    }
    const extent = source.getExtent();
    if (!extent || extent[0] === Infinity) {
      handleFitToAOI();
      return;
    }
    map.getView().fit(extent, {
      padding: [45, 45, 45, 45],
      maxZoom: 14,
      duration: 600,
    });
  };

  const activeFocusHotspot = hoveredHotspot || selectedHotspot;

  return (
    <div className="rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl overflow-hidden space-y-0">
      {/* Top Header */}
      <div className="p-3.5 bg-slate-950/85 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold font-mono tracking-wide flex items-center gap-2 text-slate-100">
              PETA DETEKSI TITIK PANAS SATELIT
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {hotspots.length} Deteksi Aktif
              </span>
            </h4>
            <p className="text-[11px] text-slate-400 font-mono">
              Sapuan kuas termal anomali panas VIIRS 375m &amp; MODIS 1km di atas citra satelit resolusi tinggi.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Brush Mode Selector */}
          <div className="flex items-center p-0.5 bg-slate-900 border border-slate-800 rounded-xl text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setBrushMode('dual')}
              className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                brushMode === 'dual'
                  ? 'bg-rose-500/25 text-rose-300 font-bold border border-rose-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Kombinasi sapuan kuas lembut dan peta panas termal"
            >
              <Sparkles className="w-3 h-3" />
              <span>Dual Kuas</span>
            </button>
            <button
              type="button"
              onClick={() => setBrushMode('brush')}
              className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                brushMode === 'brush'
                  ? 'bg-rose-500/25 text-rose-300 font-bold border border-rose-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Sapuan kuas transparan hanya di sekitar titik terdampak"
            >
              <Paintbrush className="w-3 h-3" />
              <span>Kuas Halus</span>
            </button>
            <button
              type="button"
              onClick={() => setBrushMode('heatmap')}
              className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                brushMode === 'heatmap'
                  ? 'bg-rose-500/25 text-rose-300 font-bold border border-rose-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Peta panas termal kontinu"
            >
              <Flame className="w-3 h-3" />
              <span>Peta Panas</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleFitToHotspots}
            disabled={hotspots.length === 0}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Crosshair className="w-3.5 h-3.5 text-rose-400" />
            <span>Pusatkan ke Titik Panas</span>
          </button>
          <button
            type="button"
            onClick={handleFitToAOI}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-sky-400" />
            <span>Pusatkan ke Wilayah</span>
          </button>
        </div>
      </div>

      {/* Map Viewport */}
      <div className="relative w-full h-84 sm:h-96 bg-slate-950 overflow-hidden select-none">
        <div ref={mapContainerRef} className="w-full h-full block cursor-crosshair" />

        {/* Feathered Brush Thermal Legend */}
        <div className="absolute bottom-3 left-3 bg-slate-950/90 backdrop-blur-md border border-slate-800 px-3.5 py-2.5 rounded-2xl text-[10px] font-mono space-y-2 pointer-events-none z-20 shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <span className="font-bold text-slate-200 tracking-wider flex items-center gap-1.5">
              <Paintbrush className="w-3 h-3 text-rose-400" />
              Sapuan Kuas Anomali Termal
            </span>
            <span className="text-[9px] text-slate-500">NRT Satelit</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-rose-400">
              <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                <span className="absolute inline-flex h-full w-full rounded-full bg-rose-500/40 blur-[1px]"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
              </span>
              <span>Tinggi (≥80%)</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-400">
              <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                <span className="absolute inline-flex h-full w-full rounded-full bg-amber-500/40 blur-[1px]"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
              </span>
              <span>Nominal (30-79%)</span>
            </div>
            <div className="flex items-center gap-1.5 text-yellow-400">
              <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                <span className="absolute inline-flex h-full w-full rounded-full bg-yellow-500/40 blur-[1px]"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
              </span>
              <span>Rendah (&lt;30%)</span>
            </div>
          </div>
        </div>

        {/* Floating Zoom & Center Buttons */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 bg-slate-900/85 backdrop-blur-md border border-slate-800 p-1 rounded-xl shadow-xl z-20">
          <button
            type="button"
            onClick={() => handleZoom(1)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Perbesar Peta"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleZoom(-1)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Perkecil Peta"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleFitToHotspots}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Pusatkan ke Sebaran Titik Panas"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Hotspot Telemetry Popup */}
        {activeFocusHotspot && (
          <div className="absolute top-3 left-3 bg-slate-950/95 backdrop-blur-md border border-rose-500/40 p-3 rounded-2xl shadow-2xl z-20 font-mono text-[11px] space-y-1.5 max-w-xs animate-fadeIn">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <span className="font-bold text-rose-400 flex items-center gap-1">
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
                {activeFocusHotspot.confidenceLevel}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-slate-300">
              <div>
                <span className="text-slate-500">Suhu: </span>
                <strong className="text-rose-400">{activeFocusHotspot.brightnessKelvin} K</strong>
              </div>
              <div>
                <span className="text-slate-500">FRP: </span>
                <strong>{activeFocusHotspot.frpMw != null ? `${activeFocusHotspot.frpMw} MW` : '—'}</strong>
              </div>
              <div>
                <span className="text-slate-500">Waktu: </span>
                <span>{activeFocusHotspot.acqTimeUtc}</span>
              </div>
              <div>
                <span className="text-slate-500">Tanggal: </span>
                <span>{activeFocusHotspot.acqDate}</span>
              </div>
            </div>
            <div className="text-[9.5px] text-slate-400 pt-0.5 border-t border-slate-800/80">
              Koordinat: {activeFocusHotspot.latitude.toFixed(4)}°, {activeFocusHotspot.longitude.toFixed(4)}°
            </div>
          </div>
        )}

        {/* Tactical Status Tag */}
        <div className="absolute bottom-3 right-3 bg-slate-950/85 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-xl text-[10px] font-mono text-slate-400 pointer-events-none z-20">
          <span>Observasi: {regionName} • {hotspots.length} Titik Anomali</span>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Brush Size Slider */}
          <div className="flex items-center gap-2 text-slate-400">
            <Paintbrush className="w-3.5 h-3.5 text-rose-400" />
            <span>Ukuran Kuas:</span>
            <input
              type="range"
              min="10"
              max="28"
              step="2"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
              className="w-20 accent-rose-500 cursor-pointer"
            />
            <span className="text-white font-bold">{brushSize}px</span>
          </div>

          {/* Opacity Slider */}
          <div className="flex items-center gap-2 text-slate-400">
            <Sliders className="w-3.5 h-3.5" />
            <span>Opasitas Citra:</span>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.05"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-20 accent-rose-500 cursor-pointer"
            />
            <span className="text-white font-bold">{Math.round(opacity * 100)}%</span>
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
