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
} from "recharts";
import { useI18n } from "@/hooks/useI18n";
import { useSchool } from "@/hooks/useSchool";
import { useToast } from "@/hooks/useToast";
import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getAllProfiles, type UserProfile } from "@/data/userProfiles";
import { getAllAccounts, type UserAccount } from "@/data/accounts";
import { getAllSchools } from "@/services/schoolService";
import { getSurveyStats, type SurveyStats } from "@/services/surveyService";
import { LoadingState } from "@/components/ui/LoadingState";
import { useData } from "@/hooks/useData";

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

type Tab = "national" | "province" | "regency" | "school";

export function LeaderboardView() {
  const { t } = useI18n();
  const { currentProfile, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("school");

  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const currentSchoolId = currentProfile?.schoolId || "unknown";
  const currentRegency = currentProfile?.regency || "Kabupaten Mojokerto";
  const currentProvince = currentProfile?.province || "Jawa Timur";

  const profilesUrl = useMemo(() => {
    if (activeTab === "school")
      return `/api/profile/all?schoolId=${encodeURIComponent(currentSchoolId)}`;
    if (activeTab === "regency")
      return `/api/profile/all?regency=${encodeURIComponent(currentRegency)}`;
    if (activeTab === "province")
      return `/api/profile/all?province=${encodeURIComponent(currentProvince)}`;
    return `/api/profile/all`;
  }, [activeTab, currentSchoolId, currentRegency, currentProvince]);

  const {
    data: profilesData,
    isLoading: loadingProfiles,
    error: profilesError,
  } = useData<{ profiles: UserProfile[] }>(profilesUrl);
  const { data: accountsData, isLoading: loadingAccounts } = useData<{
    accounts: UserAccount[];
  }>("/api/profile/accounts");

  const loading = loadingProfiles || loadingAccounts;

  const leaderboardData: LeaderboardEntry[] = useMemo(() => {
    if (loading || !profilesData?.profiles || !accountsData?.accounts)
      return [];

    const filteredProfiles = profilesData.profiles;

    const mapped = filteredProfiles.map((p: UserProfile) => {
      const acc = accountsData.accounts.find(
        (a: UserAccount) => a.id === p.userId,
      );
      return {
        id: p.userId,
        name: acc?.name || "Pengguna",
        avatar: p.avatar,
        totalPoints: p.totalPoints,
        schoolName: p.schoolName || p.schoolId,
        isCurrentUser: p.userId === currentProfile?.userId,
        grade: p.grade,
        classSection: p.classSection,
        badges: p.badges || [],
        topicScores: p.topicScores || {},
      };
    });

    mapped.sort(
      (a: LeaderboardEntry, b: LeaderboardEntry) =>
        b.totalPoints - a.totalPoints,
    );
    return mapped.slice(0, 10); // Top 10
  }, [loading, profilesData, accountsData, currentProfile]);

  return (
    <>
      <div className="glass rounded-2xl p-5 dark:bg-slate-900/60 mt-6 animate-fade-up">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div>
            <h3 className="font-display text-lg font-bold text-ink-900 dark:text-white flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Papan Peringkat
            </h3>
            <p className="text-sm text-ink-500 dark:text-slate-400 mt-1">
              Top 10 pahlawan tangguh bencana terbaik
            </p>
          </div>

          {/* Tabs */}
          <div className="grid grid-cols-3 bg-brand-50 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setActiveTab("school")}
              className={`flex items-center justify-center gap-1.5 px-2 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                activeTab === "school"
                  ? "bg-white dark:bg-slate-700 text-brand-600 shadow-sm"
                  : "text-ink-500 hover:text-ink-700 dark:text-slate-400"
              }`}
            >
              <School className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />{" "}
              <span className="truncate">Sekolah</span>
            </button>
            <button
              onClick={() => setActiveTab("regency")}
              className={`flex items-center justify-center gap-1.5 px-2 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                activeTab === "regency"
                  ? "bg-white dark:bg-slate-700 text-brand-600 shadow-sm"
                  : "text-ink-500 hover:text-ink-700 dark:text-slate-400"
              }`}
            >
              <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />{" "}
              <span className="truncate">Kab/Kota</span>
            </button>
            <button
              onClick={() => setActiveTab("province")}
              className={`flex items-center justify-center gap-1.5 px-2 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                activeTab === "province"
                  ? "bg-white dark:bg-slate-700 text-brand-600 shadow-sm"
                  : "text-ink-500 hover:text-ink-700 dark:text-slate-400"
              }`}
            >
              <Map className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />{" "}
              <span className="truncate">Provinsi</span>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {loading ? (
            <LoadingState message="Memuat papan peringkat..." />
          ) : leaderboardData.length === 0 ? (
            <div className="py-8 text-center text-sm font-medium text-ink-500 dark:text-slate-400">
              {t("survey.no_data", "Belum ada data untuk kategori ini.")}
            </div>
          ) : (
            leaderboardData.map((user, index) => (
              <button
                key={user.id}
                onClick={() => setSelectedUser(user.id)}
                className={`w-full text-left flex items-center gap-4 p-3 rounded-xl border transition-all ${
                  user.isCurrentUser
                    ? "border-brand-500 bg-brand-50/50 dark:border-brand-500/50 dark:bg-brand-900/20 shadow-sm hover:bg-brand-50 dark:hover:bg-brand-900/40"
                    : "border-brand-100/50 bg-white/40 dark:border-slate-800 dark:bg-slate-800/40 hover:bg-white/80 dark:hover:bg-slate-800/80"
                }`}
              >
                <div className="w-8 shrink-0 text-center flex justify-center">
                  {index === 0 ? (
                    <Trophy className="h-6 w-6 text-amber-500 drop-shadow-sm" />
                  ) : index === 1 ? (
                    <Medal className="h-6 w-6 text-slate-400 drop-shadow-sm" />
                  ) : index === 2 ? (
                    <Medal className="h-6 w-6 text-orange-600 drop-shadow-sm" />
                  ) : (
                    <span className="font-bold text-ink-400 dark:text-slate-500">
                      #{index + 1}
                    </span>
                  )}
                </div>

                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-brand-100 to-brand-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center font-bold text-brand-700 dark:text-brand-300">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    user.name.substring(0, 2).toUpperCase()
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-ink-900 dark:text-white truncate">
                      {user.name}
                    </p>
                    {user.isCurrentUser && (
                      <span className="text-[10px] font-bold bg-brand-500 text-white px-2 py-0.5 rounded-full">
                        Anda
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-500 dark:text-slate-400 truncate">
                    {user.schoolName}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-display font-extrabold text-brand-600 dark:text-brand-400">
                    {user.totalPoints}{" "}
                    <span className="text-xs font-medium text-ink-500">
                      pts
                    </span>
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Public Profile Modal */}
      {selectedUser && (
        <LeaderboardProfileModal
          userId={selectedUser}
          onClose={() => setSelectedUser(null)}
          leaderboardData={leaderboardData}
        />
      )}
    </>
  );
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  avatar?: string;
  totalPoints: number;
  schoolName: string;
  isCurrentUser: boolean;
  grade: "X" | "XI" | "XII";
  classSection: string;
  badges: string[];
  topicScores: Record<string, any>;
}

function LeaderboardProfileModal({
  userId,
  onClose,
  leaderboardData,
}: {
  userId: string;
  onClose: () => void;
  leaderboardData: LeaderboardEntry[];
}) {
  const user = leaderboardData.find((u) => u.id === userId);

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const topicScores = user.topicScores ? Object.values(user.topicScores) : [];
  const getScore = (key: string) => user.topicScores?.[key]?.averageScore || 0;

  const radarData = [
    { subject: "Pengetahuan", A: getScore("knowledge") },
    { subject: "Respons", A: getScore("response") },
    { subject: "Logika", A: getScore("logic") },
    { subject: "Persiapan", A: getScore("preparation") },
    { subject: "Konsistensi", A: getScore("consistency") },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-900/40 p-4 backdrop-blur-sm sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cover Photo */}
        <div className="h-32 bg-gradient-to-br from-brand-500 to-brand-700 relative">
          <div className="absolute inset-0 bg-grid-pattern bg-[size:24px_24px] opacity-20" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 h-8 w-8 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center text-white transition-colors backdrop-blur-sm"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 pb-6 pt-0 relative">
          {/* Avatar */}
          <div className="flex justify-between items-end -mt-12 mb-4 relative z-10">
            <div className="h-24 w-24 rounded-full border-4 border-white dark:border-slate-900 bg-gradient-to-br from-brand-100 to-brand-300 dark:from-slate-700 dark:to-slate-800 shadow-sm flex items-center justify-center overflow-hidden">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-brand-700 dark:text-brand-300">
                  {initials}
                </span>
              )}
            </div>

            <div className="pb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                <Trophy className="h-3.5 w-3.5" /> {user.totalPoints} PTS
              </span>
            </div>
          </div>

          {/* Info */}
          <div>
            <h2 className="text-xl font-bold text-ink-900 dark:text-white flex items-center gap-2">
              {user.name}
              {user.totalPoints >= 1000 && <BadgeCheck />}
            </h2>
            <div className="mt-1 flex flex-wrap gap-2 text-sm text-ink-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <School className="h-3.5 w-3.5" /> {user.schoolName}
              </span>
              <span className="flex items-center gap-1">
                &bull; Kelas {user.grade}{user.classSection ? ` - ${user.classSection}` : ""}
              </span>
            </div>
          </div>

          <div className="mt-6 border-t border-brand-50 pt-6 dark:border-slate-800 space-y-6">
            {/* Radar & Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="h-32 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex flex-col items-center justify-center p-2 relative overflow-hidden">
                <p className="absolute top-2 left-3 text-[10px] font-bold text-ink-400 uppercase tracking-wider">
                  Skill Radar
                </p>
                <div className="w-full h-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsRadarChart
                      cx="50%"
                      cy="50%"
                      outerRadius="60%"
                      data={radarData}
                    >
                      <PolarGrid
                        stroke="currentColor"
                        className="text-brand-200 dark:text-slate-700"
                      />
                      <Radar
                        name="Skor"
                        dataKey="A"
                        stroke="hsl(var(--brand-500))"
                        fill="hsl(var(--brand-500))"
                        fillOpacity={0.4}
                      />
                    </RechartsRadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-brand-50 dark:bg-brand-500/10 p-3 rounded-xl">
                  <p className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider mb-1">
                    Status
                  </p>
                  <p className="text-sm font-semibold text-ink-900 dark:text-white flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-brand-500" /> Aktif
                    Belajar
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Badges
                  </p>
                  <div className="flex gap-1.5 flex-wrap">
                    <div
                      className="h-6 w-6 rounded-full bg-amber-100 flex items-center justify-center"
                      title="Pemula"
                    >
                      <Shield className="h-3 w-3 text-amber-600" />
                    </div>
                    {user.totalPoints >= 500 && (
                      <div
                        className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center"
                        title="Konsisten"
                      >
                        <Award className="h-3 w-3 text-blue-600" />
                      </div>
                    )}
                    {user.totalPoints >= 1000 && (
                      <div
                        className="h-6 w-6 rounded-full bg-brand-100 flex items-center justify-center"
                        title="Master"
                      >
                        <Target className="h-3 w-3 text-brand-600" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div>
              <p className="text-xs font-bold text-ink-900 dark:text-white mb-3 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-brand-500" /> Aktivitas 7
                Hari Terakhir
              </p>
              <div className="flex h-24 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-sm text-slate-400">
                  Belum ada data aktivitas
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BadgeCheck() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-brand-500"
    >
      <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
