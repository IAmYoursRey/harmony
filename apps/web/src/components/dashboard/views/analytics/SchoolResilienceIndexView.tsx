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
        const schoolId = selection?.school?.id || currentProfile?.schoolId;
        if (!schoolId) {
          if (!cancelled) setLoading(false);
          return;
        }
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
              <ShieldCheck className="h-3.5 w-3.5" /> Indeks Resiliensi Sekolah
            </div>
            <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              Skor Kesiapsiagaan: {selection?.school?.name || "Sekolah Anda"}
            </h2>
            <p className="mt-1.5 max-w-md text-sm text-brand-100">
              Analisis komprehensif berdasarkan performa {metrics?.len || 0}{" "}
              siswa dalam kuis dan kembaran digital.
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
    </div>
  );
}
