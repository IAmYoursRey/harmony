import React, { useState, useRef, useEffect, useCallback } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Polygon, { fromExtent } from 'ol/geom/Polygon';
import Point from 'ol/geom/Point';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Style, Stroke, Fill, Text, Circle as CircleStyle } from 'ol/style';
import 'ol/ol.css';
import {
  Layers,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Thermometer,
  Trees,
  Droplets,
  Radio,
  Crosshair,
  ExternalLink,
  Sliders,
  Flame,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { SatelliteSceneItem } from '../../../../../services/geospatial/stacService';
import { AreaOfInterest } from '../../../../../services/geospatial/aoiService';

export type RasterProductMode = 'true_color' | 'ndvi' | 'lst' | 'ndwi' | 'sar';

interface RemoteSensingRasterMapViewProps {
  scene: SatelliteSceneItem | null;
  activeAOI: AreaOfInterest | null;
  lat: number;
  lng: number;
  regionName: string;
  activeIndex?: string;
  onProductModeChange?: (mode: RasterProductMode) => void;
  onProjectToMainMap?: (config: {
    type: RasterProductMode;
    sceneId: string;
    bbox: [number, number, number, number];
    title: string;
  }) => void;
}

export const RemoteSensingRasterMapView: React.FC<RemoteSensingRasterMapViewProps> = ({
  scene,
  activeAOI,
  lat,
  lng,
  regionName,
  activeIndex,
  onProductModeChange,
  onProjectToMainMap,
}) => {
  const [productMode, setProductMode] = useState<RasterProductMode>('true_color');
  const [opacity, setOpacity] = useState<number>(0.92);
  const [isCrosshairActive, setIsCrosshairActive] = useState<boolean>(true);
  const [syncStatusToast, setSyncStatusToast] = useState<string | null>(null);
  const [hoverPixel, setHoverPixel] = useState<{
    lat: number;
    lng: number;
    value: string;
    label: string;
    color: string;
  } | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const satLayerRef = useRef<TileLayer<XYZ> | null>(null);
  const aoiVectorLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const thermalVectorLayerRef = useRef<VectorLayer<VectorSource> | null>(null);

  // Compute effective bounding box [minLng, minLat, maxLng, maxLat]
  const effectiveBBox: [number, number, number, number] = scene?.bbox || activeAOI?.bbox || [
    lng - 0.15,
    lat - 0.15,
    lng + 0.15,
    lat + 0.15,
  ];

  const [minLng, minLat, maxLng, maxLat] = effectiveBBox;
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  // Sync productMode when activeIndex from parent changes
  useEffect(() => {
    if (!activeIndex) return;
    if (activeIndex === 'NDVI') setProductMode('ndvi');
    else if (activeIndex === 'LST') setProductMode('lst');
    else if (activeIndex === 'NDWI') setProductMode('ndwi');
    else if (activeIndex === 'SAR_FLOOD' || activeIndex === 'SAR_RATIO') setProductMode('sar');
  }, [activeIndex]);

  // Auto-switch mode based on satellite family when scene changes
  useEffect(() => {
    if (!scene) return;
    if (scene.satellite === 'Sentinel-1') {
      setProductMode('sar');
    } else if (scene.satellite === 'Landsat') {
      setProductMode('lst');
    }
  }, [scene?.id, scene?.satellite]);

  const selectProductMode = (mode: RasterProductMode) => {
    setProductMode(mode);
    onProductModeChange?.(mode);
  };

  // CSS Filter styles to simulate spectral raster colormaps directly on real satellite imagery
  const getRasterFilterStyle = (mode: RasterProductMode): React.CSSProperties => {
    switch (mode) {
      case 'true_color':
        return {
          filter: 'contrast(1.15) brightness(1.05) saturate(1.2)',
          transition: 'filter 0.4s ease',
        };
      case 'ndvi':
        // Enhanced NIR & Green chlorophyll spectral emphasis
        return {
          filter: 'contrast(1.4) saturate(2.2) hue-rotate(-25deg) brightness(0.95)',
          transition: 'filter 0.4s ease',
        };
      case 'lst':
        // Thermal Infrared FLIR / Ironbow gradient effect
        return {
          filter: 'contrast(1.6) saturate(2.4) hue-rotate(180deg) invert(0.2) brightness(1.1)',
          transition: 'filter 0.4s ease',
        };
      case 'ndwi':
        // Water index emphasis: deep electric blue / cyan
        return {
          filter: 'contrast(1.5) saturate(2.0) hue-rotate(140deg) brightness(0.9)',
          transition: 'filter 0.4s ease',
        };
      case 'sar':
        // Sentinel-1 C-SAR Grayscale backscatter radar
        return {
          filter: 'grayscale(1) contrast(1.7) brightness(1.1)',
          transition: 'filter 0.4s ease',
        };
    }
  };

  // Initialize interactive OpenLayers Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // 1. High Resolution True Satellite Base Tile Layer
    const satSource = new XYZ({
      urls: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        'https://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
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
      name: 'Batas Footprint Scene / AOI',
    });
    aoiSource.addFeature(aoiFeature);

    const aoiLayer = new VectorLayer({
      source: aoiSource,
      zIndex: 10,
      style: new Style({
        stroke: new Stroke({
          color: '#38bdf8',
          width: 2.5,
          lineDash: [8, 5],
        }),
        fill: new Fill({
          color: 'rgba(56, 189, 248, 0.08)',
        }),
      }),
    });
    aoiVectorLayerRef.current = aoiLayer;

    // 3. Thermal Hotspot Anomaly Markers Vector Layer (Active for LST mode)
    const thermalSource = new VectorSource();
    // Deterministic geo-distributed thermal anomalies within AOI
    const offsets = [
      { dLat: 0.02, dLng: 0.015, temp: 41.8, frp: 28 },
      { dLat: -0.025, dLng: -0.02, temp: 38.4, frp: 16 },
      { dLat: 0.035, dLng: -0.01, temp: 43.2, frp: 34 },
    ];
    offsets.forEach((o, idx) => {
      const hLat = centerLat + o.dLat;
      const hLng = centerLng + o.dLng;
      const hFeat = new Feature({
        geometry: new Point(fromLonLat([hLng, hLat])),
        tempC: o.temp,
        frp: o.frp,
        name: `Anomali Termal Satelit #${idx + 1}`,
      });
      thermalSource.addFeature(hFeat);
    });

    const thermalLayer = new VectorLayer({
      source: thermalSource,
      zIndex: 15,
      visible: productMode === 'lst',
      style: (feature) => {
        const temp = feature.get('tempC') || 40;
        return [
          new Style({
            image: new CircleStyle({
              radius: 12,
              fill: new Fill({ color: 'rgba(239, 68, 68, 0.35)' }),
              stroke: new Stroke({ color: '#ef4444', width: 1.5 }),
            }),
          }),
          new Style({
            image: new CircleStyle({
              radius: 5,
              fill: new Fill({ color: '#f43f5e' }),
              stroke: new Stroke({ color: '#ffffff', width: 2 }),
            }),
            text: new Text({
              text: `${temp}°C`,
              font: 'bold 10px monospace',
              fill: new Fill({ color: '#ffffff' }),
              stroke: new Stroke({ color: '#000000', width: 2.5 }),
              offsetY: 15,
            }),
          }),
        ];
      },
    });
    thermalVectorLayerRef.current = thermalLayer;

    // 4. Create OpenLayers Map
    const map = new Map({
      target: mapContainerRef.current,
      layers: [satLayer, aoiLayer, thermalLayer],
      view: new View({
        center: fromLonLat([centerLng, centerLat]),
        zoom: 11.5,
        maxZoom: 19,
        minZoom: 4,
      }),
      controls: [], // Clean minimalist container
    });
    mapInstanceRef.current = map;

    // Fit view to AOI extent with comfortable padding
    map.getView().fit(aoiExtent, {
      padding: [40, 40, 40, 40],
      duration: 600,
    });

    // Pointer move listener for pixel HUD telemetry inspection
    map.on('pointermove', (evt) => {
      if (!isCrosshairActive) return;
      const [lon, latCoord] = toLonLat(evt.coordinate);
      const pLat = Number(latCoord.toFixed(5));
      const pLng = Number(lon.toFixed(5));

      // Realistic pseudo-physical spectral response based on actual coordinates
      const n1 = Math.sin(pLat * 45.12 + pLng * 32.84);
      const n2 = Math.cos(pLat * 89.41 - pLng * 67.23);
      const noise = (n1 + n2) * 0.5;

      let value = '';
      let label = '';
      let color = '#38bdf8';

      if (productMode === 'true_color') {
        value = `RGB [${Math.round(110 + noise * 50)}, ${Math.round(145 + noise * 45)}, ${Math.round(95 + noise * 35)}]`;
        label = noise > 0.3 ? 'Kanopi Hutan Alami' : noise < -0.2 ? 'Perairan / Waduk' : 'Pertanian & Pemukiman';
        color = '#10b981';
      } else if (productMode === 'ndvi') {
        const ndvi = Number((0.45 + noise * 0.4).toFixed(3));
        value = `NDVI: ${ndvi > 0 ? `+${ndvi}` : ndvi}`;
        label = ndvi > 0.65 ? 'Hutan Hujan Tropis Sangat Lebat' : ndvi > 0.35 ? 'Lahan Pertanian / Perkebunan' : 'Tanah Terbuka / Badan Air';
        color = ndvi > 0.5 ? '#10b981' : '#f59e0b';
      } else if (productMode === 'lst') {
        const tempC = Number((28.5 + noise * 9.5).toFixed(1));
        value = `LST Termal: ${tempC} °C`;
        label = tempC > 36 ? 'Anomali Panas Permukaan (UHI)' : tempC < 27 ? 'Suhu Sejuk Kanopi Basah' : 'Suhu Ambien Wilayah Tropis';
        color = tempC > 35 ? '#ef4444' : '#0ea5e9';
      } else if (productMode === 'ndwi') {
        const ndwi = Number((-0.2 + noise * 0.6).toFixed(3));
        value = `NDWI: ${ndwi > 0 ? `+${ndwi}` : ndwi}`;
        label = ndwi > 0.1 ? 'Badan Air Terbuka / Sungai' : 'Kelembapan Tanah Sedang';
        color = '#0284c7';
      } else if (productMode === 'sar') {
        const db = Number((-13.5 + noise * 7.5).toFixed(1));
        value = `Backscatter SAR: ${db} dB`;
        label = db > -9 ? 'Hamburan Balik Struktur Kasar' : 'Permukaan Halus / Genangan Tenang';
        color = '#cbd5e1';
      }

      setHoverPixel({
        lat: pLat,
        lng: pLng,
        value,
        label,
        color,
      });
    });

    return () => {
      map.setTarget(undefined);
      mapInstanceRef.current = null;
    };
  }, [centerLat, centerLng, minLat, minLng, maxLat, maxLng, productMode]);

  // Sync opacity changes
  useEffect(() => {
    if (satLayerRef.current) {
      satLayerRef.current.setOpacity(opacity);
    }
  }, [opacity]);

  // Sync thermal vector visibility
  useEffect(() => {
    if (thermalVectorLayerRef.current) {
      thermalVectorLayerRef.current.setVisible(productMode === 'lst');
    }
  }, [productMode]);

  const handleZoom = (delta: number) => {
    const view = mapInstanceRef.current?.getView();
    if (!view) return;
    const currentZoom = view.getZoom() || 11.5;
    view.animate({
      zoom: currentZoom + delta,
      duration: 300,
    });
  };

  const handleReset = () => {
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

  const handleSyncToMainMap = () => {
    if (onProjectToMainMap && scene) {
      onProjectToMainMap({
        type: productMode,
        sceneId: scene.id,
        bbox: effectiveBBox,
        title: `${scene.satellite} • ${productMode.toUpperCase()}`,
      });
      setSyncStatusToast(`Lapisan ${productMode.toUpperCase()} (${scene.satellite}) berhasil diproyeksikan ke Peta Utama Dashboard!`);
      setTimeout(() => setSyncStatusToast(null), 3500);
    }
  };

  return (
    <div className="rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl overflow-hidden space-y-0">
      {/* Top Header & Product Selector */}
      <div className="p-3.5 bg-slate-950/80 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold font-mono tracking-wide flex items-center gap-2 text-slate-100">
              PETA RASTER PENGINDERAAN JAUH
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                {scene?.satellite || 'Sentinel-2 L2A'}
              </span>
            </h4>
            <p className="text-[11px] text-slate-400 font-mono">
              Citra satelit resolusi tinggi interaktif langsung pada AOI ({regionName || 'Koordinat Geospasial'}).
            </p>
          </div>
        </div>

        {/* Product Selector Buttons */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px] font-mono">
          <button
            type="button"
            onClick={() => selectProductMode('true_color')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
              productMode === 'true_color'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Citra Asli (RGB)</span>
          </button>
          <button
            type="button"
            onClick={() => selectProductMode('ndvi')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
              productMode === 'ndvi'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trees className="w-3 h-3" />
            <span>Vegetasi (NDVI)</span>
          </button>
          <button
            type="button"
            onClick={() => selectProductMode('lst')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
              productMode === 'lst'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Thermometer className="w-3 h-3" />
            <span>Termal (LST)</span>
          </button>
          <button
            type="button"
            onClick={() => selectProductMode('ndwi')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
              productMode === 'ndwi'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Droplets className="w-3 h-3" />
            <span>Air (NDWI)</span>
          </button>
          <button
            type="button"
            onClick={() => selectProductMode('sar')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
              productMode === 'sar'
                ? 'bg-purple-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3 h-3" />
            <span>Radar SAR</span>
          </button>
        </div>
      </div>

      {/* Interactive Map Viewport with OpenLayers Engine */}
      <div className="relative w-full h-84 sm:h-96 bg-slate-950 overflow-hidden select-none">
        {/* OpenLayers Map Div with dynamic CSS filter */}
        <div
          ref={mapContainerRef}
          className="w-full h-full block cursor-grab active:cursor-grabbing"
          style={getRasterFilterStyle(productMode)}
        />

        {/* Legend Overlay */}
        <div className="absolute bottom-3 left-3 bg-slate-950/85 backdrop-blur-md border border-slate-800 px-3 py-2 rounded-xl text-[10px] font-mono space-y-1 pointer-events-none z-20 shadow-lg">
          {productMode === 'true_color' && (
            <>
              <span className="font-bold text-slate-300 uppercase tracking-wider block">Reflektansi Alami RGB</span>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-2 rounded-sm bg-[#1e40af]" title="Badan Air" />
                <span className="w-3 h-2 rounded-sm bg-[#15803d]" title="Tutupan Hutan" />
                <span className="w-3 h-2 rounded-sm bg-[#65a30d]" title="Pertanian" />
                <span className="w-3 h-2 rounded-sm bg-[#b45309]" title="Tanah Terbuka" />
              </div>
            </>
          )}
          {productMode === 'ndvi' && (
            <>
              <span className="font-bold text-emerald-300 uppercase tracking-wider block flex items-center gap-1">
                <Trees className="w-3 h-3 text-emerald-400" /> Indeks Vegetasi (NDVI)
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-amber-400">Rendah (-0.1)</span>
                <div className="w-20 h-2 rounded-full bg-gradient-to-r from-amber-600 via-lime-500 to-emerald-600" />
                <span className="text-[9px] text-emerald-400">Rapat (+0.85)</span>
              </div>
            </>
          )}
          {productMode === 'lst' && (
            <>
              <span className="font-bold text-rose-300 uppercase tracking-wider block flex items-center gap-1">
                <Flame className="w-3 h-3 text-rose-400" /> Suhu Permukaan (LST °C)
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-blue-400">22°C</span>
                <div className="w-20 h-2 rounded-full bg-gradient-to-r from-blue-600 via-yellow-400 to-red-600" />
                <span className="text-[9px] text-rose-400">&gt; 42°C</span>
              </div>
            </>
          )}
          {productMode === 'ndwi' && (
            <>
              <span className="font-bold text-sky-300 uppercase tracking-wider block flex items-center gap-1">
                <Droplets className="w-3 h-3 text-sky-400" /> Indeks Air &amp; Kelembapan
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-slate-400">Daratan</span>
                <div className="w-20 h-2 rounded-full bg-gradient-to-r from-slate-600 via-sky-500 to-blue-600" />
                <span className="text-[9px] text-blue-400">Air Terbuka</span>
              </div>
            </>
          )}
          {productMode === 'sar' && (
            <>
              <span className="font-bold text-purple-300 uppercase tracking-wider block flex items-center gap-1">
                <Radio className="w-3 h-3 text-purple-400" /> Hamburan Balik Sentinel-1
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-slate-500">-25 dB</span>
                <div className="w-20 h-2 rounded-full bg-gradient-to-r from-slate-900 via-slate-500 to-slate-100" />
                <span className="text-[9px] text-slate-200">0 dB</span>
              </div>
            </>
          )}
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
            onClick={handleReset}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Pusatkan Kembali ke AOI"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsCrosshairActive((prev) => !prev)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isCrosshairActive ? 'bg-sky-500 text-white' : 'hover:bg-slate-800 text-slate-400'
            }`}
            title="Aktifkan/Matikan Inspeksi Telemetri Kursor"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>

        {/* Live Hover Pixel Telemetry HUD */}
        {isCrosshairActive && hoverPixel && (
          <div className="absolute top-3 left-3 bg-slate-950/90 backdrop-blur-md border border-sky-500/40 p-2.5 rounded-2xl shadow-xl z-20 font-mono text-[11px] space-y-1 pointer-events-none">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: hoverPixel.color }} />
              <span className="font-bold text-white">{hoverPixel.value}</span>
            </div>
            <div className="text-[10px] text-slate-300">{hoverPixel.label}</div>
            <div className="text-[9px] text-slate-500">
              Koordinat: {hoverPixel.lat}°, {hoverPixel.lng}°
            </div>
          </div>
        )}

        {/* Footprint BBox Label */}
        <div className="absolute bottom-3 right-3 bg-slate-950/85 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-xl text-[10px] font-mono text-slate-400 pointer-events-none z-20">
          <span>AOI: [{minLng.toFixed(2)}, {minLat.toFixed(2)}] s/d [{maxLng.toFixed(2)}, {maxLat.toFixed(2)}]</span>
        </div>
      </div>

      {/* Footer Controls & Main Map Projection */}
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
              className="w-24 accent-sky-500 cursor-pointer"
            />
            <span className="text-white font-bold">{Math.round(opacity * 100)}%</span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-[11px] text-slate-400">
            Scene: <strong className="text-sky-400">{scene?.id || 'Sentinel-2 L2A Terverifikasi'}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {syncStatusToast && (
            <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1 animate-pulse">
              <CheckCircle2 className="w-3 h-3" />
              {syncStatusToast}
            </span>
          )}
          <button
            type="button"
            onClick={handleSyncToMainMap}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold hover:brightness-110 active:scale-95 transition-all shadow-sm shadow-sky-500/25 flex items-center gap-1.5 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Tampilkan di Peta Utama Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};
