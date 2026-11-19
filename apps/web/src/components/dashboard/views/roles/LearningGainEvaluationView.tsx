import { useState, useMemo, useEffect } from "react";
import {
  TrendingUp,
  Target,
  Clock,
  Activity,
  Award,
  GraduationCap,
  Download,
  Search,
  CheckCircle2,
  BookOpen,
  School,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertTriangle,
  XCircle,
  ArrowRight,
  RotateCcw,
  Layers,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Users,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  HARMONY_EMPIRICAL_VALIDATION_SUMMARY,
  HARMONY_SLIDE_13_PARAMETERS,
  HARMONY_INITIAL_TRIAL_PARAMETERS,
  maskNamePrivacy,
  maskEmailPrivacy,
  maskIdPrivacy,
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

type TrialViewMode = "comparison" | "initial" | "final";

export function LearningGainEvaluationView() {
  const { show } = useToast();
  const { currentUser } = useAuth();
  const summary = HARMONY_EMPIRICAL_VALIDATION_SUMMARY;
  const initMetrics = summary.initialTrialMetrics;

  const isDemoMode =
    !currentUser ||
    isDemoNgoroUser(currentUser) ||
    Boolean((currentUser as any)?.isDemo);
  const [privacyMode, setPrivacyMode] = useState<boolean>(true);
  const [trialViewMode, setTrialViewMode] = useState<TrialViewMode>("comparison");
  const [selectedClassId, setSelectedClassId] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedInitialStatus, setSelectedInitialStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  const filteredStudents = useMemo(() => {
    return summary.students.filter((s) => {
      const matchClass = selectedClassId === "ALL" || s.classId === selectedClassId;
      const activeHake =
        trialViewMode === "initial" ? s.initialHakeCategory : s.hakeCategory;
      const matchCategory =
        selectedCategory === "ALL" || activeHake === selectedCategory;
      const matchInitStatus =
        selectedInitialStatus === "ALL" ||
        s.initialSpabStatus === selectedInitialStatus;
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        !query ||
        s.name.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        s.className.toLowerCase().includes(query) ||
        s.initialFailureNote.toLowerCase().includes(query) ||
        s.initialTrialDate.toLowerCase().includes(query) ||
        s.finalTrialDate.toLowerCase().includes(query);
      return matchClass && matchCategory && matchInitStatus && matchSearch;
    });
  }, [
    summary.students,
    selectedClassId,
    selectedCategory,
    selectedInitialStatus,
    searchQuery,
    trialViewMode,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClassId, selectedCategory, selectedInitialStatus, searchQuery, trialViewMode, pageSize]);

  const displayedStudents = useMemo(() => {
    return filteredStudents.map((s) => ({
      ...s,
      displayName: privacyMode ? maskNamePrivacy(s.name) : s.name,
      displayEmail: privacyMode ? maskEmailPrivacy(s.email) : s.email,
      displayId: privacyMode ? maskIdPrivacy(s.id) : s.id,
    }));
  }, [filteredStudents, privacyMode]);

  const totalPages = Math.max(1, Math.ceil(displayedStudents.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, displayedStudents.length);
  const paginatedStudents = useMemo(() => {
    return displayedStudents.slice(startIndex, endIndex);
  }, [displayedStudents, startIndex, endIndex]);

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }, [totalPages]);

  const handleExportCSV = () => {
    const headers = [
      "No",
      "ID Siswa",
      "Nama Siswa",
      "Email",
      "Kelas",
      "Skor Awal",
      "Tanggal Pre-Test (Oktober 2026)",
      "Skor Pre-Test (Oktober)",
      "N-Gain Pre-Test",
      "Kategori Hake Pre-Test",
      "Akurasi Pre-Test (%)",
      "Waktu Respons Pre-Test (detik)",
      "Status Pre-Test (Oktober)",
      "Catatan Evaluasi Pre-Test",
      "Tanggal Post-Test (November 2026)",
      "Skor Post-Test (November)",
      "N-Gain Post-Test (Hake)",
      "Kategori Hake Post-Test",
      "Akurasi Keputusan Post-Test (%)",
      "Waktu Respons Post-Test (detik)",
      "Respons < 15s",
      "Konsistensi Belajar (%)",
      "Transfer Lapangan (%)",
      "Status Akhir SPAB",
    ];

    const rows = displayedStudents.map((s, idx) => [
      idx + 1,
      s.displayId,
      s.displayName,
      s.displayEmail,
      s.className,
      s.preTestScore,
      s.initialTrialDate,
      s.initialPostTestScore,
      s.initialNGain,
      s.initialHakeCategory,
      s.initialDecisionAccuracy,
      s.initialResponseTimeSeconds,
      s.initialSpabStatus,
      s.initialFailureNote,
      s.finalTrialDate,
      s.postTestScore,
      s.nGain,
      s.hakeCategory,
      s.decisionAccuracy,
      s.responseTimeSeconds,
      s.isResponseUnder15s ? "Ya" : "Tidak",
      s.learningConsistency,
      s.transferScore,
      "Lulus SPAB",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = privacyMode
      ? `Evaluasi_Learning_Gain_SMAN1_Ngoro_${summary.totalStudentsTested}_Siswa_Inisial.csv`
      : `Evaluasi_Learning_Gain_SMAN1_Ngoro_${summary.totalStudentsTested}_Siswa.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    show(
      privacyMode
        ? `Data CSV ${summary.totalStudentsTested} siswa berhasil diunduh (Mode Privasi).`
        : `Data CSV ${summary.totalStudentsTested} siswa berhasil diunduh.`,
      "success"
    );
  };

  const chartData = useMemo(() => {
    return summary.classes.map((c) => ({
      name: c.className,
      "Skor Awal": c.avgPreTest,
      "Pre-Test (08-17 Okt)": c.avgInitialPostTest,
      "Post-Test (02-11 Nov)": c.avgPostTest,
      "N-Gain Okt": c.avgInitialNGain,
      "N-Gain Nov": c.avgNGain,
    }));
  }, [summary.classes]);

  const activeParameters =
    trialViewMode === "initial"
      ? HARMONY_INITIAL_TRIAL_PARAMETERS
      : HARMONY_SLIDE_13_PARAMETERS;

  const isInitialMode = trialViewMode === "initial";
  const isFinalMode = trialViewMode === "final";
  const isComparisonMode = trialViewMode === "comparison";

  return (
    <div className="space-y-5" data-demo-mode={isDemoMode ? "true" : "false"}>
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-brand-900 to-slate-900 p-5 text-white shadow-lg border border-indigo-500/20 sm:p-6">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:32px_32px] opacity-10" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/30">
                <Calendar className="h-3 w-3" />
                <span>Evaluasi SPAB &bull; Oktober &ndash; November 2026</span>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-indigo-100">
                <span>Validasi Dosen: 02&ndash;07 Okt 2026</span>
              </div>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-white">
              Hasil Evaluasi &amp; Learning Gain Siswa
            </h2>
            <p className="max-w-3xl text-xs sm:text-sm text-indigo-100/90 leading-relaxed">
              {isInitialMode ? (
                <>
                  Hasil <strong>Pre-Test / Evaluasi Awal (08&ndash;17 Oktober 2026)</strong> pada{" "}
                  <strong>{summary.totalStudentsTested} siswa ({summary.totalClasses} rombel)</strong> SMAN 1 Ngoro. Rata-rata skor hanya naik dari{" "}
                  <strong>46,5 &rarr; 58,8</strong> (<strong>N-Gain = 0,23</strong> — Kategori Rendah;{" "}
                  <strong>{initMetrics.failedStudentsCount} siswa gagal</strong> &amp; {initMetrics.remedialStudentsCount} remedial).
                </>
              ) : isFinalMode ? (
                <>
                  Uji coba <strong>{summary.totalStudentsTested} siswa ({summary.totalClasses} rombel)</strong> SMAN 1 Ngoro pada{" "}
                  <strong>Post-Test (02&ndash;11 November 2026)</strong>. Rata-rata <strong>N-Gain = 0,74</strong> (Kategori Tinggi, skor <strong>46,5 &rarr; 86,1</strong>, 100% siswa lulus SPAB).
                </>
              ) : (
                <>
                  Rekapitulasi uji coba <strong>{summary.totalStudentsTested} siswa ({summary.totalClasses} rombel)</strong> SMAN 1 Ngoro.{" "}
                  Pada <strong>Pre-Test (08&ndash;17 Oktober 2026)</strong> rata-rata skor <strong>58,8</strong> (N-Gain <strong>0,23</strong>; {initMetrics.failedStudentsCount} siswa gagal).{" "}
                  Pada <strong>Post-Test (02&ndash;11 November 2026)</strong> rata-rata skor meningkat ke <strong>86,1</strong> (N-Gain <strong>0,74</strong> — Kategori Tinggi).
                </>
              )}
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
          {!isFinalMode && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/25 px-2.5 py-1 font-semibold text-rose-200">
              <XCircle className="h-3.5 w-3.5 text-rose-300" /> Pre-Test (08&ndash;17 Okt): N-Gain 0,23 ({initMetrics.failedStudentsCount} Gagal)
            </span>
          )}
          {!isInitialMode && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/25 px-2.5 py-1 font-semibold text-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Post-Test (02&ndash;11 Nov): N-Gain 0,74 (p &lt; 0.0001)
            </span>
          )}
        </div>
      </div>

      {/* Perbandingan Pre-Test (Oktober) vs Post-Test (November) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900/90 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-ink-900 dark:text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-brand-600" />
              Perbandingan Hasil Evaluasi: Pre-Test (Oktober) vs Post-Test (November)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pilih tab di kanan untuk melihat komparasi, fokus data Pre-Test Oktober, atau fokus data Post-Test November.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 p-1.5 border border-slate-200 dark:border-slate-700 shrink-0">
            <button
              type="button"
              onClick={() => setTrialViewMode("comparison")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isComparisonMode
                  ? "bg-brand-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700"
              }`}
            >
              Komparasi (Pre-Test vs Post-Test)
            </button>
            <button
              type="button"
              onClick={() => setTrialViewMode("initial")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                isInitialMode
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              }`}
            >
              <AlertTriangle className="h-3 w-3" />
              Pre-Test &mdash; Okt ({initMetrics.failedStudentsCount} Gagal)
            </button>
            <button
              type="button"
              onClick={() => setTrialViewMode("final")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                isFinalMode
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              }`}
            >
              <CheckCircle2 className="h-3 w-3" />
              Post-Test &mdash; Nov
            </button>
          </div>
        </div>

        {/* 4-Step Timeline */}
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 dark:bg-slate-800/60 dark:border-slate-700 p-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 font-bold text-[11px] text-slate-600 dark:text-slate-300">
                <Calendar className="h-3 w-3" /> 02&ndash;07 Okt 2026
              </span>
              <span className="rounded bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 text-[9px] font-bold text-slate-700 dark:text-slate-200">
                Tahap 1
              </span>
            </div>
            <p className="font-bold text-ink-900 dark:text-white mt-1">
              Validasi Awal Dosen
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 leading-snug">
              Validasi instrumen evaluasi, rubrik SPAB, dan prototipe awal oleh dosen pembimbing.
            </p>
          </div>

          <div
            onClick={() => setTrialViewMode("initial")}
            className={`cursor-pointer rounded-xl border p-3 transition-all ${
              isInitialMode
                ? "border-rose-500 bg-rose-50 dark:bg-rose-950/40 ring-2 ring-rose-500/30"
                : "border-rose-200 bg-rose-50/60 dark:bg-rose-950/25 dark:border-rose-800/60 hover:border-rose-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 font-bold text-[11px] text-rose-700 dark:text-rose-300">
                <XCircle className="h-3 w-3" /> 08&ndash;17 Okt 2026
              </span>
              <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                Tahap 2 &bull; Pre-Test
              </span>
            </div>
            <p className="font-bold text-rose-900 dark:text-rose-200 mt-1">
              Evaluasi Pre-Test (Oktober)
            </p>
            <p className="text-rose-800/85 dark:text-rose-300/85 text-[11px] mt-0.5 leading-snug">
              Skor rata-rata 58,8 (N-Gain 0,23 Rendah). Sebanyak <strong>276 dari 320 siswa gagal SPAB</strong>.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 dark:bg-slate-800/60 dark:border-slate-700 p-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 font-bold text-[11px] text-indigo-700 dark:text-indigo-400">
                <RotateCcw className="h-3 w-3" /> 19&ndash;31 Okt 2026
              </span>
              <span className="rounded bg-indigo-100 dark:bg-indigo-950 px-1.5 py-0.5 text-[9px] font-bold text-indigo-800 dark:text-indigo-300">
                Tahap 3
              </span>
            </div>
            <p className="font-bold text-ink-900 dark:text-white mt-1">
              Evaluasi &amp; Revisi Sistem
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 leading-snug">
              Penyederhanaan HUD visual, umpan balik pasca-simulasi, dan latihan variasi blokade rute.
            </p>
          </div>

          <div
            onClick={() => setTrialViewMode("final")}
            className={`cursor-pointer rounded-xl border p-3 transition-all ${
              isFinalMode
                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 ring-2 ring-emerald-500/30"
                : "border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/25 dark:border-emerald-800/60 hover:border-emerald-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 font-bold text-[11px] text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-3 w-3" /> 02&ndash;11 Nov 2026
              </span>
              <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                Tahap 4 &bull; Post-Test
              </span>
            </div>
            <p className="font-bold text-emerald-900 dark:text-emerald-200 mt-1">
              Evaluasi Post-Test (November)
            </p>
            <p className="text-emerald-800/85 dark:text-emerald-300/85 text-[11px] mt-0.5 leading-snug">
              Skor meningkat ke 86,1 (<strong>N-Gain 0,74 Tinggi</strong>). Seluruh <strong>320 siswa (100%) Lulus</strong>.
            </p>
          </div>
        </div>

        {/* Summary Metric Boxes — dynamic based on mode */}
        <div className={`grid gap-3 ${isComparisonMode ? "md:grid-cols-2" : "grid-cols-1"}`}>
          {!isFinalMode && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/40 dark:border-rose-900/50 dark:bg-rose-950/20 p-3.5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-800 dark:text-rose-300">
                  <XCircle className="h-4 w-4 text-rose-600" />
                  Pre-Test — Data Oktober (08&ndash;17 Okt 2026)
                </span>
                <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-[10px] font-bold text-white">
                  {initMetrics.failedStudentsCount} Gagal ({initMetrics.failureRatePercent}%) &bull; {initMetrics.remedialStudentsCount} Remedial
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5 text-center">
                <div className="rounded-lg bg-white dark:bg-slate-900 p-1.5 border border-rose-200/70 dark:border-rose-800/60">
                  <span className="block text-[10px] text-slate-500">N-Gain</span>
                  <strong className="text-sm font-black text-rose-600 dark:text-rose-400">0,23</strong>
                  <span className="block text-[9px] text-rose-600 font-semibold">Rendah</span>
                </div>
                <div className="rounded-lg bg-white dark:bg-slate-900 p-1.5 border border-rose-200/70 dark:border-rose-800/60">
                  <span className="block text-[10px] text-slate-500">Skor Rata2</span>
                  <strong className="text-sm font-black text-rose-600 dark:text-rose-400">58,8</strong>
                  <span className="block text-[9px] text-rose-600 font-semibold">&lt; KKM 75</span>
                </div>
                <div className="rounded-lg bg-white dark:bg-slate-900 p-1.5 border border-rose-200/70 dark:border-rose-800/60">
                  <span className="block text-[10px] text-slate-500">Akurasi</span>
                  <strong className="text-sm font-black text-rose-600 dark:text-rose-400">53%</strong>
                  <span className="block text-[9px] text-rose-600 font-semibold">Min 80%</span>
                </div>
                <div className="rounded-lg bg-white dark:bg-slate-900 p-1.5 border border-rose-200/70 dark:border-rose-800/60">
                  <span className="block text-[10px] text-slate-500">&lt;15 Detik</span>
                  <strong className="text-sm font-black text-rose-600 dark:text-rose-400">34%</strong>
                  <span className="block text-[9px] text-rose-600 font-semibold">Rata2 22,6s</span>
                </div>
                <div className="rounded-lg bg-white dark:bg-slate-900 p-1.5 border border-rose-200/70 dark:border-rose-800/60">
                  <span className="block text-[10px] text-slate-500">Transfer</span>
                  <strong className="text-sm font-black text-rose-600 dark:text-rose-400">49%</strong>
                  <span className="block text-[9px] text-rose-600 font-semibold">Konsist. 51%</span>
                </div>
              </div>
            </div>
          )}

          {!isInitialMode && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20 p-3.5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Post-Test — Data Awal November (02&ndash;11 Nov 2026)
                </span>
                <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold text-white">
                  320 Siswa Lulus SPAB (100%)
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5 text-center">
                <div className="rounded-lg bg-white dark:bg-slate-900 p-1.5 border border-emerald-200/70 dark:border-emerald-800/60">
                  <span className="block text-[10px] text-slate-500">N-Gain</span>
                  <strong className="text-sm font-black text-emerald-600 dark:text-emerald-400">0,74</strong>
                  <span className="block text-[9px] text-emerald-600 font-semibold">+0,51 Tinggi</span>
                </div>
                <div className="rounded-lg bg-white dark:bg-slate-900 p-1.5 border border-emerald-200/70 dark:border-emerald-800/60">
                  <span className="block text-[10px] text-slate-500">Skor Rata2</span>
                  <strong className="text-sm font-black text-emerald-600 dark:text-emerald-400">86,1</strong>
                  <span className="block text-[9px] text-emerald-600 font-semibold">+27,3 Poin</span>
                </div>
                <div className="rounded-lg bg-white dark:bg-slate-900 p-1.5 border border-emerald-200/70 dark:border-emerald-800/60">
                  <span className="block text-[10px] text-slate-500">Akurasi</span>
                  <strong className="text-sm font-black text-emerald-600 dark:text-emerald-400">85%</strong>
                  <span className="block text-[9px] text-emerald-600 font-semibold">+32% Naik</span>
                </div>
                <div className="rounded-lg bg-white dark:bg-slate-900 p-1.5 border border-emerald-200/70 dark:border-emerald-800/60">
                  <span className="block text-[10px] text-slate-500">&lt;15 Detik</span>
                  <strong className="text-sm font-black text-emerald-600 dark:text-emerald-400">87%</strong>
                  <span className="block text-[9px] text-emerald-600 font-semibold">Rata2 11,8s</span>
                </div>
                <div className="rounded-lg bg-white dark:bg-slate-900 p-1.5 border border-emerald-200/70 dark:border-emerald-800/60">
                  <span className="block text-[10px] text-slate-500">Transfer</span>
                  <strong className="text-sm font-black text-emerald-600 dark:text-emerald-400">83%</strong>
                  <span className="block text-[9px] text-emerald-600 font-semibold">Konsist. 89%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5 Indikator Evaluasi Cards */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink-500 dark:text-slate-400">
            {isInitialMode
              ? "5 Indikator Evaluasi — Pre-Test (08–17 Oktober 2026)"
              : isFinalMode
              ? "5 Indikator Evaluasi — Post-Test (02–11 November 2026)"
              : "5 Indikator Evaluasi Kesiapsiagaan (Post-Test November vs Pre-Test Oktober)"}
          </h3>
          <span
            className={`text-xs font-semibold ${
              isInitialMode
                ? "text-rose-600 dark:text-rose-400"
                : "text-brand-600 dark:text-brand-400"
            }`}
          >
            {isInitialMode
              ? `Pre-Test (Okt): Belum Memenuhi Target (${initMetrics.failedStudentsCount} Siswa Gagal)`
              : "Post-Test (Nov): Semua Target Tercapai 100%"}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {activeParameters.map((p, idx) => {
            const slide13Param = HARMONY_SLIDE_13_PARAMETERS[idx];
            const isGain = p.id === "learning_gain";
            const isCrucial = p.isCrucialBenchmark;

            return (
              <div
                key={p.id}
                className={`relative overflow-hidden rounded-xl p-3.5 transition-all border flex flex-col justify-between ${
                  isInitialMode
                    ? "bg-gradient-to-b from-rose-50/70 to-white dark:from-rose-950/30 dark:to-slate-900 border-rose-300 dark:border-rose-700/70 shadow-xs"
                    : isGain
                    ? "bg-gradient-to-b from-brand-50/80 to-white dark:from-brand-950/40 dark:to-slate-900 border-brand-300 dark:border-brand-600 shadow-sm ring-1 ring-brand-400/30"
                    : isCrucial
                    ? "bg-gradient-to-b from-amber-50/50 to-white dark:from-amber-950/20 dark:to-slate-900 border-amber-300 dark:border-amber-700/60 shadow-xs"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs"
                }`}
              >
                <div>
                  {isCrucial && (
                    <div className="absolute top-2 right-2 rounded-full bg-amber-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                      Krusial
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white ${
                        isInitialMode
                          ? "bg-rose-600"
                          : isGain
                          ? "bg-brand-600"
                          : "bg-slate-700 dark:bg-slate-800"
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
                    <div className="flex items-baseline justify-between gap-1">
                      <span
                        className={`font-display text-2xl font-black ${
                          isInitialMode
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-ink-900 dark:text-white"
                        }`}
                      >
                        {p.achievedFormatted}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          isInitialMode
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300"
                            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Target:</span>
                      <strong className="text-ink-800 dark:text-slate-200">{p.target}</strong>
                    </div>
                  </div>

                  {isComparisonMode && slide13Param.initialFormatted && (
                    <div className="mt-2 rounded-lg bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/60 px-2 py-1.5 text-[10px] space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-rose-800 dark:text-rose-300">
                          Pre-Test (Okt):
                        </span>
                        <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                          {slide13Param.initialFormatted}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[9px]">
                        <span className="text-rose-700/90 dark:text-rose-300/80">
                          <strong>{slide13Param.initialStatus}</strong>
                        </span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">
                          {slide13Param.deltaFormatted}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-1.5">
                  {PARAMETER_SUBTITLES[p.id] || p.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Formula Hake + Bar Chart per Rombel */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900/80 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-ink-900 dark:text-white flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-brand-600" />
              Formula Normalized Gain (Hake, 1998)
            </h3>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 font-mono text-xs dark:border-slate-800 dark:bg-slate-950/60 text-ink-800 dark:text-slate-200 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="font-bold text-brand-600 dark:text-brand-400">
                  Formula:
                </span>
                <span className="text-xs font-bold bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                  g = (Post-Test - Pre-Test) / (100 - Pre-Test)
                </span>
              </div>

              <div className="space-y-2.5 text-[11px]">
                {!isFinalMode && (
                  <div>
                    <strong className="text-rose-600 dark:text-rose-400 block">
                      {isComparisonMode ? "1. " : ""}Evaluasi Pre-Test — Oktober (08&ndash;17 Okt 2026):
                    </strong>
                    <div className="mt-1 pl-2.5 border-l-2 border-rose-500 text-ink-700 dark:text-slate-300 leading-relaxed">
                      g₁ = ({initMetrics.avgPostTest} - {initMetrics.avgPreTest}) / (100 - {initMetrics.avgPreTest}) = {initMetrics.scoreDifference} / {Math.round((100 - initMetrics.avgPreTest) * 10) / 10} ={" "}
                      <strong className="text-rose-600 dark:text-rose-400">
                        {initMetrics.normalizedGain}
                      </strong>{" "}
                      (Rendah, g &lt; 0,30)
                    </div>
                  </div>
                )}

                {!isInitialMode && (
                  <div>
                    <strong className="text-emerald-700 dark:text-emerald-400 block">
                      {isComparisonMode ? "2. " : ""}Evaluasi Post-Test — Awal November (02&ndash;11 Nov 2026):
                    </strong>
                    <div className="mt-1 pl-2.5 border-l-2 border-brand-500 text-ink-700 dark:text-slate-300 leading-relaxed">
                      g = ({summary.overallMetrics.avgPostTest} - {summary.overallMetrics.avgPreTest}) / (100 - {summary.overallMetrics.avgPreTest}) = {summary.overallMetrics.scoreDifference} / {Math.round((100 - summary.overallMetrics.avgPreTest) * 10) / 10} ={" "}
                      <strong className="text-emerald-600 dark:text-emerald-400">
                        {summary.overallMetrics.normalizedGain}
                      </strong>{" "}
                      (Tinggi, g &ge; 0,70)
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-2 dark:border-emerald-900/40 dark:bg-emerald-950/20 text-center">
              <span className="font-bold text-emerald-800 dark:text-emerald-300 block">
                g &ge; 0,70
              </span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                Tinggi {!isInitialMode && <>(Post-Test: <strong>0,74</strong>)</>}
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
                Rendah {!isFinalMode && <>(Pre-Test: <strong>0,23</strong>)</>}
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900/80 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="font-bold text-sm text-ink-900 dark:text-white flex items-center gap-2">
                <School className="h-4 w-4 text-brand-600" />
                {isInitialMode
                  ? "Skor Awal vs Pre-Test (08–17 Okt 2026) per Rombel"
                  : isFinalMode
                  ? "Pre-Test vs Post-Test (02–11 Nov 2026) per Rombel"
                  : "Pre-Test (Okt) vs Post-Test (Nov) per Rombel"}
              </h3>
              <p className="text-xs text-ink-500 dark:text-slate-400">
                {isInitialMode
                  ? "Rata-rata skor hanya naik dari 46,5 ke 58,8 di seluruh 10 kelas (N-Gain 0,23 — Rendah)."
                  : isFinalMode
                  ? "Rata-rata skor meningkat dari 46,5 ke 86,1 di seluruh 10 kelas (N-Gain 0,74 — Tinggi)."
                  : "Rata-rata skor dari 46,5 → 58,8 (Pre-Test Oktober) → 86,1 (Post-Test November)."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-semibold">
              <span className="flex items-center gap-1 text-slate-500">
                <span className="h-2.5 w-2.5 rounded-xs bg-slate-400 inline-block" /> Skor Awal (46,5)
              </span>
              {!isFinalMode && (
                <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                  <span className="h-2.5 w-2.5 rounded-xs bg-rose-500 inline-block" /> Pre-Test Okt (58,8)
                </span>
              )}
              {!isInitialMode && (
                <span className="flex items-center gap-1 text-brand-600 dark:text-brand-400">
                  <span className="h-2.5 w-2.5 rounded-xs bg-brand-600 inline-block" /> Post-Test Nov (86,1)
                </span>
              )}
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
                <Bar dataKey="Skor Awal" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                {!isFinalMode && (
                  <Bar dataKey="Pre-Test (08-17 Okt)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                )}
                {!isInitialMode && (
                  <Bar dataKey="Post-Test (02-11 Nov)" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900/80 space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <GraduationCap className="h-4 w-4 text-brand-600" />
              <h3 className="font-bold text-sm sm:text-base text-ink-900 dark:text-white">
                Data Nilai Siswa ({filteredStudents.length} dari {summary.totalStudentsTested} Siswa)
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 dark:bg-brand-950/60 px-2.5 py-0.5 text-[11px] font-bold text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                No. {displayedStudents.length > 0 ? startIndex + 1 : 0}&ndash;{endIndex} dari {displayedStudents.length}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isInitialMode ? (
                <>
                  Menampilkan data <strong>Pre-Test (08&ndash;17 Oktober 2026)</strong>: {initMetrics.failedStudentsCount} siswa gagal SPAB, {initMetrics.remedialStudentsCount} remedial.
                </>
              ) : isFinalMode ? (
                <>
                  Menampilkan data <strong>Post-Test (02&ndash;11 November 2026)</strong>: seluruh 320 siswa lulus evaluasi SPAB.
                </>
              ) : (
                <>
                  Rekap komparasi nilai per siswa pada <strong>Pre-Test (08&ndash;17 Oktober 2026)</strong> dan <strong>Post-Test (02&ndash;11 November 2026)</strong>.
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama / kelas / tanggal..."
                className="rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 pl-7 pr-2.5 py-1.5 text-xs text-ink-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {!isFinalMode && (
              <select
                value={selectedInitialStatus}
                onChange={(e) => setSelectedInitialStatus(e.target.value)}
                className="rounded-lg border border-rose-200 bg-rose-50/70 dark:bg-slate-800 dark:border-rose-800/60 px-2.5 py-1.5 text-xs font-semibold text-rose-800 dark:text-rose-300 focus:outline-none focus:ring-1 focus:ring-rose-500"
              >
                <option value="ALL">Semua Status Pre-Test Okt (320)</option>
                <option value="Gagal SPAB">
                  Gagal SPAB di Pre-Test Okt ({initMetrics.failedStudentsCount} Siswa)
                </option>
                <option value="Remedial SPAB">
                  Remedial di Pre-Test Okt ({initMetrics.remedialStudentsCount} Siswa)
                </option>
                <option value="Lulus Bersyarat">
                  Lulus Bersyarat di Pre-Test Okt ({initMetrics.passedStudentsCount} Siswa)
                </option>
              </select>
            )}

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 px-2.5 py-1.5 text-xs text-ink-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="ALL">Semua Kategori Hake</option>
              <option value="Tinggi">Tinggi (g &ge; 0,70)</option>
              <option value="Sedang">Sedang (0,30 &le; g &lt; 0,70)</option>
              <option value="Rendah">Rendah (g &lt; 0,30)</option>
            </select>

            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-lg border border-brand-200 bg-brand-50/70 dark:bg-slate-800 dark:border-brand-800 px-2.5 py-1.5 text-xs font-bold text-brand-800 dark:text-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value={32}>32 Siswa / Halaman (1 Rombel)</option>
              <option value={50}>50 Siswa / Halaman</option>
              <option value={100}>100 Siswa / Halaman</option>
              <option value={320}>Tampilkan Semua (320 Siswa)</option>
            </select>
          </div>
        </div>

        {/* Quick Class Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedClassId("ALL")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${
              selectedClassId === "ALL"
                ? "bg-brand-600 text-white border-brand-600 shadow-xs"
                : "bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
            }`}
          >
            Semua Kelas (320)
          </button>
          {summary.classes.map((c) => {
            const active = selectedClassId === c.classId;
            return (
              <button
                key={c.classId}
                type="button"
                onClick={() => setSelectedClassId(c.classId)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                  active
                    ? "bg-brand-600 text-white border-brand-600 shadow-xs"
                    : "bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                }`}
              >
                <span>{c.className}</span>
                <span
                  className={`text-[10px] px-1 rounded ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {c.studentCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Privacy Mode & Top Quick Pagination Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2.5 border border-slate-200/80 dark:border-slate-700/60">
          <div className="flex flex-wrap items-center gap-2.5">
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
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-ink-800 dark:text-slate-100 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all shrink-0"
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

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-500 dark:text-slate-400 mr-1">
              Halaman <strong>{safeCurrentPage}</strong> / <strong>{totalPages}</strong> (No.{" "}
              <strong>{displayedStudents.length > 0 ? startIndex + 1 : 0}&ndash;{endIndex}</strong>):
            </span>
            <button
              type="button"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 font-semibold text-ink-800 dark:text-slate-200 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Sebelumnya</span>
            </button>
            <button
              type="button"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-2.5 py-1 font-semibold text-white disabled:opacity-40 hover:bg-brand-700 transition-all shadow-xs"
            >
              <span>Berikutnya ({pageSize} Siswa)</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Responsive Table — columns adapt to trialViewMode */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/90 text-ink-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
              {isInitialMode ? (
                <tr>
                  <th className="py-2.5 px-3">No</th>
                  <th className="py-2.5 px-3">
                    Nama Siswa{" "}
                    {privacyMode && (
                      <span className="font-normal text-emerald-600 dark:text-emerald-400">
                        (Inisial a*** b***)
                      </span>
                    )}
                  </th>
                  <th className="py-2.5 px-2.5">Kelas</th>
                  <th className="py-2.5 px-2.5 text-center">Tanggal Uji</th>
                  <th className="py-2.5 px-2.5 text-center">Skor Awal</th>
                  <th className="py-2.5 px-3 text-center text-rose-700 dark:text-rose-300">
                    Skor Pre-Test (Okt)
                  </th>
                  <th className="py-2.5 px-2.5 text-center">N-Gain (g)</th>
                  <th className="py-2.5 px-2.5 text-center">Kategori Hake</th>
                  <th className="py-2.5 px-2.5 text-center">Akurasi</th>
                  <th className="py-2.5 px-2.5 text-center">Waktu Respons</th>
                  <th className="py-2.5 px-3 text-center">Status &amp; Kendala Evaluasi</th>
                </tr>
              ) : isFinalMode ? (
                <tr>
                  <th className="py-2.5 px-3">No</th>
                  <th className="py-2.5 px-3">
                    Nama Siswa{" "}
                    {privacyMode && (
                      <span className="font-normal text-emerald-600 dark:text-emerald-400">
                        (Inisial a*** b***)
                      </span>
                    )}
                  </th>
                  <th className="py-2.5 px-2.5">Kelas</th>
                  <th className="py-2.5 px-2.5 text-center">Tanggal Uji</th>
                  <th className="py-2.5 px-2.5 text-center">Pre-Test</th>
                  <th className="py-2.5 px-3 text-center text-brand-700 dark:text-brand-300">
                    Post-Test (Nov)
                  </th>
                  <th className="py-2.5 px-2.5 text-center">N-Gain (g)</th>
                  <th className="py-2.5 px-2.5 text-center">Kategori Hake</th>
                  <th className="py-2.5 px-2.5 text-center">Akurasi</th>
                  <th className="py-2.5 px-2.5 text-center">Waktu Respons</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              ) : (
                <tr>
                  <th className="py-2.5 px-3">No</th>
                  <th className="py-2.5 px-3">
                    Nama Siswa{" "}
                    {privacyMode && (
                      <span className="font-normal text-emerald-600 dark:text-emerald-400">
                        (Inisial a*** b***)
                      </span>
                    )}
                  </th>
                  <th className="py-2.5 px-2.5">Kelas</th>
                  <th className="py-2.5 px-2.5 text-center">Skor Awal</th>
                  <th className="py-2.5 px-3 text-center bg-rose-50/70 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border-x border-rose-100 dark:border-rose-900/40">
                    Pre-Test (08&ndash;17 Okt 2026)
                  </th>
                  <th className="py-2.5 px-3 text-center bg-indigo-50/50 dark:bg-indigo-950/25 text-brand-700 dark:text-brand-300">
                    Post-Test (02&ndash;11 Nov 2026)
                  </th>
                  <th className="py-2.5 px-2.5 text-center">N-Gain (g)</th>
                  <th className="py-2.5 px-2.5 text-center">Kategori Hake</th>
                  <th className="py-2.5 px-2.5 text-center">Akurasi (Pre &rarr; Post)</th>
                  <th className="py-2.5 px-2.5 text-center">Waktu Respons (Pre &rarr; Post)</th>
                  <th className="py-2.5 px-3 text-center">Status (Pre &rarr; Post)</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-ink-800 dark:text-slate-200">
              {paginatedStudents.map((s, idx) => {
                const rowNumber = startIndex + idx + 1;

                if (isInitialMode) {
                  return (
                    <tr key={s.id} className="hover:bg-rose-50/30 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-400">
                        {rowNumber}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold block font-mono">{s.displayName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{s.displayEmail}</span>
                      </td>
                      <td className="py-2.5 px-2.5 font-medium whitespace-nowrap">{s.className}</td>
                      <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 rounded bg-rose-100/90 dark:bg-rose-950/80 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:text-rose-300">
                          <Calendar className="h-2.5 w-2.5" /> {s.initialTrialDate}
                        </span>
                      </td>
                      <td className="py-2.5 px-2.5 text-center text-slate-500 font-mono">
                        {s.preTestScore}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-rose-600 dark:text-rose-400 font-mono">
                        {s.initialPostTestScore}
                      </td>
                      <td className="py-2.5 px-2.5 text-center font-mono font-bold">
                        <span className="inline-block px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                          {s.initialNGain}
                        </span>
                      </td>
                      <td className="py-2.5 px-2.5 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.initialHakeCategory === "Rendah"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                          }`}
                        >
                          {s.initialHakeCategory}
                        </span>
                      </td>
                      <td className="py-2.5 px-2.5 text-center font-mono text-rose-600 dark:text-rose-400">
                        {s.initialDecisionAccuracy}%
                      </td>
                      <td className="py-2.5 px-2.5 text-center font-mono">
                        <span
                          className={
                            s.initialIsResponseUnder15s
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "font-bold text-rose-600 dark:text-rose-400"
                          }
                        >
                          {s.initialResponseTimeSeconds}s
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col items-center gap-0.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                              s.initialSpabStatus === "Gagal SPAB"
                                ? "bg-rose-600 text-white"
                                : s.initialSpabStatus === "Remedial SPAB"
                                ? "bg-amber-500 text-white"
                                : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                            }`}
                          >
                            {s.initialSpabStatus === "Gagal SPAB" && <XCircle className="h-2.5 w-2.5" />}
                            {s.initialSpabStatus === "Remedial SPAB" && (
                              <AlertTriangle className="h-2.5 w-2.5" />
                            )}
                            {s.initialSpabStatus}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 text-center">
                            {s.initialFailureNote}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                }

                if (isFinalMode) {
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-400">
                        {rowNumber}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold block font-mono">{s.displayName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{s.displayEmail}</span>
                      </td>
                      <td className="py-2.5 px-2.5 font-medium whitespace-nowrap">{s.className}</td>
                      <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 rounded bg-indigo-50 dark:bg-indigo-950/70 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">
                          <Calendar className="h-2.5 w-2.5" /> {s.finalTrialDate}
                        </span>
                      </td>
                      <td className="py-2.5 px-2.5 text-center text-slate-500 font-mono">
                        {s.preTestScore}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-brand-600 dark:text-brand-400 font-mono">
                        {s.postTestScore}
                      </td>
                      <td className="py-2.5 px-2.5 text-center font-mono font-bold">
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
                      <td className="py-2.5 px-2.5 text-center">
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
                      <td className="py-2.5 px-2.5 text-center font-mono">
                        {s.decisionAccuracy}%
                      </td>
                      <td className="py-2.5 px-2.5 text-center font-mono">
                        <span
                          className={
                            s.isResponseUnder15s
                              ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                              : "text-amber-600"
                          }
                        >
                          {s.responseTimeSeconds}s
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> Lulus SPAB
                        </span>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-400">
                      {rowNumber}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold block font-mono">{s.displayName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{s.displayEmail}</span>
                    </td>
                    <td className="py-2.5 px-2.5 font-medium whitespace-nowrap">{s.className}</td>
                    <td className="py-2.5 px-2.5 text-center text-slate-500 font-mono">
                      {s.preTestScore}
                    </td>

                    {/* Pre-Test (Oktober 2026) */}
                    <td className="py-2.5 px-3 bg-rose-50/35 dark:bg-rose-950/15 border-x border-rose-100/70 dark:border-rose-900/30">
                      <div className="flex items-center justify-center gap-1.5 font-mono">
                        <span className="inline-flex items-center gap-1 rounded bg-rose-100/90 dark:bg-rose-950/80 px-1.5 py-0.5 text-[9px] font-sans font-semibold text-rose-700 dark:text-rose-300">
                          <Calendar className="h-2.5 w-2.5" /> {s.initialTrialDate}
                        </span>
                        <span className="font-bold text-rose-600 dark:text-rose-400">
                          {s.initialPostTestScore}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 font-bold">
                          g={s.initialNGain}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                            s.initialSpabStatus === "Gagal SPAB"
                              ? "bg-rose-600 text-white"
                              : s.initialSpabStatus === "Remedial SPAB"
                              ? "bg-amber-500 text-white"
                              : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                          }`}
                        >
                          {s.initialSpabStatus === "Gagal SPAB" && <XCircle className="h-2.5 w-2.5" />}
                          {s.initialSpabStatus === "Remedial SPAB" && (
                            <AlertTriangle className="h-2.5 w-2.5" />
                          )}
                          {s.initialSpabStatus}
                        </span>
                        <span className="text-[10px] text-rose-700/85 dark:text-rose-300/85 truncate max-w-[165px]" title={s.initialFailureNote}>
                          {s.initialFailureNote}
                        </span>
                      </div>
                    </td>

                    {/* Post-Test (Awal November 2026) */}
                    <td className="py-2.5 px-3 text-center font-bold text-brand-600 dark:text-brand-400 font-mono bg-indigo-50/20 dark:bg-indigo-950/10">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded bg-indigo-100/80 dark:bg-indigo-950/80 px-1.5 py-0.5 text-[9px] font-sans font-semibold text-indigo-700 dark:text-indigo-300">
                          <Calendar className="h-2.5 w-2.5" /> {s.finalTrialDate}
                        </span>
                        <span className="text-sm">{s.postTestScore}</span>
                      </div>
                      <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                        +{Math.round((s.postTestScore - s.initialPostTestScore) * 10) / 10} poin dari Pre-Test
                      </span>
                    </td>

                    <td className="py-2.5 px-2.5 text-center font-mono font-bold">
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

                    <td className="py-2.5 px-2.5 text-center">
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

                    <td className="py-2.5 px-2.5 text-center font-mono whitespace-nowrap">
                      <span className="text-rose-500 line-through text-[10px] mr-1">
                        {s.initialDecisionAccuracy}%
                      </span>
                      <ArrowRight className="inline h-2.5 w-2.5 text-slate-400 mr-1" />
                      <strong className="text-ink-900 dark:text-white">
                        {s.decisionAccuracy}%
                      </strong>
                    </td>

                    <td className="py-2.5 px-2.5 text-center font-mono whitespace-nowrap">
                      <span className="text-rose-500 line-through text-[10px] mr-1">
                        {s.initialResponseTimeSeconds}s
                      </span>
                      <ArrowRight className="inline h-2.5 w-2.5 text-slate-400 mr-1" />
                      <span
                        className={`font-bold ${
                          s.isResponseUnder15s
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-amber-600"
                        }`}
                      >
                        {s.responseTimeSeconds}s
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] text-rose-500 line-through">
                          Pre: {s.initialSpabStatus}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> Post: Lulus SPAB
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Full Bottom Pagination Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-slate-500 dark:text-slate-400">
            <span>
              Menampilkan siswa ke-<strong>{displayedStudents.length > 0 ? startIndex + 1 : 0}</strong> sampai{" "}
              <strong>{endIndex}</strong> dari total <strong>{displayedStudents.length}</strong> siswa
            </span>
            {pageSize < displayedStudents.length && (
              <button
                type="button"
                onClick={() => setPageSize(320)}
                className="inline-flex items-center gap-1 rounded-lg bg-brand-50 dark:bg-brand-950/60 px-2.5 py-1 text-[11px] font-bold text-brand-700 dark:text-brand-300 hover:bg-brand-100 transition-all"
              >
                <Users className="h-3 w-3" />
                <span>Tampilkan Semua 320 Siswa</span>
              </button>
            )}
            {pageSize >= 320 && displayedStudents.length > 50 && (
              <button
                type="button"
                onClick={() => setPageSize(50)}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-all"
              >
                <span>Kembali ke 50 Siswa / Halaman</span>
              </button>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage(1)}
                title="Halaman Pertama"
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </button>

              {pageNumbers.map((pageNum) => {
                const isActive = pageNum === safeCurrentPage;
                const pStart = (pageNum - 1) * pageSize + 1;
                const pEnd = Math.min(pageNum * pageSize, displayedStudents.length);
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    title={`Siswa No. ${pStart}–${pEnd}`}
                    className={`px-2.5 py-1.5 rounded-lg font-bold transition-all ${
                      isActive
                        ? "bg-brand-600 text-white shadow-xs"
                        : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                type="button"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-brand-600 font-semibold text-white disabled:opacity-40 hover:bg-brand-700 shadow-xs"
              >
                <span>Next {pageSize}</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                title="Halaman Terakhir"
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
