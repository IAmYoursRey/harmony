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
  maskNamePrivacy,
  maskEmailPrivacy,
  maskIdPrivacy,
} from "@/data/learningGainData";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import { isDemoNgoroUser } from "@/utils/demoSchool";

type TrialViewMode = "comparison" | "initial" | "final";

function formatShortPreTestNote(status: string, responseTimeSeconds: number): string {
  if (status === "Lulus Bersyarat") {
    return "Lulus batas bawah";
  }
  if (status === "Remedial SPAB") {
    return "Skor < KKM 75 (remedial)";
  }
  if (responseTimeSeconds >= 15) {
    return "Skor < 75 & respons > 15s";
  }
  return "Skor < 75 & salah rute";
}

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

  const isInitialMode = trialViewMode === "initial";
  const isFinalMode = trialViewMode === "final";
  const isComparisonMode = trialViewMode === "comparison";

  const filteredStudents = useMemo(() => {
    return summary.students.filter((s) => {
      const matchClass = selectedClassId === "ALL" || s.classId === selectedClassId;
      const matchCategory =
        isInitialMode || selectedCategory === "ALL" || s.hakeCategory === selectedCategory;
      const matchInitStatus =
        isFinalMode ||
        selectedInitialStatus === "ALL" ||
        s.initialSpabStatus === selectedInitialStatus;
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        !query ||
        s.name.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        s.className.toLowerCase().includes(query) ||
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
    isInitialMode,
    isFinalMode,
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
      shortNote: formatShortPreTestNote(s.initialSpabStatus, s.initialResponseTimeSeconds),
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
      "Tanggal Pre-Test (Oktober 2026)",
      "Skor Pre-Test",
      "Akurasi Pre-Test (%)",
      "Waktu Respons Pre-Test (detik)",
      "Status Pre-Test",
      "Tanggal Post-Test (November 2026)",
      "Skor Post-Test",
      "N-Gain (Hake)",
      "Kategori N-Gain",
      "Akurasi Post-Test (%)",
      "Waktu Respons Post-Test (detik)",
      "Konsistensi (%)",
      "Transfer Lapangan (%)",
      "Status Post-Test",
    ];

    const rows = displayedStudents.map((s, idx) => [
      idx + 1,
      s.displayId,
      s.displayName,
      s.displayEmail,
      s.className,
      s.initialTrialDate,
      s.preTestScore,
      s.initialDecisionAccuracy,
      s.initialResponseTimeSeconds,
      s.initialSpabStatus,
      s.finalTrialDate,
      s.postTestScore,
      s.nGain,
      s.hakeCategory,
      s.decisionAccuracy,
      s.responseTimeSeconds,
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
      ? `Evaluasi_SPAB_SMAN1_Ngoro_${summary.totalStudentsTested}_Siswa_Inisial.csv`
      : `Evaluasi_SPAB_SMAN1_Ngoro_${summary.totalStudentsTested}_Siswa.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    show(
      `Data CSV ${summary.totalStudentsTested} siswa berhasil diunduh.`,
      "success"
    );
  };

  const chartData = useMemo(() => {
    return summary.classes.map((c) => ({
      name: c.className,
      "Pre-Test (Okt)": c.avgPreTest,
      "Post-Test (Nov)": c.avgPostTest,
    }));
  }, [summary.classes]);

  const indicatorCards = useMemo(() => {
    if (isInitialMode) {
      return [
        {
          id: "pretest_score",
          title: "Rata-Rata Skor Pre-Test",
          value: "46,5",
          badge: "Di Bawah KKM",
          target: "KKM 75,0",
          note: "276 gagal, 37 remedial",
          icon: BookOpen,
          tone: "rose" as const,
        },
        {
          id: "decision_accuracy",
          title: "Akurasi Keputusan",
          value: "53%",
          badge: "Belum Tercapai",
          target: "≥ 80%",
          note: "Ketepatan tindakan & rute",
          icon: Target,
          tone: "rose" as const,
        },
        {
          id: "response_efficiency",
          title: "Waktu Respons < 15s",
          value: "34%",
          badge: "Rata-rata 22,6s",
          target: "≥ 80%",
          note: "Kecepatan respons awal",
          icon: Clock,
          tone: "rose" as const,
        },
        {
          id: "learning_consistency",
          title: "Konsistensi Jawaban",
          value: "51%",
          badge: "Belum Tercapai",
          target: "≥ 85%",
          note: "Stabilitas antar skenario",
          icon: Activity,
          tone: "rose" as const,
        },
        {
          id: "transfer_of_learning",
          title: "Transfer Lapangan",
          value: "49%",
          badge: "Belum Tercapai",
          target: "≥ 80%",
          note: "Praktik simulasi lapangan",
          icon: Award,
          tone: "rose" as const,
        },
      ];
    }

    if (isFinalMode) {
      return [
        {
          id: "learning_gain",
          title: "Learning Gain (N-Gain)",
          value: "0,74",
          badge: "Tinggi",
          target: "≥ 0,70",
          note: "Skor 46,5 → 86,1",
          icon: TrendingUp,
          tone: "emerald" as const,
        },
        {
          id: "decision_accuracy",
          title: "Akurasi Keputusan",
          value: "85%",
          badge: "Tercapai",
          target: "≥ 80%",
          note: "Ketepatan tindakan & rute",
          icon: Target,
          tone: "emerald" as const,
        },
        {
          id: "response_efficiency",
          title: "Waktu Respons < 15s",
          value: "87%",
          badge: "Rata-rata 11,4s",
          target: "≥ 80%",
          note: "Kecepatan respons darurat",
          icon: Clock,
          tone: "emerald" as const,
        },
        {
          id: "learning_consistency",
          title: "Konsistensi Jawaban",
          value: "89%",
          badge: "Tercapai",
          target: "≥ 85%",
          note: "Stabilitas antar skenario",
          icon: Activity,
          tone: "emerald" as const,
        },
        {
          id: "transfer_of_learning",
          title: "Transfer Lapangan",
          value: "83%",
          badge: "Tercapai",
          target: "≥ 80%",
          note: "Praktik simulasi lapangan",
          icon: Award,
          tone: "emerald" as const,
        },
      ];
    }

    return HARMONY_SLIDE_13_PARAMETERS.map((p) => {
      if (p.id === "learning_gain") {
        return {
          id: p.id,
          title: "Learning Gain (N-Gain)",
          value: "0,74",
          badge: "Tinggi",
          target: "≥ 0,70",
          note: "Pre-Test 46,5 → Post-Test 86,1",
          icon: TrendingUp,
          tone: "brand" as const,
        };
      }
      if (p.id === "decision_accuracy") {
        return {
          id: p.id,
          title: "Akurasi Keputusan",
          value: "53% → 85%",
          badge: "+32%",
          target: "≥ 80%",
          note: "Pre-Test Okt vs Post-Test Nov",
          icon: Target,
          tone: "emerald" as const,
        };
      }
      if (p.id === "response_efficiency") {
        return {
          id: p.id,
          title: "Waktu Respons < 15s",
          value: "34% → 87%",
          badge: "22,6s → 11,4s",
          target: "≥ 80%",
          note: "Pre-Test Okt vs Post-Test Nov",
          icon: Clock,
          tone: "emerald" as const,
        };
      }
      if (p.id === "learning_consistency") {
        return {
          id: p.id,
          title: "Konsistensi Jawaban",
          value: "51% → 89%",
          badge: "+38%",
          target: "≥ 85%",
          note: "Pre-Test Okt vs Post-Test Nov",
          icon: Activity,
          tone: "emerald" as const,
        };
      }
      return {
        id: p.id,
        title: "Transfer Lapangan",
        value: "49% → 83%",
        badge: "+34%",
        target: "≥ 80%",
        note: "Pre-Test Okt vs Post-Test Nov",
        icon: Award,
        tone: "emerald" as const,
      };
    });
  }, [isInitialMode, isFinalMode]);

  return (
    <div className="space-y-4" data-demo-mode={isDemoMode ? "true" : "false"}>
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-brand-900 to-slate-900 p-5 text-white shadow-lg border border-indigo-500/20 sm:p-6">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:32px_32px] opacity-10" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 font-semibold text-emerald-300 ring-1 ring-emerald-400/30">
                <Calendar className="h-3 w-3" />
                Evaluasi SPAB &bull; Okt &ndash; Nov 2026
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 font-medium text-indigo-100">
                Validasi Dosen: 02&ndash;07 Okt 2026
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 font-medium text-indigo-100">
                <School className="h-3 w-3 text-brand-300" />
                SMAN 1 Ngoro ({summary.totalStudentsTested} Siswa &bull; {summary.totalClasses} Rombel)
              </span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-white">
              Evaluasi Pembelajaran
            </h2>
            <p className="max-w-3xl text-xs sm:text-sm text-indigo-100/90 leading-relaxed">
              {isInitialMode ? (
                <>
                  Data <strong>Pre-Test (08&ndash;17 Oktober 2026)</strong>: rata-rata skor awal{" "}
                  <strong>46,5</strong> ({initMetrics.failedStudentsCount} siswa belum lulus, {initMetrics.remedialStudentsCount} remedial).
                </>
              ) : isFinalMode ? (
                <>
                  Data <strong>Post-Test (02&ndash;11 November 2026)</strong>: rata-rata skor{" "}
                  <strong>86,1</strong> dengan <strong>N-Gain 0,74</strong> (Kategori Tinggi, 320 siswa lulus).
                </>
              ) : (
                <>
                  Perbandingan <strong>Pre-Test (08&ndash;17 Okt 2026, skor 46,5)</strong> dan{" "}
                  <strong>Post-Test (02&ndash;11 Nov 2026, skor 86,1 &bull; N-Gain 0,74)</strong>.
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
      </div>

      {/* Mode Switcher & Compact Timeline */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/90 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 font-medium">
              <strong>02&ndash;07 Okt:</strong> Validasi Dosen
            </span>
            <span className="rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 px-2.5 py-1 font-medium">
              <strong>08&ndash;17 Okt:</strong> Pre-Test (Skor 46,5)
            </span>
            <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 font-medium">
              <strong>19&ndash;31 Okt:</strong> Revisi Sistem
            </span>
            <span className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 font-medium">
              <strong>02&ndash;11 Nov:</strong> Post-Test (Skor 86,1 &bull; g = 0,74)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 shrink-0">
            <button
              type="button"
              onClick={() => setTrialViewMode("comparison")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isComparisonMode
                  ? "bg-brand-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700"
              }`}
            >
              Komparasi
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
              Pre-Test (Okt)
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
              Post-Test (Nov)
            </button>
          </div>
        </div>

        {/* Indicator Cards */}
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5 pt-1">
          {indicatorCards.map((card) => {
            const Icon = card.icon;
            const isRose = card.tone === "rose";
            const isBrand = card.tone === "brand";
            return (
              <div
                key={card.id}
                className={`rounded-xl p-3 border flex flex-col justify-between ${
                  isRose
                    ? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60"
                    : isBrand
                    ? "bg-brand-50/50 dark:bg-brand-950/30 border-brand-200 dark:border-brand-700"
                    : "bg-slate-50/60 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-ink-900 dark:text-white truncate">
                      {card.title}
                    </span>
                    <Icon
                      className={`h-3.5 w-3.5 shrink-0 ${
                        isRose
                          ? "text-rose-600 dark:text-rose-400"
                          : isBrand
                          ? "text-brand-600 dark:text-brand-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    />
                  </div>
                  <div className="mt-2 flex items-baseline justify-between gap-1">
                    <span
                      className={`font-display text-xl font-black ${
                        isRose
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-ink-900 dark:text-white"
                      }`}
                    >
                      {card.value}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        isRose
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
                      }`}
                    >
                      {card.badge}
                    </span>
                  </div>
                </div>
                <div className="mt-2 pt-1.5 border-t border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>{card.note}</span>
                  <strong className="text-ink-800 dark:text-slate-200">{card.target}</strong>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Perhitungan N-Gain + Grafik Rombel */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/80 flex flex-col justify-between">
          <div className="space-y-2.5">
            <h3 className="font-bold text-sm text-ink-900 dark:text-white flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-brand-600" />
              Rumus N-Gain
            </h3>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-950/60 space-y-2">
              <div className="font-mono font-bold text-ink-900 dark:text-white bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-800 text-center">
                g = (Post-Test &minus; Pre-Test) / (100 &minus; Pre-Test)
              </div>

              {isInitialMode ? (
                <div className="text-slate-600 dark:text-slate-300 space-y-1 pt-1">
                  <div className="flex justify-between">
                    <span>Rata-rata Pre-Test (Okt):</span>
                    <strong className="font-mono text-rose-600 dark:text-rose-400">46,5</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Nilai N-Gain:</span>
                    <strong className="text-slate-500">&mdash; (Data Awal)</strong>
                  </div>
                  <p className="text-[11px] text-slate-500 pt-1">
                    Pre-Test merupakan nilai awal sebelum intervensi sehingga belum memiliki nilai peningkatan (N-Gain).
                  </p>
                </div>
              ) : (
                <div className="text-slate-600 dark:text-slate-300 space-y-1 pt-1">
                  <div className="flex justify-between">
                    <span>Rata-rata Pre-Test (Okt):</span>
                    <strong className="font-mono">46,5</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Rata-rata Post-Test (Nov):</span>
                    <strong className="font-mono text-emerald-600 dark:text-emerald-400">86,1</strong>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-1">
                    <span>Normalized Gain (g):</span>
                    <strong className="font-mono text-brand-600 dark:text-brand-400">
                      (86,1 &minus; 46,5) / 53,5 = 0,74
                    </strong>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1.5 text-[11px] text-center">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-1.5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <strong className="text-emerald-800 dark:text-emerald-300 block">g &ge; 0,70</strong>
              <span className="text-emerald-700 dark:text-emerald-400">Tinggi</span>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-1.5 dark:border-amber-900/40 dark:bg-amber-950/20">
              <strong className="text-amber-800 dark:text-amber-300 block">0,30 &ndash; 0,69</strong>
              <span className="text-amber-700 dark:text-amber-400">Sedang</span>
            </div>
            <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-1.5 dark:border-rose-900/40 dark:bg-rose-950/20">
              <strong className="text-rose-800 dark:text-rose-300 block">g &lt; 0,30</strong>
              <span className="text-rose-700 dark:text-rose-400">Rendah</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/80 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div>
              <h3 className="font-bold text-sm text-ink-900 dark:text-white flex items-center gap-2">
                <School className="h-4 w-4 text-brand-600" />
                {isInitialMode
                  ? "Skor Pre-Test Kelas"
                  : isFinalMode
                  ? "Skor Post-Test Kelas"
                  : "Komparasi Skor Kelas"}
              </h3>
              <p className="text-xs text-ink-500 dark:text-slate-400">
                {isInitialMode
                  ? "Rata-rata skor awal 46,5 di 9 rombel Kelas XI (di bawah KKM 75)."
                  : isFinalMode
                  ? "Rata-rata skor akhir 86,1 di 9 rombel Kelas XI (seluruh kelas ≥ KKM 75)."
                  : "Kenaikan rata-rata skor dari 46,5 (Pre-Test Oktober) ke 86,1 (Post-Test November)."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold">
              {!isFinalMode && (
                <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                  <span className="h-2.5 w-2.5 rounded-xs bg-rose-500 inline-block" /> Pre-Test Okt (46,5)
                </span>
              )}
              {!isInitialMode && (
                <span className="flex items-center gap-1.5 text-brand-600 dark:text-brand-400">
                  <span className="h-2.5 w-2.5 rounded-xs bg-brand-600 inline-block" /> Post-Test Nov (86,1)
                </span>
              )}
            </div>
          </div>

          <div className="h-52 w-full">
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
                {!isFinalMode && (
                  <Bar dataKey="Pre-Test (Okt)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                )}
                {!isInitialMode && (
                  <Bar dataKey="Post-Test (Nov)" fill="#4f46e5" radius={[4, 4, 0, 0]} />
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
                Daftar Nilai ({filteredStudents.length}/{summary.totalStudentsTested})
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 dark:bg-brand-950/60 px-2.5 py-0.5 text-[11px] font-bold text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                No. {displayedStudents.length > 0 ? startIndex + 1 : 0}&ndash;{endIndex} dari {displayedStudents.length}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isInitialMode
                ? "Nilai awal Pre-Test (08–17 Oktober 2026) sebelum intervensi revisi sistem."
                : isFinalMode
                ? "Nilai akhir Post-Test (02–11 November 2026) beserta capaian N-Gain per siswa."
                : "Perbandingan nilai Pre-Test (Oktober) dan Post-Test (November) untuk 320 siswa."}
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
                <option value="ALL">Semua Status Pre-Test (320)</option>
                <option value="Gagal SPAB">
                  Gagal ({initMetrics.failedStudentsCount} Siswa)
                </option>
                <option value="Remedial SPAB">
                  Remedial ({initMetrics.remedialStudentsCount} Siswa)
                </option>
                <option value="Lulus Bersyarat">
                  Lulus Bersyarat ({initMetrics.passedStudentsCount} Siswa)
                </option>
              </select>
            )}

            {!isInitialMode && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 px-2.5 py-1.5 text-xs text-ink-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="ALL">Semua Kategori N-Gain</option>
                <option value="Tinggi">Tinggi (g &ge; 0,70)</option>
                <option value="Sedang">Sedang (0,30 &le; g &lt; 0,70)</option>
                <option value="Rendah">Rendah (g &lt; 0,30)</option>
              </select>
            )}

            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-lg border border-brand-200 bg-brand-50/70 dark:bg-slate-800 dark:border-brand-800 px-2.5 py-1.5 text-xs font-bold text-brand-800 dark:text-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value={36}>36 Siswa / Halaman (1 Rombel)</option>
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

        {/* Responsive Table */}
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
                        (a*** b***)
                      </span>
                    )}
                  </th>
                  <th className="py-2.5 px-2.5">Kelas</th>
                  <th className="py-2.5 px-2.5 text-center">Tanggal Pre-Test</th>
                  <th className="py-2.5 px-3 text-center text-rose-700 dark:text-rose-300">
                    Skor Pre-Test
                  </th>
                  <th className="py-2.5 px-2.5 text-center">Akurasi</th>
                  <th className="py-2.5 px-2.5 text-center">Waktu Respons</th>
                  <th className="py-2.5 px-2.5 text-center">Transfer</th>
                  <th className="py-2.5 px-3 text-center">Status &amp; Catatan</th>
                </tr>
              ) : isFinalMode ? (
                <tr>
                  <th className="py-2.5 px-3">No</th>
                  <th className="py-2.5 px-3">
                    Nama Siswa{" "}
                    {privacyMode && (
                      <span className="font-normal text-emerald-600 dark:text-emerald-400">
                        (a*** b***)
                      </span>
                    )}
                  </th>
                  <th className="py-2.5 px-2.5">Kelas</th>
                  <th className="py-2.5 px-2.5 text-center">Tanggal Post-Test</th>
                  <th className="py-2.5 px-2.5 text-center">Pre-Test</th>
                  <th className="py-2.5 px-3 text-center text-brand-700 dark:text-brand-300">
                    Post-Test
                  </th>
                  <th className="py-2.5 px-2.5 text-center">N-Gain (g)</th>
                  <th className="py-2.5 px-2.5 text-center">Kategori</th>
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
                        (a*** b***)
                      </span>
                    )}
                  </th>
                  <th className="py-2.5 px-2.5">Kelas</th>
                  <th className="py-2.5 px-3 text-center bg-rose-50/70 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border-x border-rose-100 dark:border-rose-900/40">
                    Pre-Test (08&ndash;17 Okt)
                  </th>
                  <th className="py-2.5 px-3 text-center bg-indigo-50/50 dark:bg-indigo-950/25 text-brand-700 dark:text-brand-300">
                    Post-Test (02&ndash;11 Nov)
                  </th>
                  <th className="py-2.5 px-2.5 text-center">N-Gain (g)</th>
                  <th className="py-2.5 px-2.5 text-center">Kategori</th>
                  <th className="py-2.5 px-2.5 text-center">Akurasi</th>
                  <th className="py-2.5 px-2.5 text-center">Respons</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-ink-800 dark:text-slate-200">
              {paginatedStudents.map((s, idx) => {
                const rowNumber = startIndex + idx + 1;

                if (isInitialMode) {
                  return (
                    <tr key={s.id} className="hover:bg-rose-50/20 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-400">
                        {rowNumber}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold block font-mono">{s.displayName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{s.displayEmail}</span>
                      </td>
                      <td className="py-2.5 px-2.5 font-medium whitespace-nowrap">{s.className}</td>
                      <td className="py-2.5 px-2.5 text-center whitespace-nowrap text-slate-500">
                        {s.initialTrialDate}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-rose-600 dark:text-rose-400 font-mono">
                        {s.preTestScore}
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
                      <td className="py-2.5 px-2.5 text-center font-mono text-slate-600 dark:text-slate-400">
                        {s.initialTransferScore}%
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.initialSpabStatus === "Gagal SPAB"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300"
                              : s.initialSpabStatus === "Remedial SPAB"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                              : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                          }`}
                        >
                          {s.initialSpabStatus === "Gagal SPAB"
                            ? "Belum Lulus"
                            : s.initialSpabStatus === "Remedial SPAB"
                            ? "Remedial"
                            : "Lulus Bersyarat"}
                        </span>
                        <span className="block text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {s.shortNote}
                        </span>
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
                      <td className="py-2.5 px-2.5 text-center whitespace-nowrap text-slate-500">
                        {s.finalTrialDate}
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
                          <CheckCircle2 className="h-3 w-3" /> Lulus
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

                    {/* Pre-Test (Oktober 2026) */}
                    <td className="py-2.5 px-3 text-center bg-rose-50/35 dark:bg-rose-950/15 border-x border-rose-100/70 dark:border-rose-900/30">
                      <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">
                        {s.preTestScore}
                      </span>
                      <span className="block text-[10px] text-slate-400">
                        {s.initialTrialDate}
                      </span>
                    </td>

                    {/* Post-Test (Awal November 2026) */}
                    <td className="py-2.5 px-3 text-center bg-indigo-50/20 dark:bg-indigo-950/10">
                      <span className="font-bold text-brand-600 dark:text-brand-400 font-mono">
                        {s.postTestScore}
                      </span>
                      <span className="block text-[10px] text-slate-400">
                        {s.finalTrialDate}
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
                      <span className="text-slate-400 text-[11px]">{s.initialDecisionAccuracy}%</span>
                      <ArrowRight className="inline h-2.5 w-2.5 text-slate-400 mx-1" />
                      <strong className="text-ink-900 dark:text-white">{s.decisionAccuracy}%</strong>
                    </td>

                    <td className="py-2.5 px-2.5 text-center font-mono whitespace-nowrap">
                      <span className="text-slate-400 text-[11px]">{s.initialResponseTimeSeconds}s</span>
                      <ArrowRight className="inline h-2.5 w-2.5 text-slate-400 mx-1" />
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
                      <span className="text-[10px] text-rose-600 dark:text-rose-400 block">
                        Pre: {s.initialSpabStatus === "Gagal SPAB" ? "Belum Lulus" : s.initialSpabStatus === "Remedial SPAB" ? "Remedial" : "Lulus Bersyarat"}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> Post: Lulus
                      </span>
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
