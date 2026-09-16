import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  getAllAccounts,
  updateAccount,
  hashPassword,
  type UserAccount,
} from "@/data/accounts";
import {
  getAllProfiles,
  updateProfile,
  type UserProfile,
  type Gender,
} from "@/data/userProfiles";
import { useToast } from "@/hooks/useToast";
import {
  Users,
  UserPlus,
  ShieldAlert,
  BookOpen,
  GraduationCap,
  Mail,
  Lock,
  User,
  School,
  Calendar,
  Download,
  Edit2,
  Check,
  X,
  MapPin,
  TrendingUp,
  TrendingDown,
  Award,
  Target,
  Brain,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  ChevronDown,
  Phone,
  Pencil,
  Bell,
  Globe,
  Shield,
  LogOut,
  Camera,
  Boxes,
  Satellite,
  Zap,
  Trophy,
  Compass,
  Flame,
  Medal,
  Save,
  Play,
  type LucideIcon,
} from "lucide-react";
import {
  getAllSchools,
  extractProvinces,
  extractRegencies,
} from "@/services/schoolService";
import type { School as SchoolData } from "@/data/schools";
import { apiClient } from "@/services/apiClient";
import { motion, AnimatePresence } from "framer-motion";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { useI18n } from "@/hooks/useI18n";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSchool } from "@/hooks/useSchool";
import { ProgressRing } from "@/components/dashboard/Charts";
import { TeacherSessionCreatorModal } from "../sessions/TeacherSessionCreatorModal";
import { useData } from "@/hooks/useData";
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
      className={`glass rounded-2xl p-4 sm:p-5 transition-all hover:shadow-glass dark:bg-slate-900/60 ${className}`}
    >
      {children}
    </div>
  );
}

function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin text-brand-600 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700/50 ${className}`}
    />
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-glass`}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 font-display text-2xl font-extrabold text-ink-900 dark:text-white">
        {value}
      </p>
      <p className="text-xs text-ink-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-[11px] font-medium text-brand-600 truncate">
        {sub}
      </p>
    </Card>
  );
}

function ClassSelector({
  classes,
  selectedIdx,
  onSelect,
  allowAll = false,
  loading = false,
}: {
  classes: any[];
  selectedIdx: number;
  onSelect: (idx: number) => void;
  allowAll?: boolean;
  loading?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="flex min-w-[200px] items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 opacity-70 dark:border-slate-700 dark:bg-slate-800/50">
        <div className="flex items-center gap-2">
          <Spinner className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-500">
            Memuat kelas...
          </span>
        </div>
      </div>
    );
  }

  const selectedClass =
    selectedIdx === -1
      ? { name: "Semua Kelas", grade: "Semua" }
      : classes[selectedIdx];
  if (!selectedClass && classes.length > 0) return null;

  const grouped = classes.reduce(
    (acc, c: any, idx) => {
      const grade = c.grade;
      if (!acc[grade]) acc[grade] = [];
      acc[grade].push({ ...c, idx });
      return acc;
    },
    {} as Record<string, any[]>,
  );

  Object.keys(grouped).forEach((grade) => {
    grouped[grade].sort((a: any, b: any) => {
      const numA = parseInt(a.section);
      const numB = parseInt(b.section);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return String(a.section).localeCompare(String(b.section));
    });
  });

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex min-w-[200px] items-center justify-between gap-3 rounded-xl border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-ink-900 shadow-sm transition-all hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
      >
        <div className="flex flex-col items-start text-left">
          <span className="text-[10px] text-brand-600 uppercase tracking-wider dark:text-brand-400">
            {selectedIdx === -1 ? "Filter" : `Grade ${selectedClass.grade}`}
          </span>
          <span className="truncate">{selectedClass.name}</span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-ink-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 w-64 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-800"
          >
            {allowAll && (
              <div className="mb-2 border-b border-slate-100 pb-2 dark:border-slate-700">
                <button
                  onClick={() => {
                    onSelect(-1);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${selectedIdx === -1 ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400" : "text-ink-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"}`}
                >
                  <span className="font-semibold">Semua Kelas</span>
                  {selectedIdx === -1 && <Check className="h-4 w-4" />}
                </button>
              </div>
            )}

            {Object.entries(grouped).map(([grade, grpClasses]) => (
              <div key={grade} className="mb-2 last:mb-0">
                <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Grade {grade}
                </div>
                {(grpClasses as any[]).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelect(c.idx);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${selectedIdx === c.idx ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400" : "text-ink-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"}`}
                  >
                    <span>{c.name}</span>
                    {selectedIdx === c.idx && <Check className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TeacherStudentDetailModal({
  student,
  onClose,
}: {
  student: any;
  onClose: () => void;
}) {
  const [quizHistories, setQuizHistories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null);

  useEffect(() => {
    if (student?.id) {
      setLoading(true);
      apiClient.get(`/api/quiz-history/student/${student.id}`).then((res: any) => {
        if (res.success && res.data) {
          setQuizHistories(res.data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        }
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [student]);

  const handleOverride = async (historyId: string, questionId: string, isCorrect: boolean) => {
    try {
      const res = await apiClient.put(`/api/quiz-history/${historyId}/override`, {
        questionId,
        isCorrect,
        pointsAdjustment: isCorrect ? 100 : -100 // Adjust as needed
      });
      if (res.success) {
        alert("Penilaian AI berhasil dikoreksi");
        setQuizHistories(prev => 
          prev.map(h => {
            if (h.id === historyId) {
              const newEvals = [...h.evaluations];
              const eIdx = newEvals.findIndex(e => e.questionId === questionId);
              if (eIdx !== -1) {
                newEvals[eIdx] = { ...newEvals[eIdx], isCorrect, overriddenByTeacher: true };
              }
              return { ...h, evaluations: newEvals };
            }
            return h;
          })
        );
      }
    } catch (e) {
      console.error(e);
      alert("Gagal mengoreksi");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-glass-xl dark:bg-slate-900 overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-brand-50 p-6 dark:border-slate-800">
          <div>
            <h3 className="font-display text-xl font-bold text-ink-900 dark:text-white">
              Detail Siswa: {student.name}
            </h3>
            <p className="text-sm text-ink-500 dark:text-slate-400">
              Menampilkan riwayat jawaban & evaluasi AI
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-ink-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center p-8"><Spinner /></div>
          ) : quizHistories.length === 0 ? (
            <p className="text-center text-ink-500">Belum ada riwayat kuis.</p>
          ) : (
            <div className="space-y-4">
              {quizHistories.map((qh) => (
                <div key={qh.id} className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-800/40">
                  <div 
                    className="flex cursor-pointer items-center justify-between"
                    onClick={() => setExpandedQuizId(expandedQuizId === qh.id ? null : qh.id)}
                  >
                    <div>
                      <h4 className="font-bold text-ink-900 dark:text-white capitalize">
                        {qh.topicId.replace(/-/g, " ")}
                      </h4>
                      <p className="text-xs text-ink-500">
                        {new Date(qh.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-display text-lg font-bold text-brand-600 dark:text-brand-400">
                        {qh.score}%
                      </span>
                      <span className="text-ink-400 transition-transform">
                        {expandedQuizId === qh.id ? "▲" : "▼"}
                      </span>
                    </div>
                  </div>

                  {expandedQuizId === qh.id && (
                    <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-700">
                      {qh.evaluations.map((ev: any, idx: number) => {
                        const q = qh.questions.find((q: any) => q.id === ev.questionId);
                        const ans = qh.answers[ev.questionId];
                        return (
                          <div key={ev.questionId} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                            <p className="text-sm font-semibold text-ink-900 dark:text-white mb-2">
                              {idx + 1}. {q?.text || "Unknown Question"}
                            </p>
                            <div className="grid gap-2 sm:grid-cols-2 text-sm">
                              <div className="rounded border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
                                <span className="block text-xs font-bold text-slate-500 mb-1">Jawaban Murid:</span>
                                <span className="text-ink-700 dark:text-slate-300">{ans}</span>
                              </div>
                              <div className={`rounded border p-2 ${ev.isCorrect ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-900/20' : 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-900/20'}`}>
                                <span className={`block text-xs font-bold mb-1 ${ev.isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                                  Evaluasi AI: {ev.isCorrect ? 'Benar' : 'Salah'}
                                </span>
                                <span className="text-ink-700 dark:text-slate-300 mb-3 block">{ev.feedback}</span>
                                
                                <div className="border-t border-slate-200 pt-2 dark:border-slate-700 mt-2 flex items-center justify-between">
                                  <span className="text-[10px] font-bold uppercase text-slate-500">Aksi Guru:</span>
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={() => handleOverride(qh.id, ev.questionId, true)}
                                      disabled={ev.isCorrect}
                                      className={`text-xs px-2 py-1 rounded font-bold ${ev.isCorrect ? 'opacity-50 cursor-not-allowed bg-emerald-100 text-emerald-700' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                                    >Benarkan</button>
                                    <button 
                                      onClick={() => handleOverride(qh.id, ev.questionId, false)}
                                      disabled={!ev.isCorrect}
                                      className={`text-xs px-2 py-1 rounded font-bold ${!ev.isCorrect ? 'opacity-50 cursor-not-allowed bg-rose-100 text-rose-700' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'}`}
                                    >Salahkan</button>
                                  </div>
                                </div>
                                {ev.overriddenByTeacher && (
                                  <span className="mt-2 block text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded w-fit">
                                    Telah dikoreksi
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export function TeacherDashboardView() {
  const { t, locale, setLocale } = useI18n();
  const { currentUser, currentProfile, refreshProfile } = useAuth();
  const [exporting, setExporting] = useState(false);

  const [selectedClassIdx, setSelectedClassIdx] = useState(0);
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newGrade, setNewGrade] = useState<"X" | "XI" | "XII">("X");
  const [newSection, setNewSection] = useState("");
  const [newAcademicYear, setNewAcademicYear] = useState("2026/2027");

  const [sessionCreatorClass, setSessionCreatorClass] = useState<any>(null);

  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<
    "overview" | "classes" | "students"
  >((searchParams.get("tab") as any) || "overview");
  const [studentFilterIdx, setStudentFilterIdx] = useState<number>(-1);
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<any>(null);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPasswordConfirm, setRegPasswordConfirm] = useState("");
  const [regGender, setRegGender] = useState<Gender>("male");
  const [regClassId, setRegClassId] = useState("");

  const {
    data: clsRes,
    isLoading: loadingClasses,
    error: errorClassesRaw,
    mutate: mutateClasses,
  } = useData<any>(
    currentUser &&
      (currentUser.role === "teacher" || currentUser.role === "developer")
      ? "/api/classes"
      : null,
  );

  const {
    data: usrRes,
    isLoading: loadingUsers,
    error: errorUsersRaw,
    mutate: mutateUsers,
  } = useData<any>(
    currentUser &&
      (currentUser.role === "teacher" || currentUser.role === "developer")
      ? "/api/users"
      : null,
  );

  const classes = clsRes?.classes || [];
  const accounts = usrRes?.users || [];
  const profiles = usrRes?.profiles || [];

  const errorClasses = !!errorClassesRaw;
  const errorUsers = !!errorUsersRaw;

  const teacherClasses =
    currentUser?.role === "developer"
      ? classes
      : classes.filter((c: any) => c.teacherId === currentUser?.id);
  const selectedClass = teacherClasses[selectedClassIdx];

  const {
    data: analyticsRes,
    isLoading: loadingData,
    error: errorAnalyticsRaw,
    mutate: mutateAnalytics,
  } = useData<any>(
    selectedClass ? `/api/analytics/class?classId=${selectedClass.id}` : null,
  );

  const analyticsData = analyticsRes?.data;
  const errorAnalytics = !!errorAnalyticsRaw;

  const fetchUsersAndClasses = useCallback(() => {
    mutateClasses();
    mutateUsers();
    mutateAnalytics();
  }, [mutateClasses, mutateUsers, mutateAnalytics]);

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || !newSection.trim() || !currentProfile) return;
    try {
      const res = await apiClient.post("/api/classes", {
        name: newClassName,
        grade: newGrade,
        section: newSection,
        academicYear: newAcademicYear,
      });
      if (res.success) {
        setIsAddingClass(false);
        setNewClassName("");
        setNewSection("");
        fetchUsersAndClasses();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPassword) return;
    if (regPassword !== regPasswordConfirm) return;

    try {
      const res = await apiClient.post("/api/users", {
        name: regName,
        email: regEmail,
        password: regPassword,
        role: "student",
        gender: regGender,
        classId: regClassId, // Save class reference
      });
      if (res.success) {
        setIsAddingStudent(false);
        setRegName("");
        setRegEmail("");
        setRegPassword("");
        setRegPasswordConfirm("");
        setRegClassId("");
        fetchUsersAndClasses();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExport = (type: "pdf" | "excel") => {
    setExporting(true);
    setTimeout(() => setExporting(false), 1200);
    void type;
  };

  const dashboardData = useMemo(() => {
    if (!selectedClass || !currentProfile || loadingData || !analyticsData)
      return null;

    const { overview, students } = analyticsData;

    const mappedStudents = students.map((s: any) => ({
      id: s.id,
      name: s.name,
      totalPoints: s.completed, // Use completed simulations as total points/achievements
      averageScore: s.averageScore,
      averageTime: s.averageTime,
      isOnline: false, // To be implemented via websockets in future
    }));

    mappedStudents.sort((a: any, b: any) => b.totalPoints - a.totalPoints);
    const topStudent = mappedStudents[0];
    const lowStudent = mappedStudents[mappedStudents.length - 1];
    const classAverage = overview.averageScore;

    const fallbackRadar: { subjectKey: string; class: number }[] = [];
    const fallbackBar: { nameKey: string; score: number }[] = [];

    return {
      students: mappedStudents,
      classAverage,
      topStudent,
      lowStudent,
      radarData: analyticsData.radarData || fallbackRadar,
      barData: analyticsData.barData || fallbackBar,
      overview,
    };
  }, [selectedClass, currentProfile, analyticsData, loadingData]);

  return (
    <div className="space-y-6">
      {sessionCreatorClass && (
        <TeacherSessionCreatorModal
          classData={sessionCreatorClass}
          onClose={() => setSessionCreatorClass(null)}
        />
      )}
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-6 text-white shadow-glass-lg sm:p-8">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:36px_36px] opacity-15" />
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              <GraduationCap aria-hidden="true" className="h-3.5 w-3.5" />{" "}
              <span>{t("nav.teacher")}</span>
            </div>
            <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              {t("teacher.header.title")}
            </h2>
            <p className="mt-1.5 max-w-md text-sm text-brand-100">
              {t("teacher.header.desc")}
            </p>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={() => handleExport("pdf")}
              disabled={exporting || !dashboardData}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 shadow-glass transition-all hover:-translate-y-0.5 hover:shadow-glow disabled:opacity-60"
            >
              <FileText className="h-4 w-4" />{" "}
              {exporting ? t("teacher.exporting") : t("teacher.export.pdf")}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="relative z-10 mt-6 flex border-b border-brand-700/50">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 border-b-2 font-semibold text-sm transition-colors ${activeTab === "overview" ? "border-white text-white" : "border-transparent text-white/60 hover:text-white/80"}`}
          >
            Overview & Analytics
          </button>
          <button
            onClick={() => setActiveTab("classes")}
            className={`px-4 py-2 border-b-2 font-semibold text-sm transition-colors ${activeTab === "classes" ? "border-white text-white" : "border-transparent text-white/60 hover:text-white/80"}`}
          >
            Class Management
          </button>
          <button
            onClick={() => setActiveTab("students")}
            className={`px-4 py-2 border-b-2 font-semibold text-sm transition-colors ${activeTab === "students" ? "border-white text-white" : "border-transparent text-white/60 hover:text-white/80"}`}
          >
            Student Management
          </button>
        </div>
      </div>
      {activeTab === "classes" && (
        <div className="grid gap-6">
          <div className="flex items-center justify-between border-b border-brand-100 dark:border-slate-800 pb-4">
            <h3 className="font-bold text-ink-900 dark:text-white flex items-center gap-2">
              <School className="h-5 w-5 text-brand-600" /> Manajemen Kelas
            </h3>
            <button
              onClick={() => setIsAddingClass(true)}
              className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 shadow-sm"
            >
              <Plus className="h-4 w-4" /> Buat Class
            </button>
          </div>

          <AnimatePresence>
            {isAddingClass && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <form
                  onSubmit={handleAddClass}
                  className="glass rounded-2xl p-5 border-l-4 border-brand-500 bg-white dark:bg-slate-900"
                >
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-ink-700 dark:text-slate-300">
                        Nama Kelas
                      </label>
                      <input
                        value={newClassName}
                        onChange={(e) => setNewClassName(e.target.value)}
                        placeholder="Contoh: Geografi 10A"
                        required
                        className="w-full rounded-xl border border-brand-100 py-2.5 px-3 text-sm focus:ring-2 focus:ring-brand-100 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-ink-700 dark:text-slate-300">
                        Tingkat (Grade)
                      </label>
                      <select
                        value={newGrade}
                        onChange={(e) =>
                          setNewGrade(e.target.value as "X" | "XI" | "XII")
                        }
                        className="w-full rounded-xl border border-brand-100 py-2.5 px-3 text-sm focus:ring-2 focus:ring-brand-100 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      >
                        <option value="X">Kelas X</option>
                        <option value="XI">Kelas XI</option>
                        <option value="XII">Kelas XII</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-ink-700 dark:text-slate-300">
                        Ruang/Section
                      </label>
                      <input
                        value={newSection}
                        onChange={(e) => setNewSection(e.target.value)}
                        placeholder="Contoh: 1 / A"
                        required
                        className="w-full rounded-xl border border-brand-100 py-2.5 px-3 text-sm focus:ring-2 focus:ring-brand-100 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-ink-700 dark:text-slate-300">
                        Tahun Ajaran
                      </label>
                      <input
                        value={newAcademicYear}
                        onChange={(e) => setNewAcademicYear(e.target.value)}
                        placeholder="2026/2027"
                        required
                        className="w-full rounded-xl border border-brand-100 py-2.5 px-3 text-sm focus:ring-2 focus:ring-brand-100 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingClass(false)}
                      className="px-4 py-2 text-sm font-bold bg-slate-100 text-ink-600 rounded-xl hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-bold bg-brand-600 text-white rounded-xl shadow-sm hover:bg-brand-700"
                    >
                      Simpan Kelas
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {loadingClasses ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card
                  key={i}
                  className="border-t-4 border-t-slate-200 dark:border-t-slate-700 h-32"
                >
                  <Skeleton className="h-6 w-3/4 mb-4" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </Card>
              ))}
            </div>
          ) : errorClasses ? (
            <Card className="flex flex-col items-center justify-center p-8 text-center border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/30">
              <AlertTriangle className="h-8 w-8 text-red-500 mb-3" />
              <h3 className="text-sm font-bold text-red-800 dark:text-red-400">
                Gagal memuat data kelas
              </h3>
              <button
                onClick={() => fetchUsersAndClasses()}
                className="mt-4 px-4 py-2 text-xs font-semibold bg-white text-red-700 border border-red-200 rounded-lg hover:bg-red-50 shadow-sm dark:bg-red-900/20 dark:border-red-800 dark:text-red-300"
              >
                Coba Lagi
              </button>
            </Card>
          ) : teacherClasses.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
              <School className="h-12 w-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-ink-900 dark:text-white">
                Belum ada Class
              </h3>
              <p className="text-sm text-ink-500 mb-4">
                Buat Class pertama Anda untuk memulai.
              </p>
              <button
                onClick={() => setIsAddingClass(true)}
                className="px-4 py-2 text-sm font-bold bg-brand-600 text-white rounded-xl"
              >
                + Buat Class
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {teacherClasses.map((c: any) => (
                <Card
                  key={c.id}
                  className="border-t-4 border-t-brand-500 flex flex-col justify-between"
                >
                  <div>
                    <h4 className="font-bold text-lg dark:text-white">
                      {c.name}
                    </h4>
                    <div className="mt-2 space-y-1 text-sm text-ink-600 dark:text-slate-300">
                      <p>
                        <span className="font-semibold text-ink-400">
                          Grade:
                        </span>{" "}
                        {c.grade}
                      </p>
                      <p>
                        <span className="font-semibold text-ink-400">
                          Section:
                        </span>{" "}
                        {c.section}
                      </p>
                      <p>
                        <span className="font-semibold text-ink-400">
                          Tahun:
                        </span>{" "}
                        {c.academicYear}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSessionCreatorClass(c)}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-50 px-4 py-2 text-sm font-bold text-brand-700 hover:bg-brand-100 dark:bg-brand-900/30 dark:text-brand-300 dark:hover:bg-brand-900/50 transition-colors"
                  >
                    <Play className="h-4 w-4" /> Mulai Simulasi
                  </button>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "students" && (
        <div className="grid gap-6">
          <div className="flex items-center justify-between border-b border-brand-100 dark:border-slate-800 pb-4">
            <h3 className="font-bold text-ink-900 dark:text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-brand-600" /> Manajemen Murid
            </h3>
            <div className="flex items-center gap-4">
              {teacherClasses.length > 0 ? (
                <ClassSelector
                  classes={teacherClasses}
                  selectedIdx={studentFilterIdx}
                  onSelect={setStudentFilterIdx}
                  allowAll={true}
                />
              ) : (
                loadingClasses && (
                  <ClassSelector
                    classes={[]}
                    selectedIdx={-1}
                    onSelect={() => {}}
                    allowAll={true}
                    loading={true}
                  />
                )
              )}
              <button
                onClick={() => setIsAddingStudent(true)}
                className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 shadow-sm"
              >
                <UserPlus className="h-4 w-4" /> Tambah Student
              </button>
            </div>
          </div>

          {/* Student List */}
          {loadingUsers ? (
            <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
              <div className="space-y-6">
                <div className="flex gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-1/6" />
                  <Skeleton className="h-4 w-1/6" />
                </div>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-6 w-1/4" />
                    <Skeleton className="h-6 w-1/4" />
                    <Skeleton className="h-6 w-1/6" />
                    <Skeleton className="h-6 w-1/6 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          ) : errorUsers ? (
            <Card className="flex flex-col items-center justify-center p-8 text-center border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/30">
              <AlertTriangle className="h-8 w-8 text-red-500 mb-3" />
              <h3 className="text-sm font-bold text-red-800 dark:text-red-400">
                Gagal memuat data murid
              </h3>
              <button
                onClick={() => fetchUsersAndClasses()}
                className="mt-4 px-4 py-2 text-xs font-semibold bg-white text-red-700 border border-red-200 rounded-lg hover:bg-red-50 shadow-sm dark:bg-red-900/20 dark:border-red-800 dark:text-red-300"
              >
                Coba Lagi
              </button>
            </Card>
          ) : accounts.filter(
              (a: any) => a.role !== "dev" && a.id !== currentUser?.id,
            ).length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Users className="h-12 w-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-ink-900 dark:text-white">
                Belum ada Pengguna
              </h3>
              <p className="text-sm text-ink-500 mb-4">
                Belum ada Pengguna lain yang terdaftar pada scope Anda.
              </p>
              <button
                onClick={() => setIsAddingStudent(true)}
                className="px-4 py-2 text-sm font-bold bg-brand-600 text-white rounded-xl"
              >
                + Tambah Pengguna
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr className="text-left text-xs font-semibold text-ink-500 dark:text-slate-400">
                    <th className="p-4">Nama Lengkap</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Class</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {accounts
                    .filter((a: any) => {
                      if (a.role === "dev" || a.id === currentUser?.id)
                        return false;

                      const prof = profiles.find((p: any) => p.userId === a.id);
                      if (studentFilterIdx !== -1) {
                        const selectedFilterClass =
                          teacherClasses[studentFilterIdx];
                        if (
                          !selectedFilterClass ||
                          prof?.classId !== selectedFilterClass.id
                        ) {
                          return false;
                        }
                      }
                      return true;
                    })
                    .map((a: any) => {
                      const prof = profiles.find((p: any) => p.userId === a.id);
                      const cls = classes.find(
                        (c: any) => c.id === prof?.classId,
                      );
                      return (
                        <tr
                          key={a.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
                        >
                          <td className="p-4 font-bold dark:text-white">
                            {a.name}
                          </td>
                          <td className="p-4 text-ink-600 dark:text-slate-300">
                            {a.email}
                          </td>
                          <td className="p-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-800 dark:bg-brand-900/30 dark:text-brand-300">
                              {cls
                                ? cls.name
                                : prof?.grade + " " + prof?.classSection}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20">
                              Aktif
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Adding Student Modal */}
      <AnimatePresence>
        {isAddingStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingStudent(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 shadow-2xl p-6"
            >
              <h3 className="font-bold text-xl mb-4 dark:text-white">
                Tambah Student
              </h3>
              <form onSubmit={handleAddStudent} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-ink-700 dark:text-slate-300 mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    required
                    className="w-full rounded-xl border border-brand-200 py-2.5 px-3 focus:ring-2 focus:ring-brand-100 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink-700 dark:text-slate-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border border-brand-200 py-2.5 px-3 focus:ring-2 focus:ring-brand-100 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-ink-700 dark:text-slate-300 mb-1">
                      Kata Sandi
                    </label>
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required
                      className="w-full rounded-xl border border-brand-200 py-2.5 px-3 focus:ring-2 focus:ring-brand-100 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink-700 dark:text-slate-300 mb-1">
                      Konfirmasi Sandi
                    </label>
                    <input
                      type="password"
                      value={regPasswordConfirm}
                      onChange={(e) => setRegPasswordConfirm(e.target.value)}
                      required
                      className="w-full rounded-xl border border-brand-200 py-2.5 px-3 focus:ring-2 focus:ring-brand-100 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-ink-700 dark:text-slate-300 mb-1">
                      Class
                    </label>
                    <select
                      value={regClassId}
                      onChange={(e) => setRegClassId(e.target.value)}
                      required
                      className="w-full rounded-xl border border-brand-200 py-2.5 px-3 focus:ring-2 focus:ring-brand-100 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    >
                      <option value="">Pilih Class ▼</option>
                      {classes.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink-700 dark:text-slate-300 mb-1">
                      Gender
                    </label>
                    <select
                      value={regGender}
                      onChange={(e) => setRegGender(e.target.value as Gender)}
                      className="w-full rounded-xl border border-brand-200 py-2.5 px-3 focus:ring-2 focus:ring-brand-100 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    >
                      <option value="male">Laki-laki</option>
                      <option value="female">Perempuan</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAddingStudent(false)}
                    className="px-5 py-2.5 text-sm font-bold bg-slate-100 text-ink-600 rounded-xl hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-sm font-bold bg-brand-600 text-white rounded-xl shadow-sm hover:bg-brand-700"
                  >
                    Buat Student
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 border-b border-brand-100 dark:border-slate-800 pb-4">
            <h3 className="font-bold text-ink-900 dark:text-white flex items-center gap-2">
              <School className="h-5 w-5 text-brand-600" /> Analisis Kelas
            </h3>
            {teacherClasses.length > 0 ? (
              <ClassSelector
                classes={teacherClasses}
                selectedIdx={selectedClassIdx}
                onSelect={setSelectedClassIdx}
              />
            ) : (
              loadingClasses && (
                <ClassSelector
                  classes={[]}
                  selectedIdx={-1}
                  onSelect={() => {}}
                  loading={true}
                />
              )
            )}
          </div>

          {loadingData || loadingClasses ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="h-32">
                    <div className="flex justify-between mb-3">
                      <Skeleton className="h-10 w-10 rounded-xl" />
                    </div>
                    <Skeleton className="h-8 w-24 mb-2" />
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-40" />
                  </Card>
                ))}
              </div>
              <Card className="p-6">
                <div className="flex justify-between mb-6">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
                <div className="space-y-4">
                  <div className="flex gap-4 border-b border-slate-100 pb-3">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-1/4" />
                  </div>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4">
                      <Skeleton className="h-6 w-1/4" />
                      <Skeleton className="h-6 w-1/4" />
                      <Skeleton className="h-6 w-1/4" />
                      <Skeleton className="h-6 w-1/4" />
                    </div>
                  ))}
                </div>
              </Card>
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="h-[350px] flex items-center justify-center">
                  <Spinner className="h-8 w-8 text-brand-300" />
                </Card>
                <Card className="h-[350px] flex items-center justify-center">
                  <Spinner className="h-8 w-8 text-brand-300" />
                </Card>
              </div>
            </div>
          ) : errorAnalytics ? (
            <Card className="flex flex-col items-center justify-center p-8 text-center border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/30">
              <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-bold text-red-800 dark:text-red-400 mb-2">
                Gagal memuat analitik
              </h3>
              <p className="text-sm text-red-600 dark:text-red-300 mb-6 max-w-sm">
                Terjadi kesalahan saat mengambil data performa kelas. Silakan
                coba lagi.
              </p>
              <button
                onClick={() => {
                  fetchUsersAndClasses();
                }}
                className="px-4 py-2 text-sm font-semibold bg-white text-red-700 border border-red-200 rounded-lg hover:bg-red-50 shadow-sm dark:bg-red-900/20 dark:border-red-800 dark:text-red-300"
              >
                Coba Lagi
              </button>
            </Card>
          ) : !dashboardData || teacherClasses.length === 0 ? (
            <Card className="flex h-40 items-center justify-center text-ink-500 italic">
              Silakan tambahkan atau pilih kelas terlebih dahulu untuk melihat
              statistik.
            </Card>
          ) : (
            <>
              {/* Stats */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  icon={Target}
                  label="Rata-rata Sisa HP (Kesehatan)"
                  value={dashboardData.classAverage + "%"}
                  sub={`${dashboardData.overview.totalAttempts} Total Percobaan`}
                  accent="from-brand-500 to-brand-700"
                />
                <StatCard
                  icon={Award}
                  label="Evakuasi Tercepat"
                  value={
                    dashboardData.topStudent?.averageTime
                      ? dashboardData.topStudent.averageTime + "s"
                      : "-"
                  }
                  sub={
                    dashboardData.topStudent?.name ||
                    t("teacher.no_data", "Belum ada data")
                  }
                  accent="from-brand-500 to-brand-600"
                />
                <StatCard
                  icon={TrendingDown}
                  label={t("teacher.needs_attention", "Perlu Perhatian Khusus")}
                  value={
                    dashboardData.lowStudent?.averageScore
                      ? dashboardData.lowStudent.averageScore + "% HP"
                      : "-"
                  }
                  sub={
                    dashboardData.lowStudent?.name ||
                    t("teacher.no_data", "Belum ada data")
                  }
                  accent="from-brand-500 to-brand-600"
                />
                <StatCard
                  icon={Clock}
                  label="Rata-rata Waktu Evakuasi"
                  value={dashboardData.overview.averageTime + "s"}
                  sub="Kecepatan rata-rata kelas"
                  accent="from-brand-500 to-brand-600"
                />
              </div>

              {/* Student ranking */}
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-base font-bold text-ink-900 dark:text-white flex items-center gap-2">
                    <Users className="h-4 w-4 text-brand-600" />
                    Daftar Siswa — {selectedClass.name} (Kelas{" "}
                    {selectedClass.grade} Ruang {selectedClass.section})
                  </h3>
                  <button
                    onClick={() => setLocale(locale === "id" ? "en" : "id")}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title={t("dashboard.language")}
                  >
                    <Globe className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-bold font-mono text-slate-600 dark:text-slate-400">
                      {locale.toUpperCase()}
                    </span>
                  </button>
                  <span className="text-xs font-semibold text-brand-600 bg-brand-50 dark:bg-brand-500/10 px-3 py-1 rounded-full">
                    Total: {dashboardData.students.length} Siswa
                  </span>
                </div>

                {dashboardData.students.length === 0 ? (
                  <div className="py-8 text-center text-sm text-ink-500">
                    {t(
                      "teacher.no_students_enrolled",
                      "Belum ada siswa yang mendaftar di kelas ini.",
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-brand-50 text-left text-xs font-semibold uppercase tracking-wider text-ink-400 dark:border-slate-700 dark:text-slate-500">
                          <th className="pb-3 pr-4">Peringkat</th>
                          <th className="pb-3 pr-4">Nama Siswa</th>
                          <th className="pb-3 pr-4">Rata-rata HP Sisa</th>
                          <th className="pb-3 pr-4">
                            Waktu Evakuasi (Rata-rata)
                          </th>
                          <th className="pb-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardData.students.map((s: any, idx: number) => (
                          <tr
                            key={s.id}
                            onClick={() => setSelectedStudentForDetail(s)}
                            className="cursor-pointer border-b border-brand-50/50 transition-colors hover:bg-brand-50/80 dark:border-slate-800 dark:hover:bg-slate-800/80"
                          >
                            <td className="py-3 pr-4">
                              <span
                                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${idx === 0 ? "bg-amber-100 text-amber-700" : idx === 1 ? "bg-slate-200 text-slate-700" : idx === 2 ? "bg-orange-100 text-orange-700" : "bg-brand-50 text-brand-600 dark:bg-slate-800 dark:text-slate-400"}`}
                              >
                                {idx + 1}
                              </span>
                            </td>
                            <td className="py-3 pr-4 font-semibold text-ink-900 dark:text-white">
                              {s.name}
                            </td>
                            <td className="py-3 pr-4">
                              <span className="font-display font-bold text-brand-700 dark:text-brand-400">
                                {s.averageScore}%
                              </span>
                            </td>
                            <td className="py-3 pr-4">
                              <span className="font-semibold">
                                {s.averageTime}s
                              </span>
                            </td>
                            <td className="py-3">
                              {s.isOnline ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>{" "}
                                  Online
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-400">
                                  <span className="h-2 w-2 rounded-full bg-ink-300"></span>{" "}
                                  Offline
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {selectedStudentForDetail && (
                <TeacherStudentDetailModal
                  student={selectedStudentForDetail}
                  onClose={() => setSelectedStudentForDetail(null)}
                />
              )}

              {/* Charts row — only show when real hazard breakdown data exists */}
              {dashboardData.students.length > 0 &&
                dashboardData.radarData.length > 0 && (
                  <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                      <h3 className="mb-4 font-display text-base font-bold text-ink-900 dark:text-white">
                        {t("teacher.chart.radar")}
                      </h3>
                      <ResponsiveContainer width="100%" height={280}>
                        <RadarChart data={dashboardData.radarData}>
                          <PolarGrid stroke="#e2e8f0" />
                          <PolarAngleAxis
                            dataKey="subjectKey"
                            tickFormatter={(v) => t(v)}
                            tick={{ fontSize: 11, fill: "#64748b" }}
                          />
                          <PolarRadiusAxis
                            domain={[0, 100]}
                            tick={{ fontSize: 9, fill: "#94a3b8" }}
                          />
                          <Radar
                            name={t("teacher.radar.class")}
                            dataKey="class"
                            stroke="hsl(var(--brand-400))"
                            fill="hsl(var(--brand-400))"
                            fillOpacity={0.3}
                          />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Tooltip
                            labelFormatter={(v) => t(v as string)}
                            contentStyle={{
                              borderRadius: 12,
                              border: "1px solid #e2e8f0",
                              fontSize: 12,
                            }}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </Card>

                    <Card>
                      <h3 className="mb-4 font-display text-base font-bold text-ink-900 dark:text-white">
                        {t("teacher.chart.bar")}
                      </h3>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={dashboardData.barData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e2e8f0"
                          />
                          <XAxis
                            dataKey="nameKey"
                            tickFormatter={(v) => t(v)}
                            tick={{ fontSize: 11, fill: "#64748b" }}
                          />
                          <YAxis
                            domain={[0, 100]}
                            tick={{ fontSize: 11, fill: "#64748b" }}
                          />
                          <Tooltip
                            labelFormatter={(v) => t(v as string)}
                            contentStyle={{
                              borderRadius: 12,
                              border: "1px solid #e2e8f0",
                              fontSize: 12,
                            }}
                          />
                          <Bar
                            dataKey="score"
                            fill="hsl(var(--brand-600))"
                            radius={[8, 8, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>
                  </div>
                )}
              {dashboardData.students.length > 0 &&
                dashboardData.radarData.length === 0 && (
                  <Card>
                    <p className="py-6 text-center text-sm text-ink-400 dark:text-slate-500">
                      Belum ada data per jenis bencana. Data grafik akan
                      tersedia setelah siswa menyelesaikan simulasi dengan
                      berbagai jenis hazard.
                    </p>
                  </Card>
                )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
