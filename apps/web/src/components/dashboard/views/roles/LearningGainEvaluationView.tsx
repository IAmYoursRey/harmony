import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  TrendingUp,
  Target,
  Clock,
  Activity,
  Award,
  GraduationCap,
  Download,
  Search,
  CheckCircle2,
  FileSpreadsheet,
  BookOpen,
  School,
  ExternalLink,
  ChevronRight,
  Filter,
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  HARMONY_EMPIRICAL_VALIDATION_SUMMARY,
  HARMONY_SLIDE_13_PARAMETERS,
  HARMONY_CLASS_TRIAL_SUMMARIES,
  HARMONY_STUDENT_TRIAL_RECORDS,
  maskNamePrivacy,
  maskEmailPrivacy,
  maskIdPrivacy,
  type StudentTrialRecord,
} from "@/data/learningGainData";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import { isDemoNgoroUser } from "@/utils/demoSchool";

const PARAMETER_SUBTITLES: Record<string, string> = {
  learning_gain: "Kenaikan skor pre-test ke post-test",
  decision_accuracy: "Ketepatan memilih tindakan & rute",
  response_efficiency: "Bertindak dalam waktu < 15 detik",
  learning_consistency: "Stabilitas saat skenario diubah",
  transfer_of_learning: "Simulasi kesiapsiagaan di lapangan",
};

export function LearningGainEvaluationView() {
  const { show } = useToast();
  const { currentUser } = useAuth();
  const summary = HARMONY_EMPIRICAL_VALIDATION_SUMMARY;

  const isDemoMode = !currentUser || isDemoNgoroUser(currentUser) || Boolean((currentUser as any)?.isDemo);
  const [privacyMode, setPrivacyMode] = useState<boolean>(true);
  const [selectedClassId, setSelectedClassId] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredStudents = useMemo(() => {
    return summary.students.filter((s) => {
      const matchClass = selectedClassId === "ALL" || s.classId === selectedClassId;
      const matchCategory = selectedCategory === "ALL" || s.hakeCategory === selectedCategory;
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        !query ||
        s.name.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        s.className.toLowerCase().includes(query);
      return matchClass && matchCategory && matchSearch;
    });
  }, [summary.students, selectedClassId, selectedCategory, searchQuery]);

  const displayedStudents = useMemo(() => {
    return filteredStudents.map((s) => ({
      ...s,
      displayName: privacyMode ? maskNamePrivacy(s.name) : s.name,
      displayEmail: privacyMode ? maskEmailPrivacy(s.email) : s.email,
      displayId: privacyMode ? maskIdPrivacy(s.id) : s.id,
    }));
  }, [filteredStudents, privacyMode]);

  const handleExportCSV = () => {
    const headers = [
      "No",
      "ID Siswa",
      "Nama Siswa",
      "Email",
      "Kelas",
      "Pre-Test (Awal)",
      "Post-Test (Akhir)",
      "N-Gain (Hake)",
      "Kategori Hake",
      "Akurasi Keputusan (%)",
      "Waktu Respons (detik)",
      "Respons < 15s",
      "Konsistensi Belajar (%)",
      "Transfer Nyata (%)",
    ];

    const rows = displayedStudents.map((s, idx) => [
      idx + 1,
      s.displayId,
      s.displayName,
      s.displayEmail,
      s.className,
      s.preTestScore,
      s.postTestScore,
      s.nGain,
      s.hakeCategory,
      s.decisionAccuracy,
      s.responseTimeSeconds,
      s.isResponseUnder15s ? "Ya" : "Tidak",
      s.learningConsistency,
      s.transferScore,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = privacyMode
      ? `HARMONY_Uji_Learning_Gain_${summary.totalStudentsTested}_Siswa_Privasi_Inisial.csv`
      : `HARMONY_Uji_Learning_Gain_${summary.totalStudentsTested}_Siswa_SMAN1_Ngoro.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    show(
      privacyMode
        ? `Laporan CSV ${summary.totalStudentsTested} siswa berhasil diunduh dengan Mode Privasi (inisial a*** b***).`
        : `Laporan CSV ${summary.totalStudentsTested} siswa berhasil diunduh dengan nama lengkap.`,
      "success"
    );
  };

  const chartData = useMemo(() => {
    return summary.classes.map((c) => ({
      name: c.className,
      "Pre-Test (Ceramah/Awal)": c.avgPreTest,
      "Post-Test (HARMONY)": c.avgPostTest,
      "N-Gain": c.avgNGain,
    }));
  }, [summary.classes]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-brand-900 to-slate-900 p-5 text-white shadow-lg border border-indigo-500/20 sm:p-6">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:32px_32px] opacity-10" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/30">
              <Sparkles className="h-3 w-3" />
              <span>Validasi Slide 13 PPT</span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-white">
              Hasil Evaluasi &amp; Learning Gain Siswa
            </h2>
            <p className="max-w-2xl text-xs sm:text-sm text-indigo-100/90 leading-relaxed">
              Uji coba <strong>{summary.totalStudentsTested} siswa ({summary.totalClasses} rombel)</strong> SMAN 1 Ngoro. Rata-rata <strong>N-Gain = 0,74</strong> (Kategori Tinggi, skor 46,5 &rarr; 86,1).
            </p>
          </div>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-brand-900 shadow hover:bg-brand-50 active:scale-95 transition-all shrink-0"
          >
            <Download className="h-4 w-4 text-brand-700" />
            <span>Unduh CSV</span>
          </button>
        </div>

        {/* Quick Badges */}
        <div className="relative mt-4 flex flex-wrap gap-2 pt-3 border-t border-white/10 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-white">
            <School className="h-3.5 w-3.5 text-brand-300" /> SMAN 1 Ngoro ({summary.totalClasses} Rombel)
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-white">
            <GraduationCap className="h-3.5 w-3.5 text-brand-300" /> {summary.totalStudentsTested} Siswa Terdaftar
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-white">
            <BookOpen className="h-3.5 w-3.5 text-brand-300" /> Richard R. Hake (1998)
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/25 px-2.5 py-1 font-semibold text-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> p &lt; 0.0001 (Signifikan)
          </span>
        </div>
      </div>

      {/* Ringkasan Uji Coba */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-950 dark:bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-1">
          <span className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            Capaian 5 Indikator Utama Uji Coba:
          </span>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Seluruh target terlampaui: N-Gain <strong>0,74</strong> (min. 0,7), Akurasi <strong>85%</strong> (min. 80%), Respons &lt;15s <strong>87%</strong> (min. 80%), Konsistensi <strong>89%</strong> (min. 85%), dan Transfer Lapangan <strong>83%</strong> (min. 80%).
          </p>
        </div>
        <details className="shrink-0 text-[11px] text-indigo-600 dark:text-indigo-400 cursor-pointer">
          <summary className="font-semibold hover:underline">Narasi Lengkap Slide 13</summary>
          <div className="mt-2 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 italic text-slate-700 dark:text-slate-300 max-w-xl">
            &ldquo;{summary.officialTrialNarrative}&rdquo;
          </div>
        </details>
      </div>

      {/* 5 Slide 13 Parameter Cards */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink-500 dark:text-slate-400">
            5 Parameter Keberhasilan Slide 13
          </h3>
          <span className="text-xs text-brand-600 dark:text-brand-400 font-semibold">
            Semua Target Tercapai 100%
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {HARMONY_SLIDE_13_PARAMETERS.map((p) => {
            const isGain = p.id === "learning_gain";
            const isCrucial = p.isCrucialBenchmark;
            return (
              <div
                key={p.id}
                className={`relative overflow-hidden rounded-xl p-3.5 transition-all border ${
                  isGain
                    ? "bg-gradient-to-b from-brand-50/80 to-white dark:from-brand-950/40 dark:to-slate-900 border-brand-300 dark:border-brand-600 shadow-sm ring-1 ring-brand-400/30"
                    : isCrucial
                    ? "bg-gradient-to-b from-amber-50/50 to-white dark:from-amber-950/20 dark:to-slate-900 border-amber-300 dark:border-amber-700/60 shadow-xs"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs"
                }`}
              >
                {isCrucial && (
                  <div className="absolute top-2 right-2 rounded-full bg-amber-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                    Krusial
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-white ${
                      isGain ? "bg-brand-600" : "bg-slate-700 dark:bg-slate-800"
                    }`}
                  >
                    {p.id === "learning_gain" && <TrendingUp className="h-3.5 w-3.5" />}
                    {p.id === "decision_accuracy" && <Target className="h-3.5 w-3.5" />}
                    {p.id === "response_efficiency" && <Clock className="h-3.5 w-3.5" />}
                    {p.id === "learning_consistency" && <Activity className="h-3.5 w-3.5" />}
                    {p.id === "transfer_of_learning" && <Award className="h-3.5 w-3.5" />}
                  </span>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-ink-900 dark:text-white truncate">
                      {p.name}
                    </h4>
                    <p className="text-[10px] text-ink-400 dark:text-slate-500 font-mono truncate">
                      {p.englishName}
                    </p>
                  </div>
                </div>

                <div className="mt-2.5">
                  <div className="flex items-baseline justify-between">
                    <span className="font-display text-2xl font-black text-ink-900 dark:text-white">
                      {p.achievedFormatted}
                    </span>
                    <span className="rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 px-1.5 py-0.5 text-[10px] font-bold">
                      {p.status}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Target:</span>
                    <strong className="text-ink-800 dark:text-slate-200">{p.target}</strong>
                  </div>
                </div>

                <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-1.5">
                  {PARAMETER_SUBTITLES[p.id] || p.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Formula Normalized Gain Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm text-ink-900 dark:text-white flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-brand-600" />
            Formula Normalized Gain (Hake, 1998)
          </h3>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 font-mono text-xs dark:border-slate-800 dark:bg-slate-950/60 text-ink-800 dark:text-slate-200 space-y-1.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-1.5">
            <span className="font-bold text-brand-600 dark:text-brand-400">
              Formula:
            </span>
            <span className="text-xs font-bold bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
              g = (Post-Test - Pre-Test) / (100 - Pre-Test)
            </span>
          </div>

          <div className="text-[11px]">
            <strong>Perhitungan Agregat SMAN 1 Ngoro:</strong>
            <div className="mt-0.5 pl-2 border-l-2 border-brand-500 text-ink-700 dark:text-slate-300">
              g = ({summary.overallMetrics.avgPostTest} - {summary.overallMetrics.avgPreTest}) / (100 - {summary.overallMetrics.avgPreTest}) = {summary.overallMetrics.scoreDifference} / {Math.round((100 - summary.overallMetrics.avgPreTest) * 10) / 10} = <strong className="text-emerald-600 dark:text-emerald-400">{summary.overallMetrics.normalizedGain}</strong> (Tinggi, g &ge; 0,70)
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-2 dark:border-emerald-900/40 dark:bg-emerald-950/20 text-center">
            <span className="font-bold text-emerald-800 dark:text-emerald-300 block">
              g &ge; 0,70
            </span>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
              Tinggi (HARMONY: <strong>0,74</strong>)
            </span>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-2 dark:border-amber-900/40 dark:bg-amber-950/20 text-center">
            <span className="font-bold text-amber-800 dark:text-amber-300 block">
              0,30 &le; g &lt; 0,70
            </span>
            <span className="text-[10px] text-amber-700 dark:text-amber-400">
              Sedang
            </span>
          </div>
          <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-2 dark:border-rose-900/40 dark:bg-rose-950/20 text-center">
            <span className="font-bold text-rose-800 dark:text-rose-300 block">
              g &lt; 0,30
            </span>
            <span className="text-[10px] text-rose-700 dark:text-rose-400">
              Rendah
            </span>
          </div>
        </div>
      </div>

      {/* Class Comparison Chart */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="font-bold text-sm text-ink-900 dark:text-white flex items-center gap-2">
              <School className="h-4 w-4 text-brand-600" />
              Pre-Test vs Post-Test per Rombel
            </h3>
            <p className="text-xs text-ink-500 dark:text-slate-400">
              Rata-rata skor meningkat dari 46,5 ke 86,1 di seluruh 10 kelas (N-Gain 0,74).
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="h-2.5 w-2.5 rounded-xs bg-slate-400 inline-block" /> Pre-Test
            </span>
            <span className="flex items-center gap-1.5 text-brand-600 dark:text-brand-400">
              <span className="h-2.5 w-2.5 rounded-xs bg-brand-600 inline-block" /> Post-Test
            </span>
          </div>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.95)",
                  borderRadius: "10px",
                  border: "none",
                  color: "#fff",
                  fontSize: "11px",
                }}
              />
              <Bar dataKey="Pre-Test (Ceramah/Awal)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Post-Test (HARMONY)" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/80 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-brand-600" />
            <h3 className="font-bold text-sm text-ink-900 dark:text-white">
              Data Nilai Siswa ({filteredStudents.length} dari {summary.totalStudentsTested})
            </h3>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama..."
                className="rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 pl-7 pr-2.5 py-1 text-xs text-ink-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 px-2.5 py-1 text-xs text-ink-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="ALL">Semua Kelas ({summary.totalClasses} Rombel)</option>
              {summary.classes.map((c) => (
                <option key={c.classId} value={c.classId}>
                  Kelas {c.className} ({c.studentCount})
                </option>
              ))}
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 px-2.5 py-1 text-xs text-ink-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="Tinggi">Tinggi (g &ge; 0,70)</option>
              <option value="Sedang">Sedang (0,30 &le; g &lt; 0,70)</option>
            </select>
          </div>
        </div>

        {/* Privacy Mode Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2.5 border border-slate-200/80 dark:border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                privacyMode ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>
            <div className="text-xs">
              <span className="font-bold text-ink-900 dark:text-white mr-1.5">
                Mode Privasi Siswa:
              </span>
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  privacyMode
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                }`}
              >
                {privacyMode ? "Aktif (Inisial a*** b***)" : "Nama Lengkap Terbuka"}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-2">
                {privacyMode
                  ? "Sesuai UU PDP (inisial a*** b***)."
                  : "Mode internal evaluasi."}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              setPrivacyMode((prev) => !prev);
              show(
                !privacyMode
                  ? "Mode Privasi Aktif (inisial a*** b***)."
                  : "Mode Nama Lengkap Aktif.",
                "info"
              );
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-ink-800 dark:text-slate-100 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all shrink-0"
          >
            {privacyMode ? (
              <>
                <Eye className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
                <span>Buka Nama Lengkap</span>
              </>
            ) : (
              <>
                <EyeOff className="h-3.5 w-3.5 text-slate-500" />
                <span>Samarkan Nama (a*** b***)</span>
              </>
            )}
          </button>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-ink-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2 px-3">No</th>
                <th className="py-2 px-3">
                  Nama Siswa {privacyMode && <span className="font-normal text-emerald-600 dark:text-emerald-400">(Inisial a*** b***)</span>}
                </th>
                <th className="py-2 px-3">Kelas</th>
                <th className="py-2 px-3 text-center">Pre-Test</th>
                <th className="py-2 px-3 text-center">Post-Test</th>
                <th className="py-2 px-3 text-center">N-Gain (g)</th>
                <th className="py-2 px-3 text-center">Kategori Hake</th>
                <th className="py-2 px-3 text-center">Akurasi</th>
                <th className="py-2 px-3 text-center">Waktu Respons</th>
                <th className="py-2 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-ink-800 dark:text-slate-200">
              {displayedStudents.slice(0, 50).map((s, idx) => (
                <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                  <td className="py-2 px-3">
                    <span className="font-semibold block font-mono">{s.displayName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{s.displayEmail}</span>
                  </td>
                  <td className="py-2 px-3 font-medium">{s.className}</td>
                  <td className="py-2 px-3 text-center text-slate-500 font-mono">
                    {s.preTestScore}
                  </td>
                  <td className="py-2 px-3 text-center font-bold text-brand-600 dark:text-brand-400 font-mono">
                    {s.postTestScore}
                  </td>
                  <td className="py-2 px-3 text-center font-mono font-bold">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded ${
                        s.nGain >= 0.7
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                      }`}
                    >
                      {s.nGain}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        s.hakeCategory === "Tinggi"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                      }`}
                    >
                      {s.hakeCategory}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center font-mono">
                    {s.decisionAccuracy}%
                  </td>
                  <td className="py-2 px-3 text-center font-mono">
                    <span className={s.isResponseUnder15s ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600"}>
                      {s.responseTimeSeconds}s
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" /> Lulus SPAB
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredStudents.length > 50 && (
          <p className="text-[11px] text-center text-slate-400 italic">
            Menampilkan 50 dari {filteredStudents.length} siswa. Unduh CSV untuk data lengkap.
          </p>
        )}
      </div>
    </div>
  );
}
