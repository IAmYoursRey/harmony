import React, { useState, useEffect } from "react";
import {
  MapPin,
  Mountain,
  School,
  Radio,
  AlertTriangle,
  Layers,
  Copy,
  Check,
  X,
  Compass,
  ExternalLink,
  ShieldCheck,
  Navigation2,
  RefreshCw,
} from "lucide-react";
import { crsEngine } from "@/services/geospatial/crsEngine";
import { terrainService, TerrainIntelligenceResult } from "@/services/geospatial/terrainService";
import { apiClient } from "@/services/apiClient";
import { DataProvenance } from "@/services/geospatial/types";

export interface IdentifyResult {
  lat: number;
  lng: number;
  utm?: {
    zone: number;
    isSouth: boolean;
    epsg: string;
    easting: number;
    northing: number;
  };
  terrain?: TerrainIntelligenceResult | null;
  schools: Array<{
    id: string;
    name: string;
    npsn?: string;
    city?: string;
    province?: string;
    distanceKm: number;
  }>;
  sensors: Array<{
    id: string;
    name: string;
    code?: string;
    family?: string;
    distanceKm?: number;
    status?: string;
  }>;
  hazards: any[];
  provenance?: DataProvenance;
}

interface MapIdentifyPanelProps {
  isOpen: boolean;
  onClose: () => void;
  coordinate: [number, number] | null; // [lng, lat]
  onGenerateBuffer?: (center: [number, number], radiusKm: number) => void;
}

export const MapIdentifyPanel: React.FC<MapIdentifyPanelProps> = ({
  isOpen,
  onClose,
  coordinate,
  onGenerateBuffer,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<IdentifyResult | null>(null);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [bufferRadius, setBufferRadius] = useState<number>(3);

  useEffect(() => {
    if (!isOpen || !coordinate) return;

    const [lng, lat] = coordinate;
    let isCancelled = false;

    const fetchIdentifyData = async () => {
      setLoading(true);

      // 1. Calculate UTM projection using Proj4
      let utmInfo: IdentifyResult["utm"] = undefined;
      try {
        const utm = crsEngine.toAuthoritativeUTM(lng, lat);
        const zoneMatch = utm.utmZone.match(/(\d+)([NS])/);
        utmInfo = {
          zone: zoneMatch ? parseInt(zoneMatch[1], 10) : 48,
          isSouth: zoneMatch ? zoneMatch[2] === "S" : true,
          epsg: utm.epsgCode,
          easting: Math.round(utm.x),
          northing: Math.round(utm.y),
        };
      } catch (err) {
        console.warn("UTM conversion error:", err);
      }

      // 2. Concurrently fetch terrain and spatial backend queries with Promise.allSettled for complete error isolation
      let terrainSample: TerrainIntelligenceResult | null = null;
      let nearestSchools: IdentifyResult["schools"] = [];
      let nearestSensors: IdentifyResult["sensors"] = [];
      let hazardZones: any[] = [];
      let respProvenance: DataProvenance | undefined = undefined;

      const [terrainResult, spatialResult] = await Promise.allSettled([
        terrainService.getTerrainIntelligence(lat, lng),
        apiClient.get(`/api/spatial/identify?lat=${lat}&lng=${lng}&radius=15000`),
      ]);

      if (terrainResult.status === "fulfilled") {
        terrainSample = terrainResult.value;
      } else {
        console.warn("Terrain intelligence fetch error (isolated):", terrainResult.reason);
      }

      if (spatialResult.status === "fulfilled") {
        const res = spatialResult.value;
        if (res?.data) {
          nearestSchools = res.data.nearestSchools || [];
          nearestSensors = res.data.sensors || [];
          hazardZones = res.data.hazards || [];
          respProvenance = res.data.provenance;
        }
      } else {
        console.warn("Spatial identify API error (isolated):", spatialResult.reason);
      }

      if (!isCancelled) {
        setData({
          lat,
          lng,
          utm: utmInfo,
          terrain: terrainSample,
          schools: nearestSchools,
          sensors: nearestSensors,
          hazards: hazardZones,
          provenance: respProvenance,
        });
        setLoading(false);
      }
    };

    fetchIdentifyData();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, coordinate]);

  if (!isOpen || !coordinate) return null;

  const [lng, lat] = coordinate;

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  return (
    <div className="absolute top-20 right-4 z-30 w-84 sm:w-96 max-w-[calc(100vw-2rem)] rounded-2xl bg-white/95 p-4 shadow-2xl backdrop-blur-xl border border-slate-200/90 dark:bg-slate-900/95 dark:border-slate-800 animate-in fade-in slide-in-from-right-3 duration-200 text-slate-800 dark:text-slate-100 max-h-[calc(100vh-6.5rem)] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
            <Compass className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Identifikasi Spasial Titik</span>
              {loading && <RefreshCw className="h-3 w-3 animate-spin text-brand-500" />}
            </h3>
            <p className="text-[10px] text-slate-400">Analisis atribut dan relasi spasial koordinat</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          title="Tutup Panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Coordinate & Projection Cards */}
      <div className="mt-3 grid grid-cols-1 gap-2">
        <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              WGS 84 (Derajat Desimal)
            </span>
            <button
              type="button"
              onClick={() => handleCopy(`${lat.toFixed(6)}, ${lng.toFixed(6)}`, "wgs")}
              className="flex items-center gap-1 text-[10px] font-semibold text-brand-600 dark:text-brand-400 hover:underline"
            >
              {copiedType === "wgs" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              <span>{copiedType === "wgs" ? "Tersalin" : "Salin"}</span>
            </button>
          </div>
          <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
            Lat: {lat.toFixed(6)}°, Lon: {lng.toFixed(6)}°
          </div>
        </div>

        {data?.utm && (
          <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Proyeksi UTM ({data.utm.epsg})
              </span>
              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    `Zona ${data.utm!.zone}${data.utm!.isSouth ? "S" : "N"} X: ${data.utm!.easting}m Y: ${data.utm!.northing}m`,
                    "utm"
                  )
                }
                className="flex items-center gap-1 text-[10px] font-semibold text-brand-600 dark:text-brand-400 hover:underline"
              >
                {copiedType === "utm" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                <span>{copiedType === "utm" ? "Tersalin" : "Salin"}</span>
              </button>
            </div>
            <div className="font-mono text-xs text-slate-700 dark:text-slate-300">
              <span className="font-bold text-brand-600 dark:text-brand-400">
                Zona {data.utm.zone}
                {data.utm.isSouth ? "S" : "N"}
              </span>{" "}
              • X (Easting): {data.utm.easting.toLocaleString("id-ID")} m • Y (Northing):{" "}
              {data.utm.northing.toLocaleString("id-ID")} m
            </div>
          </div>
        )}
      </div>

      {/* Terrain & DEM Section */}
      <div className="mt-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
          <Mountain className="h-3.5 w-3.5 text-amber-500" />
          <span>Topografi &amp; Morfometri (Copernicus DEM)</span>
        </div>
        {loading ? (
          <div className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        ) : data?.terrain ? (
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-2.5 dark:border-amber-900/40 dark:bg-amber-950/20 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-500">Elevasi Titik:</span>
                <p className="font-bold text-slate-900 dark:text-white">
                  {data.terrain.elevationM !== null && data.terrain.elevationM !== undefined
                    ? `${data.terrain.elevationM} mdpl`
                    : "Tidak tersedia"}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500">Kemiringan (Horn 3×3):</span>
                <p className="font-bold text-slate-900 dark:text-white">
                  {data.terrain.slopeDeg !== null && data.terrain.slopeDeg !== undefined
                    ? `${data.terrain.slopeDeg}° (${data.terrain.slopePercent}%)`
                    : "Tidak tersedia"}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500">Arah Hadap Lereng:</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {data.terrain.aspect || "-"}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500">Klasifikasi Relief:</span>
                <span className="inline-block rounded-md bg-amber-200/70 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
                  {data.terrain.morphologyClass || "Dataran"}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 p-2 text-[11px] text-slate-400 dark:border-slate-800">
            Data elevasi tidak dapat dijangkau.
          </div>
        )}
      </div>

      {/* Nearby Schools Section */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
          <div className="flex items-center gap-1.5">
            <School className="h-3.5 w-3.5 text-blue-500" />
            <span>Fasilitas Pendidikan Terdekat</span>
          </div>
          <span className="rounded-full bg-blue-100 px-2 py-0.2 text-[10px] font-bold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
            {data?.schools?.length || 0} sekolah
          </span>
        </div>
        {loading ? (
          <div className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        ) : data?.schools && data.schools.length > 0 ? (
          <div className="flex flex-col gap-1 max-h-36 overflow-y-auto pr-1">
            {data.schools.slice(0, 5).map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-white p-2 text-xs hover:border-brand-200 dark:border-slate-800 dark:bg-slate-800/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{s.name}</p>
                  <p className="text-[10px] text-slate-400">
                    NPSN: {s.npsn || "-"} • {s.city || s.province || "Indonesia"}
                  </p>
                </div>
                <span className="shrink-0 ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-600 dark:bg-blue-950/60 dark:text-blue-300">
                  {s.distanceKm} km
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 p-2 text-[11px] text-slate-400 dark:border-slate-800">
            Tidak ada sekolah dalam radius pencarian 15 km.
          </div>
        )}
      </div>

      {/* Nearby Sensors Section */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
          <div className="flex items-center gap-1.5">
            <Radio className="h-3.5 w-3.5 text-emerald-500" />
            <span>Sensor &amp; Stasiun Pengamatan Terdekat</span>
          </div>
          <span className="rounded-full bg-emerald-100 px-2 py-0.2 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
            {data?.sensors?.length || 0} stasiun
          </span>
        </div>
        {data?.sensors && data.sensors.length > 0 ? (
          <div className="flex flex-col gap-1 max-h-28 overflow-y-auto pr-1">
            {data.sensors.slice(0, 3).map((sn) => (
              <div
                key={sn.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-white p-2 text-xs dark:border-slate-800 dark:bg-slate-800/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{sn.name}</p>
                  <p className="text-[10px] text-slate-400">
                    ID: {sn.code || sn.id} • {sn.family || "Kebencanaan"}
                  </p>
                </div>
                {sn.distanceKm !== undefined && (
                  <span className="shrink-0 ml-2 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
                    {sn.distanceKm} km
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 p-2 text-[11px] text-slate-400 dark:border-slate-800">
            Tidak ada stasiun sensor dalam radius terdekat.
          </div>
        )}
      </div>

      {/* Buffer Action Tool */}
      {onGenerateBuffer && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Buat Zona Penyangga (Buffer Spasial)
            </span>
            <div className="flex items-center gap-1">
              {[1, 3, 5, 10].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setBufferRadius(r)}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold transition-colors ${
                    bufferRadius === r
                      ? "bg-brand-500 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {r}km
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onGenerateBuffer(coordinate, bufferRadius)}
            className="w-full h-8 rounded-xl bg-brand-600 text-white text-xs font-bold hover:bg-brand-700 transition-colors shadow-xs flex items-center justify-center gap-1.5"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Generate {bufferRadius} km Buffer di Peta</span>
          </button>
        </div>
      )}

      {/* Provenance Footer */}
      <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400 dark:border-slate-800 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>Status: </span>
          <strong className="text-slate-600 dark:text-slate-300">
            {data?.provenance?.dataStatus || "LIVE"}
          </strong>
        </span>
        <span>PostGIS 3.6 &amp; Open-Meteo DEM</span>
      </div>
    </div>
  );
};
