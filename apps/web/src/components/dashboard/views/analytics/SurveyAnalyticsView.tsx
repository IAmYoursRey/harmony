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
import {
  Donut,
  RadarChart,
  Sparkline,
  BarChart,
  GroupedBarChart,
  PieChart,
  DonutChart,
} from "@/components/dashboard/Charts";
import {
  SmartReadinessIndex,
  calculateReadinessIndex,
} from "@/components/SmartReadinessIndex";
import { motion } from "framer-motion";
import {
  RadarChart as RechartsRadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";
import { useI18n } from "@/hooks/useI18n";
import { useSchool } from "@/hooks/useSchool";
import { useToast } from "@/hooks/useToast";
import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getAllProfiles, type UserProfile } from "@/data/userProfiles";
import { getAllAccounts, type UserAccount } from "@/data/accounts";
import { getAllSchools } from "@/services/schoolService";
import type { School as SchoolData } from "@/data/schoolsTypes";
import { getSurveyStats, type SurveyStats } from "@/services/surveyService";
import { LoadingState } from "@/components/ui/LoadingState";

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`glass rounded-2xl p-5 transition-all hover:shadow-glass dark:bg-slate-900/60 ${className}`}
    >
      {children}
    </div>
  );
}

export function SurveyAnalyticsView() {
  const { show } = useToast();
  const { t } = useI18n();
  const { selection } = useSchool();

  const [surveyStats, setSurveyStats] = useState<SurveyStats | null>(null);
  const [surveyLoading, setSurveyLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setSurveyLoading(true);
      try {
        const data = await getSurveyStats(selection?.school.id);
        if (!cancelled) setSurveyStats(data.stats);
      } catch {
        if (!cancelled) setSurveyStats(null);
      } finally {
        if (!cancelled) setSurveyLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selection?.school.id]);

  const hasData = surveyStats && surveyStats.totalRespondents > 0;

  const handleDownloadReport = () => {
    if (!surveyStats) {
      show("Data survei belum tersedia.", "info");
      return;
    }
    const rows = [
      ["Metrik", "Nilai"],
      ["Responden", surveyStats.totalRespondents],
      ["Skor rata-rata", `${surveyStats.averageScore}%`],
      ["Tingkat penyelesaian", `${surveyStats.completionRate}%`],
      ["Modul tuntas", surveyStats.totalSurveys],
    ];
    const csv = rows
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","),
      )
      .join("\\n");
    const blob = new Blob([`\\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "harmony-survey-report.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    show("Laporan survei berhasil diunduh.", "success");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-6 text-white shadow-glass-lg sm:p-8">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:36px_36px] opacity-15" />
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              <BarChart3 aria-hidden="true" className="h-3.5 w-3.5" />{" "}
              <span>{t("nav.survey")}</span>
            </div>
            <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              {t("survey.header.title")}
            </h2>
            <p className="mt-1.5 max-w-md text-sm text-brand-100">
              {t("survey.header.desc")}
            </p>
          </div>
          <button
            onClick={handleDownloadReport}
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-brand-700 shadow-glass transition-all hover:-translate-y-0.5 hover:shadow-glow"
          >
            <Download aria-hidden="true" className="h-4 w-4" />{" "}
            <span>{t("survey.header.download")}</span>
          </button>
        </div>
      </div>

      {/* Empirical Trial & Learning Gain Banner (Slide 13 PPT) */}
      <div className="rounded-2xl border border-brand-200 bg-gradient-to-r from-indigo-50/90 via-white to-brand-50/80 p-5 shadow-sm dark:border-indigo-900/40 dark:bg-slate-900/80 dark:from-slate-900 dark:to-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              <Sparkles className="h-3 w-3" />
              <span>Evaluasi Empiris SPAB — Normalized Learning Gain</span>
            </div>
            <h3 className="font-display text-base font-extrabold text-ink-900 dark:text-white">
              Uji Coba Efektivitas 320 Siswa SMAN 1 Ngoro: N-Gain = 0,74 (Kategori Tinggi)
            </h3>
            <p className="text-xs text-ink-500 dark:text-slate-400 max-w-2xl">
              Tercatat lonjakan pemahaman mitigasi bencana dari rata-rata Pre-Test <strong>46,5</strong> menjadi Post-Test <strong>86,1</strong> (Formula Richard R. Hake 1998, p &lt; 0,0001, Cohen&apos;s d = 1,84).
            </p>
          </div>
          <Link
            to="/app/learning-gain"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-700 transition-all shrink-0"
          >
            <span>Buka Laporan Validasi 320 Siswa</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-5 gap-2 pt-3 border-t border-slate-200/60 dark:border-slate-800 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Learning Gain:</span>
            <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">0,74 (Tinggi)</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Decision Accuracy:</span>
            <strong className="text-ink-800 dark:text-slate-200 font-mono font-bold">85% (Target min. 80%)</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Respons &lt; 15s:</span>
            <strong className="text-ink-800 dark:text-slate-200 font-mono font-bold">87% (Target min. 80%)</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Konsistensi:</span>
            <strong className="text-ink-800 dark:text-slate-200 font-mono font-bold">89% (Target min. 85%)</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Transfer Nyata:</span>
            <strong className="text-ink-800 dark:text-slate-200 font-mono font-bold">83% (Target min. 80%)</strong>
          </div>
        </div>
      </div>

      {surveyLoading ? (
        <LoadingState message="Memuat analitik survei..." />
      ) : !hasData ? (
        /* Empty state — no survey data submitted yet */
        <div className="glass rounded-2xl p-8 text-center dark:bg-slate-900/60">
          <BarChart3
            aria-hidden="true"
            className="mx-auto h-12 w-12 text-brand-300 dark:text-brand-700 mb-4"
          />
          <h3 className="text-lg font-bold text-ink-900 dark:text-white mb-2">
            {t("survey.empty.title", "Belum Ada Data Survei")}
          </h3>
          <p className="text-sm text-ink-500 dark:text-slate-400">
            {t(
              "survey.empty.desc",
              "Survei akan tersedia setelah siswa mengumpulkan respons untuk sekolah ini.",
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-up">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Users,
                label: t("survey.stat.respondents", "Responden"),
                value: String(surveyStats!.totalRespondents),
                sub: t(
                  "survey.stat.respondents.sub",
                  "Total partisipasi siswa",
                ),
              },
              {
                icon: TrendingUp,
                label: t("survey.stat.avg", "Skor Rata-rata"),
                value: `${surveyStats!.averageScore}%`,
                sub: t("survey.stat.avg.sub", "Pemahaman keseluruhan"),
              },
              {
                icon: GraduationCap,
                label: t("survey.stat.comp", "Tingkat Penyelesaian"),
                value: `${surveyStats!.completionRate}%`,
                sub: t("survey.stat.comp.sub", "Rasio kelulusan"),
              },
              {
                icon: FileText,
                label: t("survey.stat.surveys", "Modul Tuntas"),
                value: String(surveyStats!.totalSurveys),
                sub: t("survey.stat.surveys.sub", "Survei terkumpul"),
              },
            ].map((s) => (
              <Card key={s.label}>
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl text-brand-600 bg-brand-100">
                    <s.icon className="h-5 w-5" />
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-brand-500" />
                </div>
                <p className="mt-3 font-display text-2xl font-extrabold text-ink-900 dark:text-white">
                  {s.value}
                </p>
                <p className="text-xs text-ink-500 dark:text-slate-400">
                  {s.label}
                </p>
                <p className="mt-1 text-[11px] font-medium text-brand-600 dark:text-brand-400">
                  {s.sub}
                </p>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <Card className="min-h-[300px] flex flex-col">
              <h3 className="font-display text-base font-bold text-ink-900 dark:text-white flex items-center gap-2 mb-6">
                <BarChart3 className="h-5 w-5 text-brand-500" /> Distribusi Skor
                Kesiapsiagaan
              </h3>
              <div className="w-full max-w-full overflow-hidden flex-1 min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={surveyStats?.scoreDistribution || []}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e2e8f0"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "transparent" }}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                    <Bar dataKey="value" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="min-h-[300px] flex flex-col">
              <h3 className="font-display text-base font-bold text-ink-900 dark:text-white flex items-center gap-2 mb-6">
                <PieIcon className="h-5 w-5 text-indigo-500" /> Kategori
                Kerentanan
              </h3>
              <div className="w-full max-w-full overflow-hidden flex-1 min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={surveyStats?.vulnerabilityCategories || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {["#3b82f6", "#f59e0b", "#ef4444", "#10b981"].map(
                        (color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ),
                      )}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-2 text-[10px] font-semibold text-slate-500">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500" /> Banjir
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-amber-500" /> Gempa
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500" /> Tsunami
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
