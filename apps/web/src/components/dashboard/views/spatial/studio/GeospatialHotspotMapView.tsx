import React, { useState, useRef, useEffect } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import { fromExtent } from 'ol/geom/Polygon';
import Point from 'ol/geom/Point';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Style, Stroke, Fill, Circle as CircleStyle, Text } from 'ol/style';
import 'ol/ol.css';
import {
  Flame,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sliders,
  Crosshair,
  MapPin,
  ExternalLink,
  CheckCircle2,
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
  const [hoveredHotspot, setHoveredHotspot] = useState<HotspotRecord | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const satLayerRef = useRef<TileLayer<XYZ> | null>(null);
  const hotspotVectorSourceRef = useRef<VectorSource | null>(null);
  const hotspotVectorLayerRef = useRef<VectorLayer<VectorSource> | null>(null);

  // Compute effective bounding box for visualization
  const computedBBox: [number, number, number, number] = effectiveBBox || activeAOI?.bbox || [
    lng - 0.25,
    lat - 0.25,
    lng + 0.25,
    lat + 0.25,
  ];
  const [minLng, minLat, maxLng, maxLat] = computedBBox;
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // 1. High Resolution True Satellite Base Tile Layer (ESRI World Imagery with CORS enabled)
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

    // 2. AOI Bounding Box Vector Layer
    const aoiSource = new VectorSource();
    const aoiExtent = [
      ...fromLonLat([minLng, minLat]),
      ...fromLonLat([maxLng, maxLat]),
    ];
    const aoiGeom = fromExtent(aoiExtent);
    const aoiFeature = new Feature({
      geometry: aoiGeom,
      name: 'Batas Wilayah Fokus / AOI',
    });
    aoiSource.addFeature(aoiFeature);

    const aoiLayer = new VectorLayer({
      source: aoiSource,
      zIndex: 5,
      style: new Style({
        stroke: new Stroke({
          color: '#38bdf8',
          width: 2.2,
          lineDash: [6, 4],
        }),
        fill: new Fill({
          color: 'rgba(56, 189, 248, 0.08)',
        }),
      }),
    });

    // 3. Hotspot Points Vector Layer
    const hotspotSource = new VectorSource();
    hotspotVectorSourceRef.current = hotspotSource;

    const hotspotLayer = new VectorLayer({
      source: hotspotSource,
      zIndex: 15,
      style: (feature) => {
        const rawH = feature.get('hotspotData') as HotspotRecord | undefined;
        const conf = rawH?.confidenceLevel || 'nominal';
        const frp = rawH?.frpMw || 5;
        const isSelected = selectedHotspot && rawH && selectedHotspot.id === rawH.id;

        const baseColor =
          conf === 'high' ? '#ef4444' : conf === 'nominal' ? '#f97316' : '#eab308';
        const radius = Math.max(5, Math.min(16, 5 + Math.sqrt(frp) * 1.5));

        const styles = [
          // Outer halo
          new Style({
            image: new CircleStyle({
              radius: radius + (isSelected ? 7 : 4),
              fill: new Fill({
                color: conf === 'high' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(249, 115, 22, 0.3)',
              }),
              stroke: new Stroke({
                color: baseColor,
                width: isSelected ? 2.5 : 1.2,
              }),
            }),
          }),
          // Inner core
          new Style({
            image: new CircleStyle({
              radius: isSelected ? radius + 2 : radius,
              fill: new Fill({ color: baseColor }),
              stroke: new Stroke({ color: '#ffffff', width: isSelected ? 2.5 : 1.5 }),
            }),
            text:
              frp >= 25
                ? new Text({
                    text: `${Math.round(frp)} MW`,
                    font: 'bold 9px monospace',
                    fill: new Fill({ color: '#ffffff' }),
                    stroke: new Stroke({ color: '#000000', width: 2.5 }),
                    offsetY: -radius - 8,
                  })
                : undefined,
          }),
        ];

        return styles;
      },
    });
    hotspotVectorLayerRef.current = hotspotLayer;

    const map = new Map({
      target: mapContainerRef.current,
      layers: [satLayer, aoiLayer, hotspotLayer],
      view: new View({
        center: fromLonLat([centerLng, centerLat]),
        zoom: 9.5,
        maxZoom: 19,
        minZoom: 4,
      }),
      controls: [],
    });
    mapInstanceRef.current = map;

    // Pointer move listener for hover tooltip
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

    // Click listener to select hotspot
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
  }, [centerLat, centerLng, minLat, minLng, maxLat, maxLng]);

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
      if (extent && isFinite(extent[0]) && isFinite(extent[1]) && isFinite(extent[2]) && isFinite(extent[3])) {
        mapInstanceRef.current.getView().fit(extent, {
          padding: [50, 50, 50, 50],
          maxZoom: 13,
          duration: 600,
        });
      }
    }
  }, [hotspots]);

  // Sync selected hotspot center
  useEffect(() => {
    if (!selectedHotspot || !mapInstanceRef.current) return;
    const view = mapInstanceRef.current.getView();
    view.animate({
      center: fromLonLat([selectedHotspot.longitude, selectedHotspot.latitude]),
      zoom: Math.max(view.getZoom() || 10, 12),
      duration: 600,
    });
  }, [selectedHotspot]);

  // Sync opacity
  useEffect(() => {
    if (satLayerRef.current) {
      satLayerRef.current.setOpacity(opacity);
    }
  }, [opacity]);

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
    const aoiExtent = [
      ...fromLonLat([minLng, minLat]),
      ...fromLonLat([maxLng, maxLat]),
    ];
    map.getView().fit(aoiExtent, {
      padding: [40, 40, 40, 40],
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
      <div className="p-3.5 bg-slate-950/80 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
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
              Sebaran koordinat anomali termal VIIRS (375m) &amp; MODIS (1km) di atas citra satelit resolusi tinggi.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
            <span>Pusatkan ke AOI</span>
          </button>
        </div>
      </div>

      {/* Map Viewport */}
      <div className="relative w-full h-84 sm:h-96 bg-slate-950 overflow-hidden select-none">
        <div ref={mapContainerRef} className="w-full h-full block cursor-crosshair" />

        {/* Legend */}
        <div className="absolute bottom-3 left-3 bg-slate-950/85 backdrop-blur-md border border-slate-800 px-3 py-2 rounded-xl text-[10px] font-mono space-y-1.5 pointer-events-none z-20 shadow-lg">
          <span className="font-bold text-slate-300 uppercase tracking-wider block">
            Tingkat Keyakinan (Confidence)
          </span>
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-1 text-rose-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500" /> Tinggi (&ge;80%)
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Nominal (30-79%)
            </span>
            <span className="flex items-center gap-1 text-yellow-400">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" /> Rendah (&lt;30%)
            </span>
          </div>
        </div>

        {/* Tactical Map Floating Controls */}
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

        {/* Footprint BBox Label */}
        <div className="absolute bottom-3 right-3 bg-slate-950/85 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-xl text-[10px] font-mono text-slate-400 pointer-events-none z-20">
          <span>AOI Fokus: {regionName} [{minLng.toFixed(2)}, {minLat.toFixed(2)}] s/d [{maxLng.toFixed(2)}, {maxLat.toFixed(2)}]</span>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-slate-400">
            <Sliders className="w-3.5 h-3.5" />
            <span>Opasitas Satelit:</span>
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
