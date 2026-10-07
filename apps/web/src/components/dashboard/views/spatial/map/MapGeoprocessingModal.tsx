import React, { useState } from "react";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import Polygon from "ol/geom/Polygon";
import { fromLonLat, toLonLat } from "ol/proj";
import { getArea } from "ol/sphere";
import {
  Sparkles,
  Shield,
  Box,
  Target,
  Calculator,
  Layers,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { aoiService, AreaOfInterest } from "@/services/geospatial/aoiService";

export type GeoprocessOperation =
  | "buffer"
  | "bbox"
  | "centroid"
  | "pip_count";

export interface PointDataset {
  name: string;
  points: Array<[number, number]>; // [lng, lat]
}

function isPointInPolygon(point: [number, number], ring: number[][]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

interface MapGeoprocessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeAOI: AreaOfInterest | null;
  onAddAnalysisFeature: (feature: Feature, label: string) => void;
  pointDatasets?: PointDataset[];
}

export const MapGeoprocessingModal: React.FC<MapGeoprocessingModalProps> = ({
  isOpen,
  onClose,
  activeAOI,
  onAddAnalysisFeature,
  pointDatasets,
}) => {
  const [operation, setOperation] = useState<GeoprocessOperation>("buffer");
  const [bufferRadiusKm, setBufferRadiusKm] = useState<number>(5);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunGeoprocess = () => {
    setResultMessage(null);

    switch (operation) {
      case "buffer": {
        if (!activeAOI) {
          setResultMessage("Harap tetapkan AOI atau gambar titik/poligon terlebih dahulu.");
          return;
        }
        const [lng, lat] = activeAOI.centroid;
        const newBufAOI = aoiService.createBufferAOI(lat, lng, bufferRadiusKm);

        // Create OL feature for buffer
        const ring = newBufAOI.geometry.coordinates[0];
        const mercatorCoords = ring.map((c: any) => fromLonLat(c));
        const polyGeom = new Polygon([mercatorCoords]);
        const feat = new Feature({
          geometry: polyGeom,
          name: `Buffer ${bufferRadiusKm} km (${activeAOI.name})`,
          isAnalysis: true,
          areaKm2: newBufAOI.areaKm2,
        });

        onAddAnalysisFeature(feat, `Buffer ${bufferRadiusKm} km`);
        setResultMessage(
          `Buffer ${bufferRadiusKm} km berhasil dibuat. Luas geodesik: ${newBufAOI.areaKm2} km².`
        );
        break;
      }

      case "bbox": {
        if (!activeAOI) {
          setResultMessage("Harap tetapkan AOI terlebih dahulu untuk membuat Bounding Box.");
          return;
        }
        const [minLng, minLat, maxLng, maxLat] = activeAOI.bbox;
        const corners = [
          fromLonLat([minLng, minLat]),
          fromLonLat([maxLng, minLat]),
          fromLonLat([maxLng, maxLat]),
          fromLonLat([minLng, maxLat]),
          fromLonLat([minLng, minLat]),
        ];
        const polyGeom = new Polygon([corners]);
        const feat = new Feature({
          geometry: polyGeom,
          name: `Bounding Box: ${activeAOI.name}`,
          isAnalysis: true,
        });

        onAddAnalysisFeature(feat, `BBox: ${activeAOI.name}`);
        setResultMessage(
          `Bounding Box berhasil dihitung: [${minLng.toFixed(4)}, ${minLat.toFixed(4)}] s.d. [${maxLng.toFixed(4)}, ${maxLat.toFixed(4)}].`
        );
        break;
      }

      case "centroid": {
        if (!activeAOI) {
          setResultMessage("Harap tetapkan AOI terlebih dahulu untuk menghitung Centroid.");
          return;
        }
        const [cLng, cLat] = activeAOI.centroid;
        const ptGeom = new Point(fromLonLat([cLng, cLat]));
        const feat = new Feature({
          geometry: ptGeom,
          name: `Centroid: ${activeAOI.name}`,
          isAnalysis: true,
        });

        onAddAnalysisFeature(feat, `Centroid: ${activeAOI.name}`);
        setResultMessage(
          `Titik Pusat Massa (Centroid) berhasil dihitung: ${cLat.toFixed(6)}°, ${cLng.toFixed(6)}°.`
        );
        break;
      }

      case "pip_count": {
        if (!activeAOI) {
          setResultMessage("Harap tetapkan AOI poligon terlebih dahulu.");
          return;
        }

        const geomType = activeAOI.geometry?.type;
        if (geomType !== "Polygon") {
          setResultMessage(
            `Point-in-Polygon memerlukan geometri poligon tertutup. Jenis saat ini: ${geomType || "Tidak Diketahui"}.`
          );
          return;
        }

        const ring = (activeAOI.geometry as any).coordinates?.[0];
        if (!ring || ring.length < 4) {
          setResultMessage("Poligon AOI tidak memiliki simpul ring luar yang valid.");
          return;
        }

        if (pointDatasets && pointDatasets.length > 0) {
          const breakdown = pointDatasets
            .map((ds) => {
              const insideCount = ds.points.filter((pt) => isPointInPolygon(pt, ring)).length;
              return `${ds.name} di dalam: ${insideCount}`;
            })
            .join(" • ");

          setResultMessage(
            `Hasil Analisis Point-in-Polygon (${activeAOI.name}): ${breakdown}`
          );
        } else {
          setResultMessage(
            `Analisis Point-in-Polygon siap pada AOI: ${activeAOI.name}. Luas cakupan: ${activeAOI.areaKm2} km² (Menunggu data titik dimuat).`
          );
        }
        break;
      }

      default:
        break;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-800 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Mesin Geoprosesing Spasial
              </h3>
              <p className="text-[10px] text-slate-400">Analisis vektor matematis berbasis topologi</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Active AOI Notice */}
        <div className="mt-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Target AOI
            </span>
            <span className="rounded-full bg-brand-100 px-2 py-0.2 text-[9px] font-bold text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
              {activeAOI ? activeAOI.sourceType : "Belum ada AOI"}
            </span>
          </div>
          <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
            {activeAOI ? activeAOI.name : "Pilih atau gambar AOI di peta"}
          </p>
          {activeAOI && (
            <p className="text-[10px] text-slate-400">
              Luas: {activeAOI.areaKm2} km² • Pusat: {activeAOI.centroid[1].toFixed(4)}°,{" "}
              {activeAOI.centroid[0].toFixed(4)}°
            </p>
          )}
        </div>

        {/* Operation Selection */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setOperation("buffer")}
            className={`flex flex-col items-start rounded-2xl p-3 border text-left transition-all ${
              operation === "buffer"
                ? "bg-brand-50/80 border-brand-500/80 dark:bg-brand-950/40 dark:border-brand-500/60 shadow-xs"
                : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
            }`}
          >
            <Shield className="h-4 w-4 text-brand-500 mb-1" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Zona Penyangga (Buffer)
            </span>
            <span className="text-[10px] text-slate-400">Radius lingkaran geodesik</span>
          </button>

          <button
            type="button"
            onClick={() => setOperation("bbox")}
            className={`flex flex-col items-start rounded-2xl p-3 border text-left transition-all ${
              operation === "bbox"
                ? "bg-brand-50/80 border-brand-500/80 dark:bg-brand-950/40 dark:border-brand-500/60 shadow-xs"
                : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
            }`}
          >
            <Box className="h-4 w-4 text-indigo-500 mb-1" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Bounding Box
            </span>
            <span className="text-[10px] text-slate-400">Kotak pembatas terluar</span>
          </button>

          <button
            type="button"
            onClick={() => setOperation("centroid")}
            className={`flex flex-col items-start rounded-2xl p-3 border text-left transition-all ${
              operation === "centroid"
                ? "bg-brand-50/80 border-brand-500/80 dark:bg-brand-950/40 dark:border-brand-500/60 shadow-xs"
                : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
            }`}
          >
            <Target className="h-4 w-4 text-emerald-500 mb-1" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Centroid
            </span>
            <span className="text-[10px] text-slate-400">Pusat massa geometri</span>
          </button>

          <button
            type="button"
            onClick={() => setOperation("pip_count")}
            className={`flex flex-col items-start rounded-2xl p-3 border text-left transition-all ${
              operation === "pip_count"
                ? "bg-brand-50/80 border-brand-500/80 dark:bg-brand-950/40 dark:border-brand-500/60 shadow-xs"
                : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
            }`}
          >
            <Calculator className="h-4 w-4 text-amber-500 mb-1" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Point-in-Polygon
            </span>
            <span className="text-[10px] text-slate-400">Hitung sebaran titik</span>
          </button>
        </div>

        {/* Operation Parameters */}
        {operation === "buffer" && (
          <div className="mt-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
              <span>Radius Penyangga:</span>
              <span className="font-mono text-brand-600 dark:text-brand-400">
                {bufferRadiusKm} km
              </span>
            </div>
            <input
              id="buffer-radius-slider"
              name="bufferRadius"
              type="range"
              min="1"
              max="50"
              step="1"
              value={bufferRadiusKm}
              onChange={(e) => setBufferRadiusKm(parseInt(e.target.value))}
              className="w-full h-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 appearance-none cursor-pointer accent-brand-500"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>1 km</span>
              <span>25 km</span>
              <span>50 km</span>
            </div>
          </div>
        )}

        {/* Feedback / Result notice */}
        {resultMessage && (
          <div className="mt-3 flex items-start gap-2 rounded-2xl bg-brand-50 p-3 text-xs text-brand-900 border border-brand-200 dark:bg-brand-950/40 dark:border-brand-800/60 dark:text-brand-300">
            <CheckCircle2 className="h-4 w-4 text-brand-500 shrink-0 mt-0.5" />
            <span>{resultMessage}</span>
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-9 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={handleRunGeoprocess}
            className="flex-1 h-9 rounded-xl bg-brand-600 text-white text-xs font-bold hover:bg-brand-700 transition-colors shadow-xs flex items-center justify-center gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Jalankan Proses</span>
          </button>
        </div>
      </div>
    </div>
  );
};
