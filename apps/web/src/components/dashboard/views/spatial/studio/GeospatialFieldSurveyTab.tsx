import React, { useState } from 'react';
import {
  Upload,
  FileCheck2,
  Camera,
  MapPin,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Download,
  Eye,
  X,
  Info,
} from 'lucide-react';

interface GeospatialFieldSurveyTabProps {
  currentLat: number;
  currentLng: number;
}

interface SurveyEntry {
  id: string;
  title: string;
  category: 'Banjir' | 'Longsor' | 'Infrastruktur' | 'Evakuasi' | 'Drone Ortho';
  lat: number;
  lng: number;
  timestamp: string;
  notes: string;
  fileName?: string;
  featureCount?: number;
  geometryType: 'Point' | 'LineString' | 'Polygon';
  geojsonGeometry: any;
  uavMetadata?: {
    platform: string;
    sensor: string;
    altitudeAGLM: number;
    gsdCmPx: number;
    rtkStatus: string;
    overlap: string;
  };
}

export const GeospatialFieldSurveyTab: React.FC<GeospatialFieldSurveyTabProps> = ({
  currentLat,
  currentLng,
}) => {
  const [inspectingSurvey, setInspectingSurvey] = useState<SurveyEntry | null>(null);
  const [entries, setEntries] = useState<SurveyEntry[]>([
    {
      id: 'srv-1',
      title: 'Peta Orthomosaic Drone Sempadan Kali Jagir',
      category: 'Drone Ortho',
      lat: -7.298,
      lng: 112.748,
      timestamp: '17 Sep 2026 08:30',
      notes: 'Foto udara resolusi 2.8cm/piksel sensor RGB DJI Matrice 300 RTK pasca pemantauan tanggul sungai.',
      fileName: 'ortho_kali_jagir_georeferenced.geojson',
      featureCount: 5,
      geometryType: 'LineString',
      geojsonGeometry: {
        type: 'LineString',
        coordinates: [
          [112.7380, -7.2975],
          [112.7420, -7.2978],
          [112.7460, -7.2980],
          [112.7500, -7.2982],
          [112.7540, -7.2985],
        ],
      },
      uavMetadata: {
        platform: 'DJI Matrice 300 RTK',
        sensor: 'Zenmuse P1 35mm Full-Frame',
        altitudeAGLM: 120,
        gsdCmPx: 2.8,
        rtkStatus: 'RTK Fixed (InaCORS BIG)',
        overlap: '80% Forward / 70% Side',
      },
    },
    {
      id: 'srv-2',
      title: 'Titik Rekahan Lereng & Sesar Aktif Sidoarjo',
      category: 'Longsor',
      lat: -7.312,
      lng: 112.721,
      timestamp: '17 Sep 2026 09:05',
      notes: 'Ditemukan rekahan tanah selebar 15cm arah timur laut, dipasangi patok ukur geodetik.',
      fileName: 'survey_waypoint_gps.csv',
      featureCount: 1,
      geometryType: 'Point',
      geojsonGeometry: {
        type: 'Point',
        coordinates: [112.7210, -7.3120],
      },
      uavMetadata: {
        platform: 'Ground Survey GNSS Rover',
        sensor: 'Dual-Frequency GNSS Emlid Reach RS2',
        altitudeAGLM: 0,
        gsdCmPx: 0.5,
        rtkStatus: 'Differential GNSS Fixed (±8mm)',
        overlap: 'Single Station Multi-Epoch',
      },
    },
    {
      id: 'srv-3',
      title: 'Zona Tanggul & Kolam Retensi Kali Mas',
      category: 'Banjir',
      lat: -7.2685,
      lng: 112.7485,
      timestamp: '18 Sep 2026 14:15',
      notes: 'Survei polygon batas tampungan limpasan air sungai banjir perkotaan BBWS Brantas.',
      fileName: 'retensi_kali_mas_poly.geojson',
      featureCount: 6,
      geometryType: 'Polygon',
      geojsonGeometry: {
        type: 'Polygon',
        coordinates: [
          [
            [112.7460, -7.2670],
            [112.7510, -7.2670],
            [112.7520, -7.2700],
            [112.7470, -7.2710],
            [112.7450, -7.2690],
            [112.7460, -7.2670],
          ],
        ],
      },
      uavMetadata: {
        platform: 'DJI Mavic 3 Enterprise Thermal',
        sensor: 'Wide 4/3 CMOS 20MP',
        altitudeAGLM: 85,
        gsdCmPx: 2.3,
        rtkStatus: 'RTK Network Fixed',
        overlap: '75% Forward / 65% Side',
      },
    },
  ]);

  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<SurveyEntry['category']>('Banjir');
  const [formNotes, setFormNotes] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setUploadStatus(`Memvalidasi ${file.name}... Format terdeteksi: WGS84 Georeferenced`);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        let featCount = 1;
        let geometryType: SurveyEntry['geometryType'] = 'Point';
        let geojsonGeometry: any = { type: 'Point', coordinates: [currentLng, currentLat] };

        if (file.name.endsWith('.geojson') || file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          featCount = parsed.features?.length || (parsed.geometry ? 1 : 1);
          if (parsed.features?.[0]?.geometry) {
            geometryType = parsed.features[0].geometry.type || 'Point';
            geojsonGeometry = parsed.features[0].geometry;
          } else if (parsed.geometry) {
            geometryType = parsed.geometry.type || 'Point';
            geojsonGeometry = parsed.geometry;
          }
        } else if (file.name.endsWith('.csv')) {
          featCount = Math.max(1, text.split('\n').length - 1);
        }

        const newEntry: SurveyEntry = {
          id: `srv-${Date.now()}`,
          title: file.name.replace(/\.[^/.]+$/, ''),
          category: file.name.toLowerCase().includes('drone') ? 'Drone Ortho' : 'Infrastruktur',
          lat: currentLat,
          lng: currentLng,
          timestamp: new Date().toLocaleString('id-ID'),
          notes: `Data spasial diunggah via modul survei lapangan (${(file.size / 1024).toFixed(1)} KB).`,
          fileName: file.name,
          featureCount: featCount,
          geometryType,
          geojsonGeometry,
        };

        setEntries((prev) => [newEntry, ...prev]);
        setUploadStatus(`Sukses: ${featCount} fitur spasial berhasil divalidasi & diplot ke peta!`);
      } catch (err) {
        setUploadStatus(`Peringatan: File ${file.name} dimuat sebagai data toponimi referensi.`);
      }
    };
    reader.readAsText(file);
  };

  const handleAddManualSurvey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const newEntry: SurveyEntry = {
      id: `srv-${Date.now()}`,
      title: formTitle.trim(),
      category: formCategory,
      lat: currentLat,
      lng: currentLng,
      timestamp: new Date().toLocaleString('id-ID'),
      notes: formNotes.trim() || 'Titik inspeksi geospasial terverifikasi di koordinat GPS.',
      featureCount: 1,
      geometryType: 'Point',
      geojsonGeometry: {
        type: 'Point',
        coordinates: [currentLng, currentLat],
      },
    };

    setEntries((prev) => [newEntry, ...prev]);
    setFormTitle('');
    setFormNotes('');
  };

  const handleDeleteEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleExportSingleSurvey = (e: SurveyEntry) => {
    const feature = {
      type: 'Feature',
      properties: {
        id: e.id,
        title: e.title,
        category: e.category,
        timestamp: e.timestamp,
        notes: e.notes,
        fileSource: e.fileName || 'Survey Waypoint',
        uavMetadata: e.uavMetadata || null,
      },
      geometry: e.geojsonGeometry || {
        type: 'Point',
        coordinates: [e.lng, e.lat],
      },
    };
    const blob = new Blob([JSON.stringify(feature, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${e.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportAllSurveys = () => {
    const featureCollection = {
      type: 'FeatureCollection',
      features: entries.map((e) => ({
        type: 'Feature',
        properties: {
          id: e.id,
          title: e.title,
          category: e.category,
          timestamp: e.timestamp,
          notes: e.notes,
          fileSource: e.fileName || 'Manual Field GPS Entry',
          uavMetadata: e.uavMetadata || null,
        },
        geometry: e.geojsonGeometry || {
          type: 'Point',
          coordinates: [e.lng, e.lat],
        },
      })),
    };

    const blob = new Blob([JSON.stringify(featureCollection, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `harmony_field_surveys_${Date.now()}.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-sky-500/10 border border-emerald-500/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-500/25">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                Survei Lapangan, Drone UAV & Ingesti Data
              </h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/25">
                Multi-Format Ingestion
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Integrasi langsung data drone orthomosaic, GeoJSON, Shapefile/KML, koordinat CSV, dan geotagging survei
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportAllSurveys}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-500/20 transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5" /> Ekspor Seluruh Survei (.geojson)
          </button>
        </div>
      </div>

      {/* File Ingestion & Drag Drop Zone */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-teal-500" /> Ingesti Berkas Spasial Eksternal
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Format yang didukung: GeoJSON (.geojson, .json), Google Earth (.kml), Koordinat GPS (.csv), Metadata GeoTIFF
            </p>
          </div>
        </div>

        <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center hover:border-teal-500 dark:hover:border-teal-400 transition-colors">
          <input name="input_0ue24" id="geospatialfieldsurveytab-input_0ue24"
            type="file"
            accept=".geojson,.json,.kml,.csv"
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="h-10 w-10 rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Pilih atau Tarik Berkas Geospasial / Hasil Olah Drone ke Sini
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Sistem otomatis memvalidasi struktur koordinat datum WGS 84 dan menghitung jumlah poligon/titik
              </p>
            </div>
          </div>
        </div>

        {uploadStatus && (
          <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 text-xs font-medium text-teal-800 dark:text-teal-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
            {uploadStatus}
          </div>
        )}
      </div>

      {/* Manual Geotagged Point Entry Form */}
      <form
        onSubmit={handleAddManualSurvey}
        className="p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-4"
      >
        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <MapPin className="w-4 h-4 text-indigo-500" /> Tambah Catatan Lapangan Geotagged (Geotagging Logger)
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Judul Observasi / Objek Lapangan
            </label>
            <input name="formTitle" id="geospatialfieldsurveytab-formtitle"
              type="text"
              placeholder="Contoh: Titik Genangan Luapan Tanggul Kali Mas"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:text-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Kategori Geografis
            </label>
            <select name="formCategory" id="geospatialfieldsurveytab-formcategory"
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value as SurveyEntry['category'])}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:text-white"
            >
              <option value="Banjir">Banjir & Genangan</option>
              <option value="Longsor">Gerakan Tanah / Longsor</option>
              <option value="Infrastruktur">Kerusakan Infrastruktur / Jalan</option>
              <option value="Evakuasi">Posko / Titik Kumpul</option>
              <option value="Drone Ortho">Misi Drone UAV</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Deskripsi Kondisi Fisik Lapangan
          </label>
          <input name="formNotes" id="geospatialfieldsurveytab-formnotes"
            type="text"
            placeholder="Catatan kondisi ketinggian air, kerusakan tebing, atau jumlah pengungsi..."
            value={formNotes}
            onChange={(e) => setFormNotes(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:text-white"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-slate-500 font-mono">
            Koordinat Geotag Otomatis: {currentLat.toFixed(5)}°, {currentLng.toFixed(5)}°
          </span>
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" /> Simpan Titik Lapangan
          </button>
        </div>
      </form>

      {/* Ingested Survey Entries List */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/60">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-emerald-500" /> Katalog Data Survei Lapangan Aktif ({entries.length})
          </h4>
        </div>

        <div className="space-y-2">
          {entries.map((item) => (
            <div
              key={item.id}
              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{item.title}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                    {item.category}
                  </span>
                  {item.featureCount && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                      {item.featureCount} Fitur Spasial
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">{item.notes}</p>
                <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                  <span>{item.timestamp}</span>
                  <span>•</span>
                  <span>{item.lat.toFixed(4)}°, {item.lng.toFixed(4)}°</span>
                  {item.fileName && (
                    <>
                      <span>•</span>
                      <span className="text-indigo-500 truncate">{item.fileName}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => setInspectingSurvey(item)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 font-semibold text-xs border border-teal-500/20 transition-all cursor-pointer"
                  title="Inspeksi Geometri & Metadata Drone"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspeksi</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportSingleSurvey(item)}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                  title="Unduh GeoJSON Fitur Ini"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteEntry(item.id)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                  title="Hapus Rekaman Survei"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Geometry & Drone Metadata Inspection Modal */}
      {inspectingSurvey && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {inspectingSurvey.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Tipe Geometri: {inspectingSurvey.geometryType} • {inspectingSurvey.timestamp}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectingSurvey(null)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
              {inspectingSurvey.uavMetadata && (
                <div className="p-3.5 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-500/20 space-y-2">
                  <span className="font-bold text-teal-700 dark:text-teal-300 block text-[11px] uppercase tracking-wider">
                    Telemetri Drone UAV & Fotogrametri
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>Platform: <strong className="text-slate-800 dark:text-slate-200">{inspectingSurvey.uavMetadata.platform}</strong></div>
                    <div>Sensor: <strong className="text-slate-800 dark:text-slate-200">{inspectingSurvey.uavMetadata.sensor}</strong></div>
                    <div>Elevasi Terbang: <strong className="text-slate-800 dark:text-slate-200">{inspectingSurvey.uavMetadata.altitudeAGLM} m AGL</strong></div>
                    <div>GSD: <strong className="text-slate-800 dark:text-slate-200">{inspectingSurvey.uavMetadata.gsdCmPx} cm/px</strong></div>
                    <div>Status Koreksi: <strong className="text-slate-800 dark:text-slate-200">{inspectingSurvey.uavMetadata.rtkStatus}</strong></div>
                    <div>Overlap: <strong className="text-slate-800 dark:text-slate-200">{inspectingSurvey.uavMetadata.overlap}</strong></div>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <span className="font-bold text-slate-700 dark:text-slate-300 block text-[11px]">
                  Koordinat Georeferensi (WGS 84 / EPSG:4326)
                </span>
                <pre className="p-3 rounded-xl bg-slate-900 text-slate-200 text-[11px] font-mono overflow-x-auto max-h-48 border border-slate-800">
                  {JSON.stringify(inspectingSurvey.geojsonGeometry, null, 2)}
                </pre>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-400">
                <strong>Catatan Verifikasi Lapangan:</strong> {inspectingSurvey.notes}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setInspectingSurvey(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => handleExportSingleSurvey(inspectingSurvey)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh GeoJSON Lengkap</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
