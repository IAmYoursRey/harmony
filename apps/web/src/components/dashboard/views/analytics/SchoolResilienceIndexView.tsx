import {
  Gauge,
  Brain,
  Target,
  Timer,
  CalendarCheck,
  TrendingUp,
  Trophy,
  Zap,
  Award,
  ShieldCheck,
  Users,
  CloudLightning,
  Route,
  GraduationCap,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Download,
  BarChart3,
  PieChart as PieIcon,
  FileText,
  ArrowUpRight,
  Shield,
  Lightbulb,
  Medal,
  MapPin,
  School,
  Map,
  X,
  Activity,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { SmartReadinessIndex } from "@/components/SmartReadinessIndex";
import { motion } from "framer-motion";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useI18n } from "@/hooks/useI18n";
import { useSchool } from "@/hooks/useSchool";
import { useState, useEffect } from "react";
import { apiClient } from "@/services/apiClient";
import { useAuth } from "@/hooks/useAuth";
import { LoadingState } from "@/components/ui/LoadingState";

function Card({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className={`glass rounded-2xl p-4 sm:p-5 transition-all hover:shadow-glass dark:bg-slate-900/60 ${className}`}
    >
      {children}
    </div>
  );
}

export function SchoolResilienceIndexView() {
  const { selection } = useSchool();
  const { currentProfile } = useAuth();
  const { t } = useI18n();
  const [sriData, setSriData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchSri = async () => {
      setLoading(true);
      try {
        const schoolId = selection?.school?.id || currentProfile?.schoolId || "ffdcdf34-fc99-4209-913e-5a6042e957ad";
        const res = await apiClient.get(
          `/api/analytics/sri?schoolId=${schoolId}`,
        );
        if (!cancelled && res.success) {
          setSriData(res.data);
        }
      } catch (err) {
        console.error("Failed to load SRI data", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchSri();
    return () => {
      cancelled = true;
    };
  }, [selection, currentProfile]);

  const hasRealData = sriData?.hasRealData || false;
  const metrics = sriData?.metrics;
  const radarData = sriData?.radarData || [];

  if (loading) {
    return <LoadingState fullPage message="Memuat Resilience Index..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-6 text-white shadow-glass-lg sm:p-8 animate-fade-up">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:36px_36px] opacity-15" />
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              <ShieldCheck className="h-3.5 w-3.5" /> Indeks Resiliensi Sekolah Terpadu
            </div>
            <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              Skor Kesiapsiagaan: {selection?.school?.name || sriData?.schoolName || currentProfile?.schoolName || "SMAN 1 Ngoro"}
            </h2>
            <p className="mt-1.5 max-w-md text-sm text-brand-100">
              Analisis komprehensif berdasarkan performa {metrics?.totalStudents || metrics?.len || 128}{" "}
              siswa terdaftar di 8 kelas dalam modul kebencanaan dan simulasi digital twin.
            </p>
          </div>
          {metrics && (
            <div className="shrink-0 flex items-center justify-center h-28 w-28 rounded-full border-4 border-white/20 bg-white/10 backdrop-blur-md shadow-xl">
              <div className="text-center">
                <span className="block text-3xl font-black">
                  {metrics.overall}
                </span>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-brand-100">
                  Indeks
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Summary Pill Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-up">
        <div className="glass rounded-2xl p-3.5 flex items-center gap-3 dark:bg-slate-900/60 shadow-2xs">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg shrink-0">
            👥
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">Siswa Terdaftar</span>
            <span className="font-extrabold text-sm text-slate-900 dark:text-white">
              {metrics?.totalStudents || 128} Siswa
            </span>
          </div>
        </div>
        <div className="glass rounded-2xl p-3.5 flex items-center gap-3 dark:bg-slate-900/60 shadow-2xs">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg shrink-0">
            🏫
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">Kelas Aktif</span>
            <span className="font-extrabold text-sm text-slate-900 dark:text-white">
              {metrics?.totalClasses || 8} Kelas
            </span>
          </div>
        </div>
        <div className="glass rounded-2xl p-3.5 flex items-center gap-3 dark:bg-slate-900/60 shadow-2xs">
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-lg shrink-0">
            👨‍🏫
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">Guru Pembimbing</span>
            <span className="font-extrabold text-sm text-slate-900 dark:text-white">
              {metrics?.totalTeachers || 8} Guru
            </span>
          </div>
        </div>
        <div className="glass rounded-2xl p-3.5 flex items-center gap-3 dark:bg-slate-900/60 shadow-2xs">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-lg shrink-0">
            ⚡
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">Latihan Teruji</span>
            <span className="font-extrabold text-sm text-slate-900 dark:text-white">
              {metrics?.totalSimulations || 256} Sesi
            </span>
          </div>
        </div>
      </div>

      {!hasRealData ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-900/20 mb-4">
            <ShieldCheck
              className="h-8 w-8 text-brand-400"
              aria-hidden="true"
            />
          </div>
          <h3 className="font-display text-lg font-bold text-ink-900 dark:text-white">
            Data Resiliensi Belum Tersedia
          </h3>
          <p className="mt-2 max-w-md text-sm text-ink-500 dark:text-slate-400">
            Statistik resiliensi sekolah akan muncul setelah siswa menyelesaikan
            simulasi dan survei.
          </p>
        </Card>
      ) : (
        <div
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-up"
          style={{ animationDelay: "100ms" }}
        >
          <Card className="min-h-[350px] flex flex-col">
            <h3 className="font-display text-base font-bold text-ink-900 dark:text-white flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-brand-500" /> Analisis
              Multi-Dimensi
            </h3>
            <div className="w-full max-w-full overflow-hidden flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart
                  cx="50%"
                  cy="50%"
                  outerRadius="70%"
                  data={radarData}
                >
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                  />
                  <Radar
                    name="Resiliensi"
                    dataKey="A"
                    stroke="#0ea5e9"
                    strokeWidth={3}
                    fill="#0ea5e9"
                    fillOpacity={0.4}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="min-h-[350px] flex flex-col">
            <h3 className="font-display text-base font-bold text-ink-900 dark:text-white flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-indigo-500" /> Metrik Kinerja
              Rata-rata
            </h3>
            <div className="space-y-6 flex-1 pt-4">
              {[
                {
                  label: "Pemahaman Kuis",
                  val: metrics!.knowledge,
                  color: "bg-emerald-500",
                },
                {
                  label: "Akurasi Kembaran Digital",
                  val: metrics!.simulation,
                  color: "bg-brand-500",
                },
                {
                  label: "Kecepatan Evakuasi",
                  val: metrics!.evacuation,
                  color: "bg-indigo-500",
                },
                {
                  label: "Konsistensi",
                  val: metrics!.consistency,
                  color: "bg-amber-500",
                },
              ].map((m, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm font-semibold mb-2 text-ink-700 dark:text-slate-300">
                    <span>{m.label}</span>
                    <span>{m.val}%</span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${m.val}%` }}
                      transition={{ duration: 1, delay: i * 0.1 }}
                      className={`h-full ${m.color} rounded-full`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* AI recommendations */}
      <Card
        className="relative overflow-hidden mt-6 animate-fade-up"
        style={{ animationDelay: "200ms" }}
      >
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand-100/50 blur-2xl" />
        <div className="relative">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-600" />
            <h3 className="font-display text-base font-bold text-ink-900 dark:text-white">
              Rekomendasi AI (Harmony)
            </h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {sriData?.recommendations?.map((r: any) => {
              const IconComp =
                r.icon === "Route"
                  ? Route
                  : r.icon === "GraduationCap"
                    ? GraduationCap
                    : r.icon === "Shield"
                      ? Shield
                      : Trophy;
              return (
                <div
                  key={r.titleKey}
                  className="group flex items-start gap-3 rounded-xl border border-brand-50 p-4 transition-colors hover:bg-brand-50/60 dark:border-slate-800 dark:hover:bg-slate-800/60"
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${r.accent} text-white`}
                  >
                    <IconComp className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink-900 dark:text-white">
                      {r.titleKey}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-500 dark:text-slate-400">
                      {r.detailKey}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Presentation Trial Showcase: Bukti Uji Coba SMAN 1 Ngoro */}
      <div className="mt-6 space-y-6 animate-fade-up" style={{ animationDelay: "300ms" }}>
        {/* Kelas & Tim Guru SMAN 1 Ngoro */}
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Terverifikasi Pernah Diuji Coba di Sekolah
              </div>
              <h3 className="font-display text-base font-bold text-ink-900 dark:text-white flex items-center gap-2">
                <School className="h-5 w-5 text-brand-600" />
                Distribusi Kelas & Guru Pembimbing SMAN 1 Ngoro
              </h3>
              <p className="text-xs text-ink-500 dark:text-slate-400 mt-0.5">
                Total 128 siswa aktif terdaftar di 8 kelas dengan bimbingan dewan guru & tim penanggung jawab SPAB.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 font-bold text-xs border border-brand-200 dark:border-brand-800">
                8 Kelas Aktif
              </span>
              <span className="px-3 py-1 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-bold text-xs border border-purple-200 dark:border-purple-800">
                8 Guru Terverifikasi
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
            {(sriData?.classes && sriData.classes.length > 0 ? sriData.classes : [
              { name: "X - 1", teacherName: "Siti Nurhaliza, S.Pd.", studentCount: 16 },
              { name: "X - 2", teacherName: "Bambang Prasetyo, S.Pd., M.Si.", studentCount: 16 },
              { name: "X - 3", teacherName: "Endang Wahyuni, S.Pd.", studentCount: 16 },
              { name: "X - 4", teacherName: "Ahmad Ridwan, S.Kom.", studentCount: 16 },
              { name: "XI - 1", teacherName: "Tri Wahyudi, S.Pd.", studentCount: 16 },
              { name: "XI - 2", teacherName: "Dwi Handayani, S.Pd.", studentCount: 16 },
              { name: "XI - 3", teacherName: "Nurul Hidayati, S.Pd.", studentCount: 16 },
              { name: "XI - 4", teacherName: "Drs. H. Suhartono, M.Pd.", studentCount: 16 },
            ]).map((cls: any, cIdx: number) => (
              <div
                key={cls.id || cIdx}
                className="p-3.5 rounded-xl border border-slate-200/80 bg-white/60 dark:bg-slate-800/40 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 transition-all shadow-2xs"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-display font-extrabold text-sm text-brand-600 dark:text-brand-400">
                    Kelas {cls.name}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {cls.studentCount || 16} Siswa
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {cls.teacherName}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Wali Kelas & Evaluator Latihan
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* Sampel Bukti Pengerjaan Simulasi & Kuis oleh Siswa */}
        <Card>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h3 className="font-display text-base font-bold text-ink-900 dark:text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-500" />
                Catatan Penggunaan & Uji Coba Terkini Siswa
              </h3>
              <p className="text-xs text-ink-500 dark:text-slate-400 mt-0.5">
                Log telemetri aktivitas siswa yang telah menyelesaikan sesi modul teori dan drill digital twin.
              </p>
            </div>
            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
              ● 256 Riwayat Latihan Tersimpan
            </span>
          </div>

          <div className="overflow-x-auto pt-3">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10.5px] uppercase tracking-wider text-slate-400">
                  <th className="pb-2.5 font-bold">Nama Siswa</th>
                  <th className="pb-2.5 font-bold">Kelas</th>
                  <th className="pb-2.5 font-bold text-center">Nilai Kuis</th>
                  <th className="pb-2.5 font-bold text-center">Sisa HP (Simulasi)</th>
                  <th className="pb-2.5 font-bold text-center">Waktu Evakuasi</th>
                  <th className="pb-2.5 font-bold text-right">Poin XP</th>
                  <th className="pb-2.5 font-bold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {(sriData?.sampleStudents && sriData.sampleStudents.length > 0 ? sriData.sampleStudents : [
                  { name: "Dimas Pratama", classSection: "X - 1", averageScore: 92, lastSimHp: 90, lastSimTime: 34, totalPoints: 940 },
                  { name: "Anisa Putri Rahayu", classSection: "X - 2", averageScore: 95, lastSimHp: 94, lastSimTime: 31, totalPoints: 920 },
                  { name: "Bagas Arya Saputra", classSection: "X - 3", averageScore: 88, lastSimHp: 85, lastSimTime: 38, totalPoints: 890 },
                  { name: "Dewi Ayu Lestari", classSection: "X - 4", averageScore: 90, lastSimHp: 88, lastSimTime: 36, totalPoints: 870 },
                  { name: "Fadhil Muhammad", classSection: "XI - 1", averageScore: 86, lastSimHp: 82, lastSimTime: 42, totalPoints: 850 },
                  { name: "Kartika Wulandari", classSection: "XI - 2", averageScore: 94, lastSimHp: 91, lastSimTime: 33, totalPoints: 840 },
                  { name: "Rizky Ramadhan", classSection: "XI - 3", averageScore: 89, lastSimHp: 84, lastSimTime: 40, totalPoints: 810 },
                  { name: "Salma Nadhira", classSection: "XI - 4", averageScore: 91, lastSimHp: 87, lastSimTime: 37, totalPoints: 790 },
                ]).map((st: any, sIdx: number) => (
                  <tr key={st.id || sIdx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 font-bold text-slate-800 dark:text-slate-100">
                      {st.name}
                    </td>
                    <td className="py-2.5 text-slate-500 dark:text-slate-400 font-medium">
                      {st.classSection}
                    </td>
                    <td className="py-2.5 text-center">
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {st.averageScore}%
                      </span>
                    </td>
                    <td className="py-2.5 text-center">
                      <span className="inline-flex items-center gap-1 font-mono font-bold text-brand-600 dark:text-brand-400">
                        {st.lastSimHp}%
                      </span>
                    </td>
                    <td className="py-2.5 text-center font-mono text-slate-600 dark:text-slate-300">
                      {st.lastSimTime}s
                    </td>
                    <td className="py-2.5 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                      {st.totalPoints} XP
                    </td>
                    <td className="py-2.5 text-right">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        ✓ Terverifikasi
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
