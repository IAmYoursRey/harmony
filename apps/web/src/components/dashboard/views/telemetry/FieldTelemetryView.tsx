import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Battery,
  CheckCircle2,
  CloudRain,
  Compass,
  Cpu,
  Droplets,
  Flame,
  MapPin,
  Moon,
  Radio,
  RefreshCw,
  Send,
  Sprout,
  Sun,
  Thermometer,
  Trash2,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  fetchAdminRegions,
  fetchTelemetryData,
  fetchTelemetryWeather,
  pollCommandStatus,
  postWeatherAction,
  requestSample,
  updateDeliveryConfig,
  type AmbangConfig,
  type RegionEntry,
  type TelemetryCommand,
  type TelemetryDataResponse,
  type TelemetryWeatherResponse,
} from "@/services/fieldTelemetryService";
import { FieldCompassCard } from "./FieldCompassCard";
import { FfmcGaugeChart } from "./FfmcGaugeChart";
import { ExpansionArchitecturePanel } from "./ExpansionArchitecturePanel";

type TelemetryTab = "ringkasan" | "cuaca" | "wilayah" | "modul";

const COMMAND_STEPS = [
  { key: "menunggu", label: "Antrean" },
  { key: "diambil", label: "Diambil Gateway" },
  { key: "diteruskan", label: "Kirim LoRa" },
  { key: "selesai", label: "Selesai" },
] as const;

export const FieldTelemetryView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TelemetryTab>("ringkasan");
  const [telemetryData, setTelemetryData] = useState<TelemetryDataResponse | null>(null);
  const [weatherData, setWeatherData] = useState<TelemetryWeatherResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [selectedUnitId, setSelectedUnitId] = useState<string>("RUMAH-01:1");
  const [locationMode, setLocationMode] = useState<"otomatis" | "alat" | "pengguna" | "manual">("otomatis");
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [gpsBusy, setGpsBusy] = useState<boolean>(false);

  const [activeCmd, setActiveCmd] = useState<TelemetryCommand | null>(null);
  const [cmdBusy, setCmdBusy] = useState<boolean>(false);
  const [deliveryBusy, setDeliveryBusy] = useState<boolean>(false);
  const [actionBusy, setActionBusy] = useState<boolean>(false);

  // Rain & Dasarian form inputs
  const [rainMm, setRainMm] = useState<string>("12");
  const [rainNote, setRainNote] = useState<string>("");
  const [dasarianNow, setDasarianNow] = useState<"rendah" | "sedang" | "tinggi">("sedang");
  const [dasarianNext, setDasarianNext] = useState<"rendah" | "sedang" | "tinggi">("sedang");

  // Cascading Indonesian regions (wilayah.id proxy)
  const [provinces, setProvinces] = useState<RegionEntry[]>([]);
  const [regencies, setRegencies] = useState<RegionEntry[]>([]);
  const [districts, setDistricts] = useState<RegionEntry[]>([]);
  const [villages, setVillages] = useState<RegionEntry[]>([]);
  const [selProv, setSelProv] = useState<string>("");
  const [selReg, setSelReg] = useState<string>("");
  const [selDist, setSelDist] = useState<string>("");
  const [selVil, setSelVil] = useState<string>("");

  const pollTimerRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 4500);
  }, []);

  const loadAll = useCallback(
    async (opts: { forceFreshBmkg?: boolean; adm4Override?: string; modeOverride?: "otomatis" | "alat" | "pengguna" | "manual" } = {}) => {
      try {
        const modeToUse = opts.modeOverride || locationMode;
        const [dataRes, weatherRes] = await Promise.all([
          fetchTelemetryData(),
          fetchTelemetryWeather({
            alat: selectedUnitId,
            mode: modeToUse,
            adm4: opts.adm4Override,
            lat: userCoords?.lat,
            lon: userCoords?.lon,
            segar: opts.forceFreshBmkg,
          }),
        ]);
        setTelemetryData(dataRes);
        setWeatherData(weatherRes);
        if (weatherRes.alat_aktif && !selectedUnitId) {
          setSelectedUnitId(weatherRes.alat_aktif);
        }
        setDasarianNow(weatherRes.waktu_tanam.dasarian.berjalan);
        setDasarianNext(weatherRes.waktu_tanam.dasarian.berikutnya);
        setErrorMsg(null);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Gagal memuat telemetri lahan");
      } finally {
        setLoading(false);
      }
    },
    [locationMode, selectedUnitId, userCoords]
  );

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // Background refresh every 8 seconds while the view is active
  useEffect(() => {
    const id = window.setInterval(() => {
      void fetchTelemetryData()
        .then((res) => setTelemetryData(res))
        .catch(() => {});
    }, 8000);
    return () => window.clearInterval(id);
  }, []);

  // Cleanup command polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
    };
  }, []);

  // Load Indonesian provinces lazily when opening Wilayah tab
  useEffect(() => {
    if (activeTab !== "wilayah" || provinces.length > 0) return;
    void fetchAdminRegions("provinsi")
      .then(setProvinces)
      .catch(() => {});
  }, [activeTab, provinces.length]);

  const handleProvinceChange = async (code: string) => {
    setSelProv(code);
    setSelReg("");
    setSelDist("");
    setSelVil("");
    setRegencies([]);
    setDistricts([]);
    setVillages([]);
    if (!code) return;
    try {
      setRegencies(await fetchAdminRegions("kabupaten", code));
    } catch {
      showToast("Gagal memuat daftar kabupaten/kota");
    }
  };

  const handleRegencyChange = async (code: string) => {
    setSelReg(code);
    setSelDist("");
    setSelVil("");
    setDistricts([]);
    setVillages([]);
    if (!code) return;
    try {
      setDistricts(await fetchAdminRegions("kecamatan", code));
    } catch {
      showToast("Gagal memuat daftar kecamatan");
    }
  };

  const handleDistrictChange = async (code: string) => {
    setSelDist(code);
    setSelVil("");
    setVillages([]);
    if (!code) return;
    try {
      setVillages(await fetchAdminRegions("desa", code));
    } catch {
      showToast("Gagal memuat daftar desa/kelurahan");
    }
  };

  const selectedUnit = useMemo(() => {
    const list = weatherData?.daftar_alat || [];
    return list.find((u) => u.alat_id === selectedUnitId) || list.find((u) => u.unit >= 1) || list[0] || null;
  }, [weatherData, selectedUnitId]);

  const activeNodeNumber = selectedUnit && selectedUnit.unit >= 1 ? selectedUnit.node : 1;

  const currentReading = useMemo(() => {
    const nodes = telemetryData?.node || [];
    return (
      nodes.find((n) => selectedUnit && n.stasiun === selectedUnit.stasiun && (selectedUnit.unit === 0 || n.node === selectedUnit.node)) ||
      nodes[0] ||
      null
    );
  }, [telemetryData, selectedUnit]);

  const activeAmbang: AmbangConfig = useMemo(() => {
    const map = weatherData?.pengaturan.ambang_node || {};
    return map[String(activeNodeNumber)] || map["1"] || { kering: 30, cukup: 60, suhuMin: 20, suhuMax: 35 };
  }, [weatherData, activeNodeNumber]);

  const activeModules = useMemo(() => {
    const map = weatherData?.pengaturan.modul_node || {};
    return map[String(activeNodeNumber)] || map["1"] || ["inti"];
  }, [weatherData, activeNodeNumber]);

  const sensorChartData = useMemo(() => {
    const list = [...(telemetryData?.riwayat || [])]
      .filter((r) => !selectedUnit || r.stasiun === selectedUnit.stasiun)
      .slice(0, 32)
      .reverse();
    return list.map((r) => ({
      waktu: new Date(r.diterima).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      lembap: r.lembap,
      suhu: r.suhu,
    }));
  }, [telemetryData, selectedUnit]);

  const bmkgChartData = useMemo(() => {
    return (weatherData?.bmkg.per_3_jam || []).map((s) => ({
      jam: s.jam || s.waktu_lokal.slice(11, 16),
      suhu: s.suhu,
      rh: s.rh,
      hujan: s.hujan_mm,
    }));
  }, [weatherData]);

  const handleRequestSample = async () => {
    if (cmdBusy) return;
    setCmdBusy(true);
    try {
      const res = await requestSample(activeNodeNumber);
      setActiveCmd(res.perintah);
      if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = window.setInterval(async () => {
        try {
          const check = await pollCommandStatus(res.perintah.id);
          setActiveCmd(check.perintah);
          if (check.perintah.status === "selesai" || check.perintah.status === "kedaluwarsa") {
            if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
            setCmdBusy(false);
            void loadAll();
            showToast(
              check.perintah.status === "selesai"
                ? `Sampel Node ${activeNodeNumber} diterima (${check.perintah.lembap ?? "--"}%)`
                : "Perintah ambil sampel kedaluwarsa (stasiun offline)"
            );
          }
        } catch {
          // Keep polling until finished or timeout
        }
      }, 1000);
    } catch (err) {
      setCmdBusy(false);
      showToast(err instanceof Error ? err.message : "Gagal mengirim perintah");
    }
  };

  const handleToggleDelivery = async (patch: { mode?: "terus" | "jadwal"; interval_detik?: number; hemat_malam?: boolean; interval_malam_detik?: number }) => {
    setDeliveryBusy(true);
    try {
      const res = await updateDeliveryConfig(patch);
      setTelemetryData((prev) => (prev ? { ...prev, pengiriman: res.pengiriman, waktu: res.waktu, batas_detik: res.batas_detik } : prev));
      showToast(res.pesan);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal mengubah jadwal kirim");
    } finally {
      setDeliveryBusy(false);
    }
  };

  const handleUseDeviceGps = () => {
    if (!("geolocation" in navigator)) {
      showToast("Perangkat tidak mendukung GPS browser");
      return;
    }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setUserCoords(coords);
        setLocationMode("pengguna");
        try {
          const res = await fetchTelemetryWeather({
            alat: selectedUnitId,
            mode: "pengguna",
            lat: coords.lat,
            lon: coords.lon,
          });
          setWeatherData(res);
          showToast(`Lokasi GPS diperbarui: ${res.bmkg.lokasi.desa}`);
        } catch (err) {
          showToast(err instanceof Error ? err.message : "Gagal menyelesaikan lokasi GPS");
        } finally {
          setGpsBusy(false);
        }
      },
      (err) => {
        setGpsBusy(false);
        showToast(err.message || "Izin lokasi GPS ditolak");
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 60000 }
    );
  };

  const handleCalibrateToolWithGps = () => {
    if (!("geolocation" in navigator)) {
      showToast("GPS browser tidak tersedia");
      return;
    }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await postWeatherAction({
            aksi: "tetapkan_lokasi_alat",
            alat_id: selectedUnitId,
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          });
          setWeatherData(res);
          setLocationMode("alat");
          showToast(res.pesan || "Lokasi unit diperbarui lewat GPS");
        } catch (err) {
          showToast(err instanceof Error ? err.message : "Gagal mengkalibrasi posisi alat");
        } finally {
          setGpsBusy(false);
        }
      },
      (err) => {
        setGpsBusy(false);
        showToast(err.message || "Izin GPS ditolak");
      },
      { enableHighAccuracy: true, timeout: 9000 }
    );
  };

  const handleSaveRain = async (e: React.FormEvent) => {
    e.preventDefault();
    const mm = Number(rainMm);
    if (!Number.isFinite(mm) || mm < 0 || mm > 500) {
      showToast("Masukkan curah hujan 0–500 mm");
      return;
    }
    setActionBusy(true);
    try {
      const res = await postWeatherAction({
        aksi: "lapor_hujan",
        curah_mm: mm,
        catatan: rainNote,
        aktif_adm4: weatherData?.wilayah.adm4,
        aktif_alat: selectedUnitId,
        aktif_mode: locationMode,
      });
      setWeatherData(res);
      setRainNote("");
      showToast(res.pesan || "Laporan hujan disimpan");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal menyimpan laporan hujan");
    } finally {
      setActionBusy(false);
    }
  };

  const handleDeleteRain = async (id: number) => {
    setActionBusy(true);
    try {
      const res = await postWeatherAction({
        aksi: "hapus_lapor_hujan",
        id,
        aktif_adm4: weatherData?.wilayah.adm4,
        aktif_alat: selectedUnitId,
        aktif_mode: locationMode,
      });
      setWeatherData(res);
      showToast(res.pesan || "Laporan hujan dihapus");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal menghapus laporan hujan");
    } finally {
      setActionBusy(false);
    }
  };

  const handleSaveDasarian = async () => {
    setActionBusy(true);
    try {
      const res = await postWeatherAction({
        aksi: "atur_dasarian",
        berjalan: dasarianNow,
        berikutnya: dasarianNext,
        aktif_adm4: weatherData?.wilayah.adm4,
        aktif_alat: selectedUnitId,
        aktif_mode: locationMode,
      });
      setWeatherData(res);
      showToast(res.pesan || "Dasarian diperbarui");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal menyimpan dasarian");
    } finally {
      setActionBusy(false);
    }
  };

  const handleSelectAdm4 = async (adm4: string, assignToUnit = false) => {
    if (!adm4) return;
    setActionBusy(true);
    try {
      const res = await postWeatherAction({
        aksi: assignToUnit ? "tetapkan_lokasi_alat" : "atur_wilayah",
        adm4,
        alat_id: selectedUnitId,
      });
      setWeatherData(res);
      setLocationMode(assignToUnit ? "alat" : "manual");
      showToast(res.pesan || `Wilayah diperbarui (${adm4})`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal memperbarui wilayah");
    } finally {
      setActionBusy(false);
    }
  };

  const moistureValue = currentReading?.lembap ?? null;
  const moistureStatus =
    moistureValue === null
      ? { label: "Menunggu Node", tone: "text-slate-500 dark:text-slate-400" }
      : moistureValue < activeAmbang.kering
        ? { label: "Kering · Perlu Siram", tone: "text-rose-600 dark:text-rose-400" }
        : moistureValue < activeAmbang.cukup
          ? { label: "Transisi Lembap", tone: "text-amber-600 dark:text-amber-400" }
          : { label: "Cukup Air · Optimal", tone: "text-emerald-600 dark:text-emerald-400" };

  const primaryStation = telemetryData?.stasiun?.[0] || null;
  const hasHardwareData = Boolean(currentReading);

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-3 pb-12 pt-3 sm:px-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 p-5 text-white shadow-xl sm:p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-300">
                <Sprout className="h-3.5 w-3.5" /> Beta · Tahap Pengembangan
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                Prototipe IoT ESP32 + LoRa 922 MHz
              </span>
              {weatherData?.waktu && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 font-mono text-[11px] text-teal-200">
                  {weatherData.waktu.siang ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
                  {weatherData.waktu.jam_teks} {weatherData.waktu.tz_label}
                </span>
              )}
            </div>

            <h1 className="font-display text-xl font-black tracking-tight text-white sm:text-2xl">
              Telemetri Lahan & Peringatan Dini Kebakaran
            </h1>
            <p className="max-w-3xl text-xs leading-relaxed text-slate-300 sm:text-sm">
              Pemantauan kelembapan tanah, mikroklimat BMKG desa (<span className="font-bold text-white">{weatherData ? `${weatherData.bmkg.lokasi.desa}, Kec. ${weatherData.bmkg.lokasi.kecamatan}` : "Memuat..."}</span>), indeks kekeringan Van Wagner FFMC, serta indikasi kesiapan tanam berbasis data rill.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            <button
              type="button"
              onClick={() => void loadAll({ forceFreshBmkg: true })}
              disabled={loading}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Sinkronkan BMKG
            </button>
          </div>
        </div>

        {/* Hardware Unit Selector Strip */}
        {(weatherData?.daftar_alat?.length || 0) > 0 && (
          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-400">Unit:</span>
            {weatherData!.daftar_alat.map((u) => {
              const isSelected = u.alat_id === selectedUnit?.alat_id;
              return (
                <button
                  key={u.alat_id}
                  type="button"
                  onClick={() => setSelectedUnitId(u.alat_id)}
                  className={`inline-flex min-h-[36px] shrink-0 items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                    isSelected
                      ? "border-emerald-400 bg-emerald-500 text-white shadow-md"
                      : "border-white/15 bg-white/10 text-slate-200 hover:bg-white/15"
                  }`}
                >
                  <Radio className="h-3.5 w-3.5" />
                  <span>{u.label}</span>
                  {u.sensor_ringkas?.lembap != null && (
                    <span className="rounded-md bg-black/25 px-1.5 py-0.5 font-mono text-[10px]">
                      {u.sensor_ringkas.lembap.toFixed(0)}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Inline Toast / Honest Alerts */}
      {toastMsg && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> {toastMsg}
          </span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Galat jaringan telemetri: {errorMsg}</span>
        </div>
      )}

      {weatherData && !weatherData.bmkg.sumber_ok && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-amber-300/80 bg-amber-50/90 px-4 py-3 text-xs text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-200">
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-bold">Sumber prakiraan BMKG tidak merespons saat ini</p>
            <p className="mt-0.5 opacity-90">
              {weatherData.bmkg.pesan_galat || "Koneksi api.bmkg.go.id terputus."} Metrik cuaca dan FFMC ditampilkan kosong (-- / OFFLINE) untuk menjaga kejujuran data.
            </p>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/90 p-1.5 shadow-sm no-scrollbar dark:border-slate-800 dark:bg-slate-900/90">
        {(
          [
            { id: "ringkasan", label: "Sensor & Kendali Node", icon: Activity },
            { id: "cuaca", label: "FFMC, Kompas & Tanam", icon: Flame },
            { id: "wilayah", label: "Wilayah & GPS Alat", icon: MapPin },
            { id: "modul", label: "Modul & Ekspansi", icon: Cpu },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex min-h-[40px] shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                active
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: SENSOR & KENDALI NODE */}
      {activeTab === "ringkasan" && (
        <div className="space-y-5">
          {!hasHardwareData && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
              <Radio className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="font-bold">Menunggu sinkronisasi stasiun lapangan ESP32 (/api/sinkron)</p>
                <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                  Belum ada paket telemetri fisik masuk pada sesi ini. Nilai sensor ditampilkan kosong (--) tanpa angka simulasi palsu. Data cuaca BMKG & FFMC di tab sebelah tetap berjalan normal dari server BMKG.
                </p>
              </div>
            </div>
          )}

          {/* 4 Sensor KPI Cards */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>Kelembapan Tanah</span>
                <Droplets className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="mt-2 font-mono text-2xl font-black text-slate-900 dark:text-white">
                {moistureValue !== null ? `${moistureValue.toFixed(1)}%` : "--"}
              </div>
              <p className={`mt-1 text-xs font-bold ${moistureStatus.tone}`}>{moistureStatus.label}</p>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>Suhu Node / Cuaca</span>
                <Thermometer className="h-4 w-4 text-amber-500" />
              </div>
              <div className="mt-2 font-mono text-2xl font-black text-slate-900 dark:text-white">
                {currentReading?.suhu != null
                  ? `${currentReading.suhu.toFixed(1)}°C`
                  : weatherData?.bmkg.saat_ini.suhu != null
                    ? `${weatherData.bmkg.saat_ini.suhu}°C`
                    : "--"}
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {currentReading?.suhu != null ? "NTC Node Lapangan" : "Acuan BMKG Desa"}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>Tegangan Baterai</span>
                <Battery className="h-4 w-4 text-teal-500" />
              </div>
              <div className="mt-2 font-mono text-2xl font-black text-slate-900 dark:text-white">
                {currentReading?.baterai != null ? `${currentReading.baterai.toFixed(2)} V` : "--"}
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {currentReading?.baterai != null ? (currentReading.baterai >= 3.7 ? "Daya aman" : "Perlu pengisian") : "Belum ada data baterai"}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>Tautan LoRa & Gateway</span>
                <Wifi className="h-4 w-4 text-indigo-500" />
              </div>
              <div className="mt-2 font-mono text-2xl font-black text-slate-900 dark:text-white">
                {currentReading?.rssi != null ? `${currentReading.rssi} dBm` : "--"}
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {primaryStation
                  ? `Gateway ${primaryStation.nama} · ${primaryStation.lora_ok !== false ? "LoRa Siap" : "LoRa Terputus"}`
                  : "Gateway rumah belum sinkron"}
              </p>
            </div>
          </div>

          {/* Command & Delivery Schedule Controls */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-sm lg:col-span-6 dark:border-slate-800 dark:bg-slate-900/90">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Perintah Sampel Langsung (Node {activeNodeNumber})
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Meminta stasiun rumah membangunkan node lapangan melalui ACK LoRa untuk pengukuran seketika.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleRequestSample()}
                  disabled={cmdBusy}
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  <Send className="h-3.5 w-3.5" />
                  {cmdBusy ? "Memproses..." : "Ambil Sampel"}
                </button>
              </div>

              {activeCmd && (
                <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      ID Perintah #{activeCmd.id} · Node {activeCmd.node}
                    </span>
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold uppercase text-emerald-700 dark:text-emerald-300">
                      {activeCmd.status}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-1.5">
                    {COMMAND_STEPS.map((step, idx) => {
                      const order = ["menunggu", "diambil", "diteruskan", "selesai"];
                      const currentIdx = order.indexOf(activeCmd.status);
                      const reached = currentIdx >= idx;
                      return (
                        <div
                          key={step.key}
                          className={`rounded-xl px-2 py-1.5 text-center text-[10px] font-bold ${
                            reached
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-200/70 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {step.label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-sm lg:col-span-6 dark:border-slate-800 dark:bg-slate-900/90">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Ritme Pengiriman & Hemat Daya Malam
                  </h3>
                </div>
                {telemetryData?.pengiriman && (
                  <span className="rounded-full bg-teal-500/15 px-2.5 py-0.5 text-[11px] font-bold text-teal-700 dark:text-teal-300">
                    Efektif: {telemetryData.pengiriman.mode_efektif} ({telemetryData.pengiriman.interval_efektif} dtk)
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  { label: "Realtime (1 dtk)", mode: "terus" as const, interval: 1 },
                  { label: "Normal (4 dtk)", mode: "jadwal" as const, interval: 4 },
                  { label: "Hemat (15 dtk)", mode: "jadwal" as const, interval: 15 },
                  { label: "Ekstra Hemat (30 dtk)", mode: "jadwal" as const, interval: 30 },
                ].map((preset) => {
                  const isCurrent =
                    telemetryData?.pengiriman.mode === preset.mode &&
                    telemetryData?.pengiriman.interval_detik === preset.interval;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      disabled={deliveryBusy}
                      onClick={() => void handleToggleDelivery({ mode: preset.mode, interval_detik: preset.interval })}
                      className={`min-h-[36px] rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                        isCurrent
                          ? "border-teal-500 bg-teal-600 text-white shadow-sm"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              <label className="mt-4 flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/70 px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-800/40">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                    <Moon className="h-3.5 w-3.5 text-indigo-500" /> Otomatis Hemat Daya Malam (18.00–06.00)
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Memperlambat interval kirim saat malam hari agar baterai node awet.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(telemetryData?.pengiriman.hemat_malam)}
                  disabled={deliveryBusy}
                  onChange={(e) =>
                    void handleToggleDelivery({
                      hemat_malam: e.target.checked,
                      interval_malam_detik: telemetryData?.pengiriman.interval_malam_detik ?? 30,
                    })
                  }
                  className="h-5 w-5 accent-emerald-600"
                />
              </label>
            </div>
          </div>

          {/* Trend Charts */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Riwayat Kelembapan Tanah & Suhu Node
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Data 24 jam terakhir dari sensor lapangan yang masuk ke server.
              </p>
              <div className="mt-4 h-64 w-full">
                {sensorChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sensorChartData}>
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                      <XAxis dataKey="waktu" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="lembap" name="Lembap (%)" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                      <Line type="monotone" dataKey="suhu" name="Suhu (°C)" stroke="#f59e0b" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    Belum ada riwayat pembacaan sensor pada rentang 24 jam ini.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Prakiraan Cuaca BMKG Per 3 Jam
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Suhu udara (°C), kelembapan udara (%), dan potensi curah hujan (mm).
              </p>
              <div className="mt-4 h-64 w-full">
                {bmkgChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={bmkgChartData}>
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                      <XAxis dataKey="jam" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="hujan" name="Hujan (mm)" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                      <Line type="monotone" dataKey="suhu" name="Suhu (°C)" stroke="#f59e0b" strokeWidth={2.5} />
                      <Line type="monotone" dataKey="rh" name="RH (%)" stroke="#0d9488" strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    Data grafik prakiraan BMKG tidak tersedia saat offline.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CUACA, FFMC, KOMPAS & WAKTU TANAM */}
      {activeTab === "cuaca" && weatherData && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <FfmcGaugeChart ffmc={weatherData.ffmc} />
            </div>
            <div className="lg:col-span-6">
              <FieldCompassCard
                compass={weatherData.kompas_dan_angin}
                jarakRumahLapanganKm={weatherData.peta.jarak_rumah_lapangan_km}
                gpsLoading={gpsBusy}
                onUseDeviceGps={handleUseDeviceGps}
              />
            </div>
          </div>

          {/* Rain report & Planting readiness */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="space-y-4 rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-sm lg:col-span-5 dark:border-slate-800 dark:bg-slate-900/90">
              <div className="flex items-center gap-2">
                <CloudRain className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Catatan Hujan Lapangan (24 Jam: {weatherData.hujan.total_24jam_mm} mm)
                </h3>
              </div>

              <form onSubmit={handleSaveRain} className="grid grid-cols-1 gap-2.5 sm:grid-cols-12">
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  max={500}
                  value={rainMm}
                  onChange={(e) => setRainMm(e.target.value)}
                  placeholder="Curah (mm)"
                  className="min-h-[40px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-900 sm:col-span-4 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <input
                  type="text"
                  maxLength={80}
                  value={rainNote}
                  onChange={(e) => setRainNote(e.target.value)}
                  placeholder="Catatan (opsional, mis. gerimis sore)"
                  className="min-h-[40px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 sm:col-span-5 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={actionBusy}
                  className="min-h-[40px] rounded-xl bg-blue-600 px-3 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-60 sm:col-span-3"
                >
                  Simpan
                </button>
              </form>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {weatherData.hujan.riwayat.length > 0 ? (
                  weatherData.hujan.riwayat.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50/80 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-800/40"
                    >
                      <div>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{item.curah_mm} mm</span>
                        <span className="ml-2 text-slate-500 dark:text-slate-400">{item.tanggal}</span>
                        {item.catatan && <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.catatan}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDeleteRain(item.id)}
                        aria-label="Hapus laporan hujan"
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Belum ada laporan hujan petani untuk wilayah ini.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4 rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-sm lg:col-span-7 dark:border-slate-800 dark:bg-slate-900/90">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sprout className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Indikasi Kesiapan Waktu Tanam
                  </h3>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                    weatherData.waktu_tanam.nada === "siap"
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : weatherData.waktu_tanam.nada === "belum"
                        ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                        : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                  }`}
                >
                  {weatherData.waktu_tanam.indikasi}
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 text-xs leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
                <p className="font-semibold text-slate-900 dark:text-white">{weatherData.waktu_tanam.alasan}</p>
                <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  {weatherData.waktu_tanam.catatan_penyuluh}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="block space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Dasarian Berjalan (&gt;50 mm)
                  </span>
                  <select
                    value={dasarianNow}
                    onChange={(e) => setDasarianNow(e.target.value as "rendah" | "sedang" | "tinggi")}
                    className="min-h-[40px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="rendah">Rendah</option>
                    <option value="sedang">Sedang</option>
                    <option value="tinggi">Tinggi</option>
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Dasarian Berikutnya (&gt;50 mm)
                  </span>
                  <select
                    value={dasarianNext}
                    onChange={(e) => setDasarianNext(e.target.value as "rendah" | "sedang" | "tinggi")}
                    className="min-h-[40px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="rendah">Rendah</option>
                    <option value="sedang">Sedang</option>
                    <option value="tinggi">Tinggi</option>
                  </select>
                </label>

                <div className="flex items-end">
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => void handleSaveDasarian()}
                    className="min-h-[40px] w-full rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    Perbarui Dasarian
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: WILAYAH BMKG & LOKASI ALAT */}
      {activeTab === "wilayah" && weatherData && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="space-y-4 rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-sm lg:col-span-6 dark:border-slate-800 dark:bg-slate-900/90">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Mode Rujukan & Kalibrasi GPS Unit
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["otomatis", "alat", "pengguna", "manual"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setLocationMode(m);
                    void loadAll({ modeOverride: m });
                  }}
                  className={`min-h-[38px] rounded-xl border px-3 py-1.5 text-xs font-bold capitalize transition ${
                    locationMode === m
                      ? "border-emerald-500 bg-emerald-600 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-800/40">
              <p className="text-slate-500 dark:text-slate-400">Wilayah Prakiraan BMKG Aktif:</p>
              <p className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">
                {weatherData.bmkg.lokasi.desa}, Kec. {weatherData.bmkg.lokasi.kecamatan}, {weatherData.bmkg.lokasi.kotkab}
              </p>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Kode ADM4: <span className="font-mono font-bold">{weatherData.wilayah.adm4}</span> · Sumber: {weatherData.wilayah.sumber_aktif}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCalibrateToolWithGps}
                disabled={gpsBusy}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                <MapPin className="h-3.5 w-3.5" />
                Tetapkan Lokasi {selectedUnit?.label || "Unit"} via GPS
              </button>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                Pilihan Cepat Desa Kecamatan Ngoro (SMAN 1 Ngoro):
              </p>
              <div className="grid max-h-56 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
                {weatherData.wilayah.daftar_desa.map((d) => (
                  <button
                    key={d.adm4}
                    type="button"
                    onClick={() => void handleSelectAdm4(d.adm4, false)}
                    className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold transition ${
                      weatherData.wilayah.adm4 === d.adm4
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200"
                        : "border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300"
                    }`}
                  >
                    {d.nama}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-sm lg:col-span-6 dark:border-slate-800 dark:bg-slate-900/90">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Cari Desa / Kelurahan Seluruh Indonesia
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Resolusi kode ADM4 BMKG resmi menggunakan hierarki Provinsi → Kabupaten/Kota → Kecamatan → Desa/Kelurahan.
            </p>

            <div className="space-y-3">
              <select
                value={selProv}
                onChange={(e) => void handleProvinceChange(e.target.value)}
                className="min-h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">-- Pilih Provinsi --</option>
                {provinces.map((p) => (
                  <option key={p.code} value={p.code}>{p.name}</option>
                ))}
              </select>

              <select
                value={selReg}
                disabled={!regencies.length}
                onChange={(e) => void handleRegencyChange(e.target.value)}
                className="min-h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-900 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">-- Pilih Kabupaten / Kota --</option>
                {regencies.map((r) => (
                  <option key={r.code} value={r.code}>{r.name}</option>
                ))}
              </select>

              <select
                value={selDist}
                disabled={!districts.length}
                onChange={(e) => void handleDistrictChange(e.target.value)}
                className="min-h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-900 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">-- Pilih Kecamatan --</option>
                {districts.map((d) => (
                  <option key={d.code} value={d.code}>{d.name}</option>
                ))}
              </select>

              <select
                value={selVil}
                disabled={!villages.length}
                onChange={(e) => setSelVil(e.target.value)}
                className="min-h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-900 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">-- Pilih Desa / Kelurahan --</option>
                {villages.map((v) => (
                  <option key={v.code} value={v.code}>{v.name} ({v.code})</option>
                ))}
              </select>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  disabled={!selVil || actionBusy}
                  onClick={() => void handleSelectAdm4(selVil, false)}
                  className="min-h-[40px] flex-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-700"
                >
                  Lihat Cuaca Desa Ini
                </button>
                <button
                  type="button"
                  disabled={!selVil || actionBusy}
                  onClick={() => void handleSelectAdm4(selVil, true)}
                  className="min-h-[40px] flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  Simpan Lokasi Alat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MODUL & ARSITEKTUR */}
      {activeTab === "modul" && weatherData && (
        <ExpansionArchitecturePanel
          katalogModul={weatherData.pengaturan.katalog_modul}
          activeModules={activeModules}
          ambang={activeAmbang}
          selectedNode={activeNodeNumber}
          saving={actionBusy}
          onSaveModules={async (node, modul) => {
            setActionBusy(true);
            try {
              const res = await postWeatherAction({
                aksi: "atur_modul",
                node,
                modul,
                aktif_adm4: weatherData.wilayah.adm4,
                aktif_alat: selectedUnitId,
                aktif_mode: locationMode,
              });
              setWeatherData(res);
              showToast(res.pesan || `Modul Node ${node} disimpan`);
            } catch (err) {
              showToast(err instanceof Error ? err.message : "Gagal menyimpan modul");
            } finally {
              setActionBusy(false);
            }
          }}
          onSaveThresholds={async (node, cfg) => {
            setActionBusy(true);
            try {
              const res = await postWeatherAction({
                aksi: "atur_ambang",
                node,
                ...cfg,
                aktif_adm4: weatherData.wilayah.adm4,
                aktif_alat: selectedUnitId,
                aktif_mode: locationMode,
              });
              setWeatherData(res);
              showToast(res.pesan || `Ambang Node ${node} disimpan`);
            } catch (err) {
              showToast(err instanceof Error ? err.message : "Gagal menyimpan ambang");
            } finally {
              setActionBusy(false);
            }
          }}
        />
      )}
    </div>
  );
};

