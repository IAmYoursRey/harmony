import React, { useState, useRef, useEffect, useMemo } from 'react';
import OLMap from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Heatmap from 'ol/layer/Heatmap';
import Feature from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';
import Point from 'ol/geom/Point';
import { fromLonLat } from 'ol/proj';
import { Style, Text, Fill, Stroke, Circle as CircleStyle } from 'ol/style';
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
  Grid,
  Sparkles,
  Info,
  Radio,
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

/**
 * Constructs an exact geographic bounding polygon (in EPSG:3857 coordinates)
 * representing the real-world satellite ground sensor pixel footprint.
 * - VIIRS (Suomi-NPP, NOAA-20, NOAA-21): nominal 375m x 375m at nadir
 * - MODIS (Terra, Aqua): nominal 1000m x 1000m at nadir
 * Derived from NASA FIRMS scan and track telemetry parameters.
 */
function createSatelliteFootprintGeometry(h: HotspotRecord): Polygon {
  const [cx, cy] = fromLonLat([h.longitude, h.latitude]);
  const scanKm = h.scanKm ?? (h.instrument === 'VIIRS' ? 0.375 : 1.0);
  const trackKm = h.trackKm ?? (h.instrument === 'VIIRS' ? 0.375 : 1.0);
  const scanMeters = scanKm * 1000;
  const trackMeters = trackKm * 1000;
  const halfX = scanMeters / 2;
  const halfY = trackMeters / 2;

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
  const [renderMode, setRenderMode] = useState<'footprint' | 'dual' | 'heatmap'>('footprint');
  const [hoveredHotspot, setHoveredHotspot] = useState<HotspotRecord | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<OLMap | null>(null);
  const satLayerRef = useRef<TileLayer | null>(null);
  const footprintVectorSourceRef = useRef<VectorSource | null>(null);
  const footprintVectorLayerRef = useRef<VectorLayer | null>(null);
  const heatmapVectorSourceRef = useRef<VectorSource | null>(null);
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

    // 2. Heatmap Point Vector Source & Layer
    const heatmapSource = new VectorSource();
    heatmapVectorSourceRef.current = heatmapSource;

    const heatmapLayer = new Heatmap({
      source: heatmapSource,
      blur: 24,
      radius: 18,
      opacity: renderMode === 'footprint' ? 0 : 0.75,
      visible: renderMode !== 'footprint',
      zIndex: 10,
      gradient: [
        'rgba(0, 0, 0, 0)',
        'rgba(245, 158, 11, 0.25)',
        'rgba(249, 115, 22, 0.60)',
        'rgba(239, 68, 68, 0.85)',
        'rgba(255, 255, 255, 0.98)',
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

    // 3. Ground Footprint Polygon Vector Source & Layer (Real Ground Scale in Meters)
    const footprintSource = new VectorSource();
    footprintVectorSourceRef.current = footprintSource;

    const footprintVectorLayer = new VectorLayer({
      source: footprintSource,
      zIndex: 15,
      visible: renderMode !== 'heatmap',
      style: (feature, resolution) => {
        const rawH = feature.get('hotspotData') as HotspotRecord | undefined;
        if (!rawH) return undefined;
        const isSelected = selectedHotspot && selectedHotspot.id === rawH.id;
        const isHovered = hoveredHotspot && hoveredHotspot.id === rawH.id;
        const conf = rawH.confidenceLevel || 'nominal';

        const scanMeters = ((rawH.scanKm ?? (rawH.instrument === 'VIIRS' ? 0.375 : 1.0)) * 1000);
        const pixelWidth = scanMeters / resolution;

        const baseColor =
          conf === 'high' ? '#ef4444' : conf === 'nominal' ? '#f97316' : '#eab308';

        // Semi-transparent infrared fill covering the exact anomaly ground pixel
        const fillColor =
          conf === 'high'
            ? (isSelected ? 'rgba(239, 68, 68, 0.72)' : isHovered ? 'rgba(239, 68, 68, 0.58)' : 'rgba(239, 68, 68, 0.45)')
            : conf === 'nominal'
            ? (isSelected ? 'rgba(249, 115, 22, 0.65)' : isHovered ? 'rgba(249, 115, 22, 0.52)' : 'rgba(249, 115, 22, 0.40)')
            : (isSelected ? 'rgba(234, 179, 8, 0.60)' : isHovered ? 'rgba(234, 179, 8, 0.48)' : 'rgba(234, 179, 8, 0.35)');

        // Sharp sensor pixel grid border
        const strokeColor = isSelected
          ? '#ffffff'
          : isHovered
          ? '#ffffff'
          : conf === 'high'
          ? 'rgba(255, 255, 255, 0.80)'
          : 'rgba(255, 255, 255, 0.65)';
        const strokeWidth = isSelected ? 2.5 : isHovered ? 2.0 : 1.2;

        let textStyle: Text | undefined = undefined;
        if (pixelWidth >= 32 || isSelected) {
          const tempC = rawH.brightnessKelvin ? `${Math.round(rawH.brightnessKelvin - 273.15)}°C` : '';
          const frpText = rawH.frpMw ? `${Math.round(rawH.frpMw)}MW` : '';
          const label = [tempC, frpText].filter(Boolean).join(' • ');
          if (label) {
            textStyle = new Text({
              text: label,
              font: 'bold 10px monospace',
              fill: new Fill({ color: '#ffffff' }),
              stroke: new Stroke({ color: '#000000', width: 2.8 }),
              overflow: true,
            });
          }
        }

        const styles: Style[] = [
          new Style({
            fill: new Fill({ color: fillColor }),
            stroke: new Stroke({
              color: strokeColor,
              width: strokeWidth,
              lineDash: isSelected ? [5, 3] : undefined,
            }),
            text: textStyle,
          }),
        ];

        // When zoomed very far out (subpixel ground block), show a small 3.5px center indicator
        if (pixelWidth < 6) {
          styles.push(
            new Style({
              geometry: new Point(fromLonLat([rawH.longitude, rawH.latitude])),
              image: new CircleStyle({
                radius: Math.max(3, Math.min(5, 7 - pixelWidth)),
                fill: new Fill({ color: baseColor }),
                stroke: new Stroke({ color: '#ffffff', width: 1.2 }),
              }),
            })
          );
        }

        return styles;
      },
    });
    footprintVectorLayerRef.current = footprintVectorLayer;

    // 4. Build OpenLayers Map Instance
    const map = new OLMap({
      target: mapContainerRef.current,
      layers: [satLayer, heatmapLayer, footprintVectorLayer],
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

  // Sync hotspots into footprint vector source & heatmap source
  useEffect(() => {
    const footprintSource = footprintVectorSourceRef.current;
    const heatmapSource = heatmapVectorSourceRef.current;
    if (!footprintSource || !heatmapSource) return;

    footprintSource.clear();
    heatmapSource.clear();

    hotspots.forEach((h) => {
      // 1. Precise Real-World Ground Footprint Polygon
      const polygonGeom = createSatelliteFootprintGeometry(h);
      const polygonFeature = new Feature({
        geometry: polygonGeom,
        hotspotData: h,
        name: `Hotspot ${h.instrument} (${h.confidenceLevel.toUpperCase()})`,
      });
      footprintSource.addFeature(polygonFeature);

      // 2. Centroid Point Feature for Heatmap
      const pointFeature = new Feature({
        geometry: new Point(fromLonLat([h.longitude, h.latitude])),
        hotspotData: h,
      });
      heatmapSource.addFeature(pointFeature);
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

  // Sync render mode
  useEffect(() => {
    if (heatmapLayerRef.current) {
      heatmapLayerRef.current.setVisible(renderMode !== 'footprint');
      heatmapLayerRef.current.setOpacity(renderMode === 'footprint' ? 0 : 0.75);
    }
    if (footprintVectorLayerRef.current) {
      footprintVectorLayerRef.current.setVisible(renderMode !== 'heatmap');
      footprintVectorLayerRef.current.changed();
    }
  }, [renderMode]);

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
                  Skala Tanah Nyata Tetap
                </span>
              </h4>
            </div>
            <p className="text-[11px] text-slate-400">
              {regionName} • {hotspots.length} Deteksi Piksel Sensor Aktif
            </p>
          </div>
        </div>

        {/* Tactical Toolbar Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Render Mode Switch */}
          <div className="flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-xl text-[11px]">
            <button
              type="button"
              onClick={() => setRenderMode('footprint')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                renderMode === 'footprint'
                  ? 'bg-rose-500/25 text-rose-300 font-bold border border-rose-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Blok tanah nyata sesuai ukuran sensor satelit (375m VIIRS / 1km MODIS)"
            >
              <Grid className="w-3 h-3" />
              <span>Blok Sensor</span>
            </button>
            <button
              type="button"
              onClick={() => setRenderMode('dual')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                renderMode === 'dual'
                  ? 'bg-rose-500/25 text-rose-300 font-bold border border-rose-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Kombinasi blok sensor tanah nyata dan peta panas radiasi termal"
            >
              <Sparkles className="w-3 h-3" />
              <span>Blok + Peta Panas</span>
            </button>
            <button
              type="button"
              onClick={() => setRenderMode('heatmap')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                renderMode === 'heatmap'
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
              <Grid className="w-3 h-3 text-rose-400" />
              Blok Sensor Satelit (Resolusi Tanah Nyata)
            </span>
            <span className="text-[9px] text-emerald-400 font-bold">NASA NRT</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-rose-400">
              <span className="h-3 w-3 rounded-xs bg-rose-500/50 border border-white/80 inline-block shadow-xs" />
              <span>Tinggi (≥80%)</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-400">
              <span className="h-3 w-3 rounded-xs bg-amber-500/50 border border-white/80 inline-block shadow-xs" />
              <span>Nominal (30-79%)</span>
            </div>
            <div className="flex items-center gap-1.5 text-yellow-400">
              <span className="h-3 w-3 rounded-xs bg-yellow-500/50 border border-white/80 inline-block shadow-xs" />
              <span>Rendah (&lt;30%)</span>
            </div>
          </div>
          <div className="text-[9px] text-slate-400 pt-0.5 border-t border-slate-800/80">
            VIIRS I-band: 375m × 375m • MODIS: 1000m × 1000m
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
            <span>Live Stream Satelit NRT Aktif</span>
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
