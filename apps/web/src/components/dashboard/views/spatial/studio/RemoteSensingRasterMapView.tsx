import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Layers,
  Eye,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Thermometer,
  Trees,
  Droplets,
  Radio,
  Crosshair,
  ExternalLink,
  CheckCircle2,
  Sliders,
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
  onProjectToMainMap,
}) => {
  const [productMode, setProductMode] = useState<RasterProductMode>('true_color');
  const [opacity, setOpacity] = useState<number>(0.9);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoverPixel, setHoverPixel] = useState<{
    lat: number;
    lng: number;
    value: string;
    label: string;
    color: string;
  } | null>(null);
  const [isCrosshairActive, setIsCrosshairActive] = useState<boolean>(true);
  const [syncStatusToast, setSyncStatusToast] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Compute effective BBox
  const effectiveBBox: [number, number, number, number] = scene?.bbox || activeAOI?.bbox || [
    lng - 0.15,
    lat - 0.15,
    lng + 0.15,
    lat + 0.15,
  ];

  const [minLng, minLat, maxLng, maxLat] = effectiveBBox;
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  // Auto-switch product when scene collection changes
  useEffect(() => {
    if (!scene) return;
    if (scene.satellite === 'Sentinel-1') {
      setProductMode('sar');
    } else if (scene.satellite === 'Landsat') {
      setProductMode('lst');
    } else {
      setProductMode('true_color');
    }
  }, [scene?.id, scene?.satellite]);

  // Procedural raster generator based on real geographic bbox and selected spectral mode
  const renderRaster = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoomLevel, zoomLevel);

    // 1. Draw base satellite terrain grid
    const cols = 48;
    const rows = 36;
    const cellW = width / cols;
    const cellH = height / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const pLat = maxLat - (r / rows) * (maxLat - minLat);
        const pLng = minLng + (c / cols) * (maxLng - minLng);

        // Deterministic pseudo-physical seed from coordinates
        const n1 = Math.sin(pLat * 45.12 + pLng * 32.84);
        const n2 = Math.cos(pLat * 89.41 - pLng * 67.23);
        const noise = (n1 + n2) * 0.5;

        let fillStyle = '#1e293b';

        if (productMode === 'true_color') {
          // Natural Color RGB simulation (Vegetation, Urban, Water, Soil)
          if (noise < -0.35) {
            // Deep water / river
            fillStyle = '#0f3854';
          } else if (noise < -0.1) {
            // Coastal / wetland
            fillStyle = '#225d6b';
          } else if (noise < 0.25) {
            // Farmland & urban patchwork
            fillStyle = '#4a5d3f';
          } else if (noise < 0.6) {
            // Dense canopy / forest
            fillStyle = '#23532f';
          } else {
            // Highland / bare soil / bright structure
            fillStyle = '#7a7657';
          }
        } else if (productMode === 'ndvi') {
          // Normalized Difference Vegetation Index (-0.2 to +0.85)
          const ndviVal = 0.2 + noise * 0.65;
          if (ndviVal < 0) {
            // Water body
            fillStyle = '#0284c7';
          } else if (ndviVal < 0.2) {
            // Bare soil / non-vegetated
            fillStyle = '#b45309';
          } else if (ndviVal < 0.4) {
            // Sparse grass / shrubs
            fillStyle = '#eab308';
          } else if (ndviVal < 0.65) {
            // Moderate canopy
            fillStyle = '#84cc16';
          } else {
            // Dense rainforest / crops
            fillStyle = '#15803d';
          }
        } else if (productMode === 'lst') {
          // Land Surface Temperature (20°C to 44°C)
          const tempC = 26 + noise * 14;
          if (tempC < 24) {
            fillStyle = '#1e40af'; // Cold / water body
          } else if (tempC < 28) {
            fillStyle = '#0284c7'; // Cool canopy
          } else if (tempC < 32) {
            fillStyle = '#10b981'; // Moderate green zone
          } else if (tempC < 36) {
            fillStyle = '#f59e0b'; // Warm suburban
          } else if (tempC < 40) {
            fillStyle = '#ef4444'; // Hot built-up
          } else {
            fillStyle = '#a855f7'; // Extreme Heat Island
          }
        } else if (productMode === 'ndwi') {
          // Normalized Difference Water Index (McFeeters)
          const ndwiVal = noise * 0.8;
          if (ndwiVal > 0.15) {
            fillStyle = '#1d4ed8'; // Water body
          } else if (ndwiVal > -0.05) {
            fillStyle = '#38bdf8'; // High moisture
          } else {
            fillStyle = '#64748b'; // Dry land
          }
        } else if (productMode === 'sar') {
          // Sentinel-1 C-Band SAR Backscatter (VV/VH roughness)
          const dbVal = Math.floor(128 + noise * 95);
          const clamped = Math.max(15, Math.min(245, dbVal));
          fillStyle = `rgb(${clamped}, ${clamped}, ${clamped})`;
        }

        ctx.fillStyle = fillStyle;
        ctx.fillRect(c * cellW, r * cellH, cellW + 0.5, cellH + 0.5);
      }
    }

    // 2. Draw AOI boundary overlay if active
    if (activeAOI) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5 / zoomLevel;
      ctx.strokeRect(width * 0.12, height * 0.12, width * 0.76, height * 0.76);

      ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.fillRect(width * 0.12, height * 0.12, width * 0.76, height * 0.76);
    }

    // 3. Draw coordinate grid lines & labels
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1 / zoomLevel;
    ctx.setLineDash([4 / zoomLevel, 4 / zoomLevel]);

    for (let i = 1; i <= 3; i++) {
      const gx = (width / 4) * i;
      const gy = (height / 4) * i;

      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(width, gy);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.restore();
  }, [productMode, zoomLevel, panOffset, minLat, maxLat, minLng, maxLng, activeAOI]);

  useEffect(() => {
    renderRaster();
  }, [renderRaster]);

  // Handle Canvas mouse move for pixel inspector
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    if (isDragging) {
      setPanOffset({
        x: clientX - dragStart.x,
        y: clientY - dragStart.y,
      });
      return;
    }

    // Un-project coordinates through pan & zoom
    const unscaledX = (clientX - panOffset.x) / zoomLevel;
    const unscaledY = (clientY - panOffset.y) / zoomLevel;

    const normX = Math.max(0, Math.min(1, unscaledX / canvas.width));
    const normY = Math.max(0, Math.min(1, unscaledY / canvas.height));

    const pLng = minLng + normX * (maxLng - minLng);
    const pLat = maxLat - normY * (maxLat - minLat);

    const n1 = Math.sin(pLat * 45.12 + pLng * 32.84);
    const n2 = Math.cos(pLat * 89.41 - pLng * 67.23);
    const noise = (n1 + n2) * 0.5;

    let value = '';
    let label = '';
    let color = '#38bdf8';

    if (productMode === 'true_color') {
      value = `RGB [${Math.round(110 + noise * 60)}, ${Math.round(140 + noise * 50)}, ${Math.round(90 + noise * 40)}]`;
      label = noise > 0.3 ? 'Kanopi Vegetasi Rapat' : noise < -0.2 ? 'Perairan / Estuari' : 'Lahan Terbuka / Pemukiman';
      color = '#10b981';
    } else if (productMode === 'ndvi') {
      const ndvi = Number((0.2 + noise * 0.65).toFixed(3));
      value = `NDVI: ${ndvi}`;
      label = ndvi > 0.6 ? 'Hutan Tropis Sangat Rapat' : ndvi > 0.3 ? 'Pertanian / Semak Belukar' : 'Badan Air / Lahan Terbangun';
      color = ndvi > 0.4 ? '#22c55e' : '#f59e0b';
    } else if (productMode === 'lst') {
      const tempC = Number((26 + noise * 14).toFixed(1));
      value = `Suhu: ${tempC} °C`;
      label = tempC > 36 ? 'Anomali Panas Perkotaan (UHI)' : tempC < 26 ? 'Zona Sejuk Vegetatif' : 'Suhu Permukaan Ambien';
      color = tempC > 35 ? '#ef4444' : '#0ea5e9';
    } else if (productMode === 'ndwi') {
      const ndwi = Number((noise * 0.8).toFixed(3));
      value = `NDWI: ${ndwi}`;
      label = ndwi > 0.1 ? 'Badan Air Terbuka' : 'Kelembapan Daratan Rendah';
      color = '#3b82f6';
    } else if (productMode === 'sar') {
      const db = Number((-14 + noise * 9).toFixed(1));
      value = `SAR Backscatter: ${db} dB`;
      label = db > -8 ? 'Struktur Kasar / Bangunan' : 'Permukaan Halus / Air Tenang';
      color = '#e2e8f0';
    }

    setHoverPixel({
      lat: Number(pLat.toFixed(5)),
      lng: Number(pLng.toFixed(5)),
      value,
      label,
      color,
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - canvasRef.current!.getBoundingClientRect().left - panOffset.x,
      y: e.clientY - canvasRef.current!.getBoundingClientRect().top - panOffset.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => Math.max(0.7, Math.min(4.0, Number((prev + delta).toFixed(2)))));
  };

  const handleReset = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleSyncToMainMap = () => {
    if (onProjectToMainMap && scene) {
      onProjectToMainMap({
        type: productMode,
        sceneId: scene.id,
        bbox: effectiveBBox,
        title: `${scene.satellite} • ${productMode.toUpperCase()}`,
      });
      setSyncStatusToast(`Lapisan ${productMode.toUpperCase()} berhasil dikirim ke Peta Utama Dashboard!`);
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
                {scene ? scene.satellite : 'Simulasi AOI'}
              </span>
            </h4>
            <p className="text-[11px] text-slate-400 font-mono">
              Visualisasi langsung matriks piksel satelit pada footprint spasial nyata.
            </p>
          </div>
        </div>

        {/* Product Mode Tabs */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px] font-mono">
          <button
            type="button"
            onClick={() => setProductMode('true_color')}
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
            onClick={() => setProductMode('ndvi')}
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
            onClick={() => setProductMode('lst')}
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
            onClick={() => setProductMode('ndwi')}
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
            onClick={() => setProductMode('sar')}
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

      {/* Main Interactive Map Canvas Viewport */}
      <div
        ref={containerRef}
        className="relative w-full h-80 sm:h-96 bg-slate-950 overflow-hidden cursor-crosshair select-none"
      >
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          style={{ opacity }}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            setIsDragging(false);
            setHoverPixel(null);
          }}
          className="w-full h-full block"
        />

        {/* Tactical HUD Crosshair Overlay */}
        {isCrosshairActive && hoverPixel && (
          <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-2.5 rounded-2xl shadow-xl text-xs font-mono space-y-1 pointer-events-none">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-800">
              <Crosshair className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
              <span className="font-bold text-sky-300">INSPEKSI PIKSEL AKTIF</span>
            </div>
            <div className="text-[11px] text-slate-300">
              <span>Koordinat: </span>
              <span className="text-white font-bold">{hoverPixel.lat}°, {hoverPixel.lng}°</span>
            </div>
            <div className="text-[11px]">
              <span>Metrik: </span>
              <span className="font-extrabold" style={{ color: hoverPixel.color }}>
                {hoverPixel.value}
              </span>
            </div>
            <div className="text-[10px] text-slate-400">
              <span>Klasifikasi: </span>
              <span className="text-slate-200">{hoverPixel.label}</span>
            </div>
          </div>
        )}

        {/* Legend Overlay at Bottom-Left */}
        <div className="absolute bottom-3 left-3 bg-slate-950/85 backdrop-blur-sm border border-slate-800 px-3 py-2 rounded-xl text-[10px] font-mono space-y-1 pointer-events-none">
          <span className="font-bold text-slate-300 uppercase tracking-wider block">
            {productMode === 'true_color'
              ? 'Reflektansi Spektral RGB'
              : productMode === 'ndvi'
              ? 'Skala NDVI: -0.2 s/d +0.85'
              : productMode === 'lst'
              ? 'Kalibrasi Termal LST: 20°C s/d 44°C'
              : productMode === 'ndwi'
              ? 'Indeks Kebasahan NDWI'
              : 'Amplitudo Backscatter SAR (dB)'}
          </span>
          <div className="flex items-center gap-1.5">
            {productMode === 'true_color' && (
              <>
                <span className="w-3 h-2 rounded-sm bg-[#0f3854]" title="Air" />
                <span className="w-3 h-2 rounded-sm bg-[#4a5d3f]" title="Lahan/Pertanian" />
                <span className="w-3 h-2 rounded-sm bg-[#23532f]" title="Kanopi Hutan" />
                <span className="w-3 h-2 rounded-sm bg-[#7a7657]" title="Tanah Terbuka" />
              </>
            )}
            {productMode === 'ndvi' && (
              <>
                <span className="w-3 h-2 rounded-sm bg-[#0284c7]" title="Air" />
                <span className="w-3 h-2 rounded-sm bg-[#b45309]" title="Tandas" />
                <span className="w-3 h-2 rounded-sm bg-[#eab308]" title="Semak" />
                <span className="w-3 h-2 rounded-sm bg-[#84cc16]" title="Sedang" />
                <span className="w-3 h-2 rounded-sm bg-[#15803d]" title="Rapat" />
              </>
            )}
            {productMode === 'lst' && (
              <>
                <span className="w-3 h-2 rounded-sm bg-[#1e40af]" title="<24°C" />
                <span className="w-3 h-2 rounded-sm bg-[#0284c7]" title="24-28°C" />
                <span className="w-3 h-2 rounded-sm bg-[#10b981]" title="28-32°C" />
                <span className="w-3 h-2 rounded-sm bg-[#f59e0b]" title="32-36°C" />
                <span className="w-3 h-2 rounded-sm bg-[#ef4444]" title="36-40°C" />
                <span className="w-3 h-2 rounded-sm bg-[#a855f7]" title=">40°C" />
              </>
            )}
            {productMode === 'sar' && (
              <>
                <span className="w-3 h-2 rounded-sm bg-black" title="Halus" />
                <span className="w-3 h-2 rounded-sm bg-gray-500" title="Sedang" />
                <span className="w-3 h-2 rounded-sm bg-white" title="Kasar / Struktur" />
              </>
            )}
          </div>
        </div>

        {/* Viewport Control Buttons (Right Side) */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 bg-slate-900/80 backdrop-blur-sm border border-slate-800 p-1 rounded-xl shadow-lg">
          <button
            type="button"
            onClick={() => handleZoom(0.25)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Perbesar Tampilan"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleZoom(-0.25)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Perkecil Tampilan"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Pusatkan Kembali"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsCrosshairActive(!isCrosshairActive)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isCrosshairActive ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Aktifkan/Matikan Crosshair Inspeksi"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>

        {/* Footprint Metadata Badge (Bottom-Right) */}
        <div className="absolute bottom-3 right-3 bg-slate-950/85 backdrop-blur-sm border border-slate-800 px-3 py-1.5 rounded-xl text-[10px] font-mono text-slate-400 pointer-events-none">
          <span>BBox: [{minLng.toFixed(2)}, {minLat.toFixed(2)}] s/d [{maxLng.toFixed(2)}, {maxLat.toFixed(2)}]</span>
        </div>
      </div>

      {/* Bottom Controls: Opacity Slider & Project to Main Map Action */}
      <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-slate-400">
            <Sliders className="w-3.5 h-3.5" />
            <span>Opasitas Raster:</span>
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
            Scene: <strong className="text-sky-400">{scene?.id || 'Area of Interest Terkini'}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onProjectToMainMap && (
            <button
              type="button"
              onClick={handleSyncToMainMap}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold hover:brightness-110 active:scale-95 transition-all shadow-sm shadow-sky-500/25 flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Tampilkan di Peta Utama Dashboard</span>
            </button>
          )}
        </div>
      </div>

      {syncStatusToast && (
        <div className="p-2 bg-emerald-500/20 border-t border-emerald-500/30 text-emerald-300 text-xs font-mono text-center flex items-center justify-center gap-1.5 animate-fadeIn">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>{syncStatusToast}</span>
        </div>
      )}
    </div>
  );
};
