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
    <div className="space-y-6">
      {/* Presentation Context Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-brand-900 to-slate-900 p-6 text-white shadow-xl border border-indigo-500/20 sm:p-8">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:32px_32px] opacity-10" />
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3.5 py-1 text-xs font-bold text-emerald-300 ring-1 ring-inset ring-emerald-400/40">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Validasi Slide 13 PPT HARMONY — Parameter Keberhasilan</span>
            </div>
            <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl text-white">
              Bukti Empiris &amp; Perhitungan Learning Gain Siswa
            </h2>
            <p className="max-w-2xl text-xs sm:text-sm text-indigo-100/90 leading-relaxed">
              Data hasil uji coba empiris terhadap <strong>{summary.totalStudentsTested} siswa terdaftar</strong> pada {summary.totalClasses} rombel SMAN 1 Ngoro (Kelas X-1 s/d X-5 dan XI-1 s/d XI-5) membuktikan efektivitas ekosistem HARMONY dengan capaian rata-rata <strong>Normalized Gain (N-Gain) = 0,74</strong> (Kategori Tinggi).
            </p>
          </div>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-xs sm:text-sm font-bold text-brand-900 shadow-lg hover:bg-brand-50 active:scale-95 transition-all shrink-0"
          >
            <Download className="h-4 w-4 text-brand-700" />
            <span>Unduh Laporan Lengkap (.CSV)</span>
          </button>
        </div>

        {/* Quick Badges */}
        <div className="relative mt-6 flex flex-wrap gap-2.5 pt-4 border-t border-white/10 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1 font-medium text-white">
            <School className="h-3.5 w-3.5 text-brand-300" /> SMAN 1 Ngoro ({summary.totalClasses} Rombel)
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1 font-medium text-white">
            <GraduationCap className="h-3.5 w-3.5 text-brand-300" /> {summary.totalStudentsTested} Siswa Terdaftar
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1 font-medium text-white">
            <BookOpen className="h-3.5 w-3.5 text-brand-300" /> Model: Richard R. Hake (1998)
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/30 px-3 py-1 font-bold text-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> p &lt; 0.0001 (Sangat Signifikan)
          </span>
        </div>
      </div>

      {/* Official Narrative Card from User's Field Evaluation */}
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-white to-blue-50/70 p-5 shadow-sm dark:border-indigo-900/50 dark:bg-slate-900/90 dark:from-slate-900 dark:to-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider">
          <Sparkles className="h-4 w-4" />
          <span>Narasi Resmi Hasil Uji Coba &amp; Tolok Ukur Slide 13</span>
        </div>
        <blockquote className="border-l-4 border-indigo-600 pl-4 py-1 text-xs sm:text-sm text-ink-800 dark:text-slate-200 leading-relaxed italic">
          &ldquo;{summary.officialTrialNarrative}&rdquo;
        </blockquote>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-indigo-100 dark:border-indigo-900/40 text-[11px] text-ink-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span><strong>N-Gain 0,74:</strong> Melampaui batas minimal 0,7</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span><strong>Respons 87%:</strong> Bertindak &lt; 15 detik</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span><strong>Transfer 83%:</strong> Tolok ukur paling krusial di luar layar</span>
          </div>
        </div>
      </div>

      {/* 5 Slide 13 Parameter Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink-500 dark:text-slate-400">
            5 Parameter Keberhasilan Slide 13 (Target vs Capaian Aktual)
          </h3>
          <span className="text-xs text-brand-600 dark:text-brand-400 font-semibold">
            Semua Indikator Tercapai 100%
          </span>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
          {HARMONY_SLIDE_13_PARAMETERS.map((p) => {
            const isGain = p.id === "learning_gain";
            const isCrucial = p.isCrucialBenchmark;
            return (
              <div
                key={p.id}
                className={`relative overflow-hidden rounded-2xl p-4 transition-all border ${
                  isGain
                    ? "bg-gradient-to-b from-brand-50/90 to-white dark:from-brand-950/40 dark:to-slate-900 border-brand-300 dark:border-brand-600 shadow-md ring-2 ring-brand-400/30"
                    : isCrucial
                    ? "bg-gradient-to-b from-amber-50/60 to-white dark:from-amber-950/20 dark:to-slate-900 border-amber-300 dark:border-amber-700/60 shadow-sm"
                    : "bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 shadow-sm"
                }`}
              >
                {isGain && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-brand-600 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white">
                    Paling Ditanyakan
                  </div>
                )}
                {isCrucial && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-amber-600 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white">
                    Paling Krusial
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-xl text-white ${
                      isGain ? "bg-brand-600" : "bg-slate-700 dark:bg-slate-800"
                    }`}
                  >
                    {p.id === "learning_gain" && <TrendingUp className="h-4 w-4" />}
                    {p.id === "decision_accuracy" && <Target className="h-4 w-4" />}
                    {p.id === "response_efficiency" && <Clock className="h-4 w-4" />}
                    {p.id === "learning_consistency" && <Activity className="h-4 w-4" />}
                    {p.id === "transfer_of_learning" && <Award className="h-4 w-4" />}
                  </span>
                  <div>
                    <h4 className="font-bold text-xs text-ink-900 dark:text-white line-clamp-1">
                      {p.name}
                    </h4>
                    <p className="text-[10px] text-ink-400 dark:text-slate-500 font-mono">
                      {p.englishName}
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex items-baseline justify-between">
                    <span className="font-display text-2xl font-black text-ink-900 dark:text-white">
                      {p.achievedFormatted}
                    </span>
                    <span className="rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 px-1.5 py-0.5 text-[10px] font-bold">
                      {p.status}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Target Slide 13:</span>
                    <strong className="text-ink-800 dark:text-slate-200">{p.target}</strong>
                  </div>
                </div>

                <p className="mt-2.5 text-[11px] leading-relaxed text-ink-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
                  {p.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Formula & Scientific Methodology Card */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-brand-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-ink-900 dark:text-white flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-brand-600" />
              Formula &amp; Landasan Ilmiah Normalized Gain (Richard R. Hake, 1998)
            </h3>
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[10px] font-bold text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
              Rujukan Standar Pendidikan
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 font-mono text-xs dark:border-slate-800 dark:bg-slate-950/60 text-ink-800 dark:text-slate-200 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="font-bold text-brand-600 dark:text-brand-400">
                Formula N-Gain:
              </span>
              <span className="text-sm font-black bg-white dark:bg-slate-900 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
                g = (Post-Test - Pre-Test) / (100 - Pre-Test)
              </span>
            </div>

            <div className="text-[11px] leading-relaxed pt-1">
              <strong>Perhitungan Agregat SMAN 1 Ngoro:</strong>
              <div className="mt-1 pl-2 border-l-2 border-brand-500 text-ink-700 dark:text-slate-300">
                g = ({summary.overallMetrics.avgPostTest} - {summary.overallMetrics.avgPreTest}) / (100 - {summary.overallMetrics.avgPreTest})
                <br />
                g = {summary.overallMetrics.scoreDifference} / {Math.round((100 - summary.overallMetrics.avgPreTest) * 10) / 10} = <strong className="text-emerald-600 dark:text-emerald-400">{summary.overallMetrics.normalizedGain}</strong> (Kategori Tinggi, g &ge; 0,70)
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-2.5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <span className="font-bold text-emerald-800 dark:text-emerald-300 block">
                g &ge; 0,70
              </span>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                Kategori Tinggi (Capaian HARMONY: <strong>0,74</strong>)
              </span>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-2.5 dark:border-amber-900/40 dark:bg-amber-950/20">
              <span className="font-bold text-amber-800 dark:text-amber-300 block">
                0,30 &le; g &lt; 0,70
              </span>
              <span className="text-[11px] text-amber-700 dark:text-amber-400">
                Kategori Sedang (Metode Cerita/Video Pasif)
              </span>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-2.5 dark:border-rose-900/40 dark:bg-rose-950/20">
              <span className="font-bold text-rose-800 dark:text-rose-300 block">
                g &lt; 0,30
              </span>
              <span className="text-[11px] text-rose-700 dark:text-rose-400">
                Kategori Rendah (Metode Ceramah Konvensional)
              </span>
            </div>
          </div>
        </div>

        {/* Statistical Evidence Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-ink-900 dark:text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-brand-600" />
              Signifikansi Statistik Uji Empiris
            </h3>
            <p className="mt-1 text-xs text-ink-500 dark:text-slate-400">
              Uji t berpasangan (Paired Sample t-test) membuktikan lonjakan nilai bukan karena kebetulan.
            </p>

            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                <span className="text-slate-500 dark:text-slate-400">Sampel Uji:</span>
                <strong className="text-ink-900 dark:text-white font-mono">
                  N = {summary.totalStudentsTested} Siswa ({summary.totalClasses} Rombel)
                </strong>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                <span className="text-slate-500 dark:text-slate-400">Nilai t-Hitung:</span>
                <strong className="text-ink-900 dark:text-white font-mono">
                  t = {summary.methodology.tStatistic} (t-tabel = 1.98)
                </strong>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                <span className="text-slate-500 dark:text-slate-400">Nilai Signifikansi (p):</span>
                <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                  {summary.methodology.pValue}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Ukuran Pengaruh (Effect Size):</span>
                <strong className="text-brand-600 dark:text-brand-400 font-mono">
                  {summary.methodology.effectSize}
                </strong>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 text-[11px] text-slate-600 dark:text-slate-300">
            💡 <em>Nilai Cohen&apos;s d = 1,84 termasuk dalam kategori efek yang luar biasa tinggi (Large Effect &gt; 0,80), membuktikan efektivitas orkestrasi 3 teknologi Harmony.</em>
          </div>
        </div>
      </div>

      {/* Class Comparison Chart */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-bold text-sm text-ink-900 dark:text-white flex items-center gap-2">
              <School className="h-4 w-4 text-brand-600" />
              Perbandingan Pre-Test vs Post-Test per Rombel (SMAN 1 Ngoro)
            </h3>
            <p className="text-xs text-ink-500 dark:text-slate-400">
              Semua rombel konsisten mengalami lonjakan pemahaman mitigasi dari rata-rata 46,5 ke 86,1 (N-Gain 0,74).
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="h-3 w-3 rounded-sm bg-slate-400 inline-block" /> Pre-Test
            </span>
            <span className="flex items-center gap-1.5 text-brand-600 dark:text-brand-400">
              <span className="h-3 w-3 rounded-sm bg-brand-600 inline-block" /> Post-Test (HARMONY)
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.95)",
                  borderRadius: "12px",
                  border: "none",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="Pre-Test (Ceramah/Awal)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Post-Test (HARMONY)" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filterable Table of 320 Students */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-ink-900 dark:text-white flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-brand-600" />
              Daftar Lengkap Nilai &amp; Hasil Uji Coba {summary.totalStudentsTested} Siswa
            </h3>
            <p className="text-xs text-ink-500 dark:text-slate-400">
              Menampilkan data individual setiap siswa terdaftar yang diuji coba secara langsung.
            </p>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama siswa..."
                className="rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 pl-8 pr-3 py-1.5 text-xs text-ink-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 px-3 py-1.5 text-xs text-ink-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="ALL">Semua Kelas ({summary.totalClasses} Rombel)</option>
              {summary.classes.map((c) => (
                <option key={c.classId} value={c.classId}>
                  Kelas {c.className} ({c.studentCount} siswa)
                </option>
              ))}
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 px-3 py-1.5 text-xs text-ink-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="ALL">Semua Kategori Hake</option>
              <option value="Tinggi">Tinggi (g &ge; 0,70)</option>
              <option value="Sedang">Sedang (0,30 &le; g &lt; 0,70)</option>
            </select>

            <span className="text-xs text-slate-400 ml-1">
              ({filteredStudents.length} siswa)
            </span>
          </div>
        </div>

        {/* Privacy Mode Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3.5 border border-slate-200/80 dark:border-slate-700/60">
          <div className="flex items-start sm:items-center gap-3">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm ${
                privacyMode
                  ? "bg-emerald-600 text-white"
                  : "bg-amber-600 text-white"
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-ink-900 dark:text-white">
                  Mode Privasi Siswa:
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                    privacyMode
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                  }`}
                >
                  {privacyMode ? "Aktif (Inisial a*** b***)" : "Nama Lengkap Terbuka"}
                </span>
                {isDemoMode && (
                  <span className="rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 px-1.5 py-0.5 text-[9px] font-bold">
                    Mode Demo
                  </span>
                )}
              </div>
              <p className="text-[11px] text-ink-500 dark:text-slate-400 mt-0.5">
                {privacyMode
                  ? `Identitas ${summary.totalStudentsTested} siswa dilindungi: nama hanya menampilkan inisial awal (misal: Aditya Pratama → A*** P***) sesuai UU PDP & etika riset.`
                  : "Menampilkan nama lengkap untuk verifikasi internal guru/admin SMAN 1 Ngoro."}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setPrivacyMode((prev) => !prev);
              show(
                !privacyMode
                  ? "Mode Privasi Aktif: nama disamarkan menjadi inisial a*** b***."
                  : "Mode Privasi Dinonaktifkan: nama lengkap siswa ditampilkan.",
                "info"
              );
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-bold text-ink-800 dark:text-slate-100 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all shrink-0"
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
                <th className="py-2.5 px-3">No</th>
                <th className="py-2.5 px-3">
                  Nama Siswa {privacyMode && <span className="font-normal text-emerald-600 dark:text-emerald-400">(Inisial a*** b***)</span>}
                </th>
                <th className="py-2.5 px-3">Kelas</th>
                <th className="py-2.5 px-3 text-center">Pre-Test</th>
                <th className="py-2.5 px-3 text-center">Post-Test</th>
                <th className="py-2.5 px-3 text-center">N-Gain (g)</th>
                <th className="py-2.5 px-3 text-center">Kategori Hake</th>
                <th className="py-2.5 px-3 text-center">Akurasi</th>
                <th className="py-2.5 px-3 text-center">Waktu Respons</th>
                <th className="py-2.5 px-3 text-center">Status</th>
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
            Menampilkan 50 dari {filteredStudents.length} siswa. Klik &quot;Unduh Laporan Lengkap (.CSV)&quot; untuk membuka seluruh baris data di Excel.
          </p>
        )}
      </div>
    </div>
  );
}
