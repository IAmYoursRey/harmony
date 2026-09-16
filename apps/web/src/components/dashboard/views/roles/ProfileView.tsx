import { useState, useEffect, useMemo, useRef } from "react";
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
  Eye,
  EyeOff,
  type LucideIcon,
} from "lucide-react";
import {
  getAllSchools,
  extractProvinces,
  extractRegencies,
} from "@/services/schoolService";
import type { School as SchoolData } from "@/data/schools";
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
import { useNavigate } from "react-router-dom";
import { useSchool } from "@/hooks/useSchool";
import { ProgressRing } from "@/components/dashboard/Charts";
import { apiClient } from "@/services/apiClient";

interface ProfileData {
  fullName: string;
  school: string;
  className: string;
  email: string;
  phone: string;
  password?: string;
  avatar: string | null;
}

function EditableField({
  icon: Icon,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  rightElement,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  rightElement?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-brand-100 bg-white/60 p-3 dark:border-slate-700 dark:bg-slate-800/60">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-slate-700 dark:text-brand-400">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-ink-500 dark:text-slate-400">{label}</p>
        <div className="relative flex items-center gap-2">
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-transparent text-sm font-semibold text-ink-900 placeholder:text-xs placeholder:font-normal placeholder:text-ink-400 outline-none dark:text-white dark:placeholder:text-slate-500"
          />
          {rightElement}
        </div>
      </div>
    </div>
  );
}

function EditableSelect({
  icon: Icon,
  label,
  value,
  options,
  onChange,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-brand-100 bg-white/60 p-3 dark:border-slate-700 dark:bg-slate-800/60">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-slate-700 dark:text-brand-400">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-ink-500 dark:text-slate-400">{label}</p>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-sm font-semibold text-ink-900 outline-none dark:text-white"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="text-ink-900 dark:text-slate-900">
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

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

export function ProfileView() {
  const { show } = useToast();
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const { currentUser, currentProfile, updateUserAccount, updateUserProfile } =
    useAuth();
  const [editing, setEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const initialData: ProfileData = {
    fullName: currentUser?.name || "Guest User",
    school: currentProfile?.schoolId || "SMA Negeri 1 Mojokerto",
    className: currentProfile?.grade || "Umum",
    email: currentUser?.email || "guest@harmony.edu",
    phone: currentProfile?.phone || "-",
    password: "",
    avatar: currentProfile?.avatar || null,
  };

  const [data, setData] = useState<ProfileData>(initialData);
  const [draft, setDraft] = useState<ProfileData>(initialData);
  const [saved, setSaved] = useState(false);
  const [prefs, setPrefs] = useState({
    alerts: true,
    digest: true,
    contacts: true,
    location: false,
    isPublic: currentProfile?.isPublic ?? true,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [quizHistories, setQuizHistories] = useState<any[]>([]);
  const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser?.id) {
      apiClient.get(`/api/quiz-history/student/${currentUser.id}`).then((res: any) => {
        if (res.success && res.data) {
          setQuizHistories(res.data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        }
      });
    }
  }, [currentUser?.id]);


  const startEdit = () => {
    setDraft({ ...data, password: "" });
    setShowPassword(false);
    setEditing(true);
  };

  const { selection } = useSchool();

  const getSchoolName = (id: string | undefined | null) => {
    if (!id || id === "unknown")
      return t("school.unknown", "Belum Memilih Sekolah");
    return selection?.school?.name || id;
  };

  const saveChanges = async () => {
    try {
      if (draft.password && draft.password.trim() !== "") {
        if (draft.password.trim().length < 6) {
          show(
            locale === "en"
              ? "Password must be at least 6 characters"
              : "Password minimal 6 karakter",
            "error",
          );
          return;
        }
      }

      const accountUpdates: { name?: string; email?: string; password?: string } = {};
      if (draft.fullName !== currentUser?.name)
        accountUpdates.name = draft.fullName;
      if (draft.email !== currentUser?.email)
        accountUpdates.email = draft.email;
      if (draft.password && draft.password.trim() !== "")
        accountUpdates.password = draft.password.trim();

      if (Object.keys(accountUpdates).length > 0) {
        const result = await updateUserAccount(accountUpdates);
        if (!result.success) throw new Error(result.error || "Gagal memperbarui info akun.");
      }

      const profileUpdates: Partial<UserProfile> = {};
      if (draft.phone !== currentProfile?.phone)
        profileUpdates.phone = draft.phone;
      if (draft.avatar !== currentProfile?.avatar)
        profileUpdates.avatar = draft.avatar ?? undefined;
      if (draft.className !== currentProfile?.grade)
        profileUpdates.grade = draft.className as any;

      if (Object.keys(profileUpdates).length > 0) {
        updateUserProfile(profileUpdates);
      }

      setData({ ...draft, password: "" });
      setDraft({ ...draft, password: "" });
      setShowPassword(false);
      setEditing(false);
      setSaved(true);
      show("Profil berhasil diperbarui", "success");
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : "Gagal menyimpan profil", "error");
    }
  };

  const cancelEdit = () => {
    setDraft({ ...data, password: "" });
    setShowPassword(false);
    setEditing(false);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024) {
        show(
          "Ukuran gambar terlalu besar. Maksimal 100KB agar memori peramban tidak penuh.",
          "error",
        );
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (editing) {
          setDraft((d) => ({ ...d, avatar: result }));
        } else {
          setData((d) => ({ ...d, avatar: result }));
          updateUserProfile({ avatar: result });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const current = editing ? draft : data;
  const initials = current.fullName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const realModules = useMemo(() => {
    if (!currentProfile?.topicScores) return [];
    return Object.entries(currentProfile.topicScores).map(
      ([key, scoreData]: [string, any]) => ({
        label:
          key === "t1"
            ? "Quiz/Lesson"
            : key === "t2"
              ? "Simulation"
              : key === "t3"
                ? "Assessment"
                : key,
        value: scoreData.averageScore || 0,
      }),
    );
  }, [currentProfile]);

  const realHistory = useMemo(() => {
    if (!currentProfile?.activities) return [];
    return [...currentProfile.activities]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, 5)
      .map((act) => ({
        title: act.title,
        date: new Date(act.timestamp).toLocaleDateString(),
        score: act.status || "Completed",
        icon:
          act.type === "simulation"
            ? Shield
            : act.type === "quiz"
              ? Brain
              : BookOpen,
      }));
  }, [currentProfile]);

  const realAchievements = useMemo(() => {
    const badges = currentProfile?.badges || [];
    if (badges.length === 0 && (currentProfile?.totalPoints ?? 0) > 0) {
      const derived = [];
      const pts = currentProfile?.totalPoints ?? 0;
      if (pts >= 100)
        derived.push({
          icon: Target,
          label: "100 Points",
          color: "from-brand-400 to-brand-500",
        });
      if (pts >= 250)
        derived.push({
          icon: Award,
          label: "Dedicated",
          color: "from-brand-500 to-brand-700",
        });
      if (pts >= 500)
        derived.push({
          icon: Trophy,
          label: "Master",
          color: "from-amber-400 to-amber-600",
        });
      return derived;
    }
    return badges.map((b) => ({
      icon: Award,
      label: b,
      color: "from-brand-500 to-brand-600",
    }));
  }, [currentProfile]);

  return (
    <div className="space-y-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-6 text-white shadow-glass-lg sm:p-8">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:36px_36px] opacity-15" />
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:items-end">
          <div className="relative">
            <span className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-3xl font-extrabold shadow-glass ring-1 ring-white/30">
              {current.avatar ? (
                <img
                  src={current.avatar}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}
            </span>
            <button
              onClick={handleAvatarClick}
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white text-brand-700 shadow-glass transition-transform hover:scale-110"
              aria-label="Change profile picture"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <div>
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink-900 dark:text-white">
              {currentUser?.name || "Pengguna"}
            </h2>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                {currentUser?.role === "developer"
                  ? t("role.developer", "Developer")
                  : currentUser?.role === "teacher"
                    ? t("role.teacher", "Teacher")
                    : t("role.student", "Student")}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <MapPin className="h-3 w-3" />{" "}
                {currentProfile?.schoolId || "SMA Negeri 1 Mojokerto"}
              </span>
            </div>
          </div>

          {!editing && (
            <button
              onClick={startEdit}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-brand-700 shadow-glass transition-all hover:-translate-y-0.5"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Saved toast */}
      <AnimatePresence>
        {saved && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-glass-lg"
          >
            <CheckCircle2 className="h-4 w-4" /> Changes saved successfully
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center gap-4">
          <ProgressRing
            value={Math.min(
              100,
              Math.round(((currentProfile?.totalPoints || 0) / 500) * 100),
            )}
            size={64}
            stroke={6}
            label={`${Math.min(100, Math.round(((currentProfile?.totalPoints || 0) / 500) * 100))}`}
          />
          <div>
            <p className="font-display text-lg font-extrabold text-ink-900 dark:text-white">
              Harmony Score
            </p>
            <p className="text-xs font-semibold text-brand-600">
              {(currentProfile?.totalPoints ?? 0) > 300
                ? "Highly Resilient"
                : "Developing"}
            </p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400">
            <Award className="h-7 w-7" />
          </span>
          <div>
            <p className="font-display text-lg font-extrabold text-ink-900 dark:text-white">
              {realAchievements.length}
            </p>
            <p className="text-xs text-ink-500 dark:text-slate-400">
              Badges Earned
            </p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-slate-800 dark:text-brand-400">
            <BookOpen className="h-7 w-7" />
          </span>
          <div>
            <p className="font-display text-lg font-extrabold text-ink-900 dark:text-white">
              {realHistory.length}
            </p>
            <p className="text-xs text-ink-500 dark:text-slate-400">
              Activities Completed
            </p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400">
            <Zap className="h-7 w-7" />
          </span>
          <div>
            <p className="font-display text-lg font-extrabold text-ink-900 dark:text-white">
              {currentProfile?.totalPoints || 0}
            </p>
            <p className="text-xs text-ink-500 dark:text-slate-400">
              Total Points
            </p>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Editable profile */}
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-ink-900 dark:text-white">
              {editing ? "Edit Profile" : "Research Profile"}
            </h3>
            {!editing && (
              <button
                onClick={startEdit}
                className="inline-flex items-center gap-1.5 rounded-full border border-brand-100 px-4 py-2 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50 dark:border-slate-700 dark:text-brand-400 dark:hover:bg-slate-800"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {editing ? (
              <>
                <EditableField
                  icon={Target}
                  label="Full Name"
                  value={draft.fullName}
                  onChange={(v) => setDraft({ ...draft, fullName: v })}
                />

                {currentUser?.role === "developer" ? (
                  <EditableField
                    icon={School}
                    label="School"
                    value={draft.school}
                    onChange={(v) => setDraft({ ...draft, school: v })}
                  />
                ) : draft.school === "unknown" ? (
                  <div className="flex flex-col rounded-xl border border-brand-50 p-3 dark:border-slate-800 bg-brand-50/50 dark:bg-slate-900/50 relative">
                    <div className="flex items-center gap-3 justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-slate-800 dark:text-brand-400">
                          <School className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-xs text-ink-500 dark:text-slate-400">
                            School
                          </p>
                          <p className="truncate text-sm font-semibold text-amber-600 dark:text-amber-500">
                            {t("school.unknown", "Belum Memilih Sekolah")}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate("/school-selection")}
                        className="bg-brand-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap hover:bg-brand-700"
                      >
                        Pilih
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col rounded-xl border border-brand-50 p-3 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 opacity-80 cursor-not-allowed relative group">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-slate-800 dark:text-brand-400">
                        <School className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-xs text-ink-500 dark:text-slate-400">
                          School
                        </p>
                        <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">
                          {getSchoolName(draft.school)}
                        </p>
                      </div>
                    </div>
                    {/* Tooltip */}
                    <div className="pointer-events-none absolute left-1/2 -top-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink-900 px-3 py-1.5 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-slate-700">
                      Hanya Developer yang dapat mengubah sekolah
                    </div>
                  </div>
                )}

                <EditableSelect
                  icon={BookOpen}
                  label="Class"
                  value={draft.className}
                  options={[
                    { label: "Kelas X", value: "X" },
                    { label: "Kelas XI", value: "XI" },
                    { label: "Kelas XII", value: "XII" },
                  ]}
                  onChange={(v) => setDraft({ ...draft, className: v })}
                />
                <EditableField
                  icon={Mail}
                  label="Email"
                  value={draft.email}
                  onChange={(v) => setDraft({ ...draft, email: v })}
                />
                <EditableField
                  icon={Phone}
                  label="Phone Number"
                  value={draft.phone}
                  onChange={(v) => setDraft({ ...draft, phone: v })}
                />
                <EditableField
                  icon={Lock}
                  label={
                    locale === "en"
                      ? "Password (New)"
                      : "Password (Ganti Sandi)"
                  }
                  value={draft.password || ""}
                  onChange={(v) => setDraft({ ...draft, password: v })}
                  type={showPassword ? "text" : "password"}
                  placeholder={
                    locale === "en"
                      ? "Leave blank to keep unchanged"
                      : "Kosongkan jika tidak diubah"
                  }
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="p-1 text-ink-400 transition-colors hover:text-ink-700 dark:text-slate-400 dark:hover:text-slate-200"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  }
                />
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 rounded-xl border border-brand-50 p-3 dark:border-slate-800">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-slate-800 dark:text-brand-400">
                    <Target className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-ink-500 dark:text-slate-400">
                      Full Name
                    </p>
                    <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">
                      {data.fullName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-brand-50 p-3 dark:border-slate-800 justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-slate-800 dark:text-brand-400">
                      <School className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-ink-500 dark:text-slate-400">
                        School
                      </p>
                      <p
                        className={`truncate text-sm font-semibold ${data.school === "unknown" ? "text-amber-600 dark:text-amber-500" : "text-ink-900 dark:text-white"}`}
                      >
                        {getSchoolName(data.school)}
                      </p>
                    </div>
                  </div>
                  {data.school === "unknown" && (
                    <button
                      onClick={() => navigate("/school-selection")}
                      className="bg-brand-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap hover:bg-brand-700"
                    >
                      Pilih
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-brand-50 p-3 dark:border-slate-800">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-slate-800 dark:text-brand-400">
                    <BookOpen className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-ink-500 dark:text-slate-400">
                      Class
                    </p>
                    <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">
                      {data.className}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-brand-50 p-3 dark:border-slate-800">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-slate-800 dark:text-brand-400">
                    <Mail className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-ink-500 dark:text-slate-400">
                      Email
                    </p>
                    <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">
                      {data.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-brand-50 p-3 dark:border-slate-800">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-slate-800 dark:text-brand-400">
                    <Phone className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-ink-500 dark:text-slate-400">
                      Phone Number
                    </p>
                    <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">
                      {data.phone}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-brand-50 p-3 dark:border-slate-800">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-slate-800 dark:text-brand-400">
                    <Lock className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-ink-500 dark:text-slate-400">
                      Password
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">
                        {locale === "en" ? "Protected" : "Tersimpan aman"}
                      </p>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        {locale === "en" ? "Encrypted" : "Terenkripsi"}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Edit buttons */}
          {editing && (
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={saveChanges}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-glass transition-all hover:bg-brand-700 hover:-translate-y-0.5"
              >
                <Save className="h-4 w-4" /> Save Changes
              </button>
              <button
                onClick={cancelEdit}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-100 bg-white/60 px-6 py-3 text-sm font-semibold text-ink-600 transition-colors hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" /> Cancel
              </button>
            </div>
          )}
        </Card>

        {/* Module progress */}
        <Card className="lg:col-span-1">
          <h3 className="mb-4 font-display text-base font-bold text-ink-900 dark:text-white">
            Module Progress
          </h3>
          <div className="space-y-3">
            {realModules.length === 0 ? (
              <p className="text-sm text-ink-500 dark:text-slate-400 py-4 text-center">
                Belum ada modul diselesaikan.
              </p>
            ) : (
              realModules.map((m) => {
                const val = currentProfile?.totalPoints === 0 ? 0 : m.value;
                return (
                  <div key={m.label} className="flex items-center gap-3">
                    <ProgressRing
                      value={val}
                      size={44}
                      stroke={4}
                      label={`${val}`}
                    />
                    <span className="text-sm font-medium text-ink-700 dark:text-slate-300">
                      {m.label}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* Certificates (Hidden temporarily as real cert data is unavailable) */}

      {/* History + achievements */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-display text-base font-bold text-ink-900 dark:text-white">
            Learning History
          </h3>
          {currentProfile?.totalPoints === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm font-medium text-ink-500 dark:text-slate-400">
              {t(
                "profile.no_learning_history",
                "Belum ada riwayat pembelajaran.",
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {realHistory.map((h, i) => (
                <div
                  key={i}
                  className="group flex items-center gap-3 rounded-xl border border-brand-50 p-3 transition-colors hover:bg-brand-50/50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-slate-800 dark:text-brand-400">
                    <h.icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">
                      {h.title}
                    </p>
                    <p className="flex items-center gap-1 text-[11px] text-ink-500 dark:text-slate-400">
                      <Clock className="h-3 w-3" /> {h.date}
                    </p>
                  </div>
                  <span className="flex items-center gap-1.5 font-display text-sm font-bold text-brand-700 dark:text-brand-400">
                    <CheckCircle2 className="h-4 w-4 text-brand-500" />{" "}
                    {h.score}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="mb-4 font-display text-base font-bold text-ink-900 dark:text-white">
            Achievements
          </h3>
          {currentProfile?.totalPoints === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm font-medium text-ink-500 dark:text-slate-400">
              {t("profile.no_achievements", "Belum ada pencapaian.")}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {realAchievements.map((b, i) => (
                <div
                  key={i}
                  className="group flex flex-col items-center gap-2.5 rounded-xl p-3 text-center transition-all hover:-translate-y-1"
                >
                  <span
                    className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${b.color} text-white shadow-glass transition-transform group-hover:scale-110`}
                  >
                    <b.icon className="h-7 w-7" />
                  </span>
                  <span className="text-[10px] font-semibold leading-tight text-ink-600 dark:text-slate-300">
                    {b.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Privacy settings + logout */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-display text-base font-bold text-ink-900 dark:text-white">
            Privacy Settings
          </h3>
          <div className="space-y-3">
            {[
              {
                key: "alerts" as const,
                icon: Bell,
                label: "Disaster alerts",
                desc: "Notifications for your area",
              },
              {
                key: "digest" as const,
                icon: Mail,
                label: "Email digest",
                desc: "Weekly research summary",
              },
              {
                key: "contacts" as const,
                icon: Shield,
                label: "Emergency contacts",
                desc: "2 contacts configured",
              },
              {
                key: "location" as const,
                icon: Globe,
                label: "Location sharing",
                desc: "For risk-based recommendations",
              },
              {
                key: "isPublic" as const,
                icon: Users,
                label: "Jadikan Profil Publik",
                desc: "Tampilkan profil di klasemen umum",
              },
            ].map((s) => (
              <div
                key={s.key}
                className="flex items-center gap-3 rounded-xl border border-brand-50 p-3 dark:border-slate-800"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-slate-800 dark:text-brand-400">
                  <s.icon className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink-900 dark:text-white">
                    {s.label}
                  </p>
                  <p className="text-xs text-ink-500 dark:text-slate-400">
                    {s.desc}
                  </p>
                </div>
                <button
                  onClick={() => {
                    const newVal = !prefs[s.key as keyof typeof prefs];
                    setPrefs((p) => ({ ...p, [s.key]: newVal }));
                    if (s.key === "isPublic") {
                      updateUserProfile({ isPublic: newVal });
                    }
                  }}
                  role="switch"
                  aria-checked={prefs[s.key as keyof typeof prefs]}
                  aria-label={s.label}
                  className={`relative h-6 w-11 rounded-full transition-colors ${prefs[s.key as keyof typeof prefs] ? "bg-brand-600" : "bg-brand-100 dark:bg-slate-700"}`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${prefs[s.key as keyof typeof prefs] ? "left-[22px]" : "left-0.5"}`}
                  />
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col">
          <h3 className="mb-4 font-display text-base font-bold text-ink-900 dark:text-white">
            Account
          </h3>
          <div className="space-y-3">
            <button
              onClick={() =>
                show(
                  "Privacy & Security settings are managed by your school administrator.",
                  "info",
                )
              }
              className="flex w-full items-center gap-3 rounded-xl border border-brand-50 p-3 text-left transition-colors hover:bg-brand-50/60 dark:border-slate-800 dark:hover:bg-slate-800/60"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-slate-800 dark:text-brand-400">
                <Shield className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink-900 dark:text-white">
                  Privacy & Security
                </p>
                <p className="text-xs text-ink-500 dark:text-slate-400">
                  Password and data settings
                </p>
              </div>
            </button>

            <button
              onClick={() => navigate("/")}
              className="flex w-full items-center gap-3 rounded-xl border border-brand-100 p-3 text-left transition-colors hover:bg-brand-50 dark:border-brand-900/40 dark:hover:bg-brand-950/30"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400">
                <LogOut className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-brand-600 dark:text-brand-400">
                  Logout
                </p>
                <p className="text-xs text-ink-500 dark:text-slate-400">
                  Return to landing page
                </p>
              </div>
            </button>
          </div>
        </Card>
      </div>

      {/* Quiz History Section */}
      <Card className="mt-6">
        <div className="mb-4 flex items-center justify-between border-b border-brand-100 pb-4 dark:border-slate-800">
          <h3 className="font-display text-base font-bold text-ink-900 dark:text-white flex items-center gap-2">
            <Brain className="h-5 w-5 text-brand-600" /> Riwayat Kuis & Subtes
          </h3>
        </div>
        {quizHistories.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-500 dark:text-slate-400">
            Belum ada riwayat kuis.
          </p>
        ) : (
          <div className="space-y-4">
            {quizHistories.map((qh) => (
              <div key={qh.id} className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
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
                  <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                    {qh.evaluations.map((ev: any, idx: number) => {
                      const q = qh.questions.find((q: any) => q.id === ev.questionId);
                      const ans = qh.answers[ev.questionId];
                      return (
                        <div key={ev.questionId} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                          <p className="text-sm font-semibold text-ink-900 dark:text-white mb-2">
                            {idx + 1}. {q?.text || "Unknown Question"}
                          </p>
                          <div className="grid gap-2 sm:grid-cols-2 text-sm">
                            <div className="rounded border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
                              <span className="block text-xs font-bold text-slate-500 mb-1">Jawaban Kamu:</span>
                              <span className="text-ink-700 dark:text-slate-300">{ans}</span>
                            </div>
                            <div className={`rounded border p-2 ${ev.isCorrect ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-900/20' : 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-900/20'}`}>
                              <span className={`block text-xs font-bold mb-1 ${ev.isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                                Evaluasi AI: {ev.isCorrect ? 'Benar' : 'Salah'}
                              </span>
                              <span className="text-ink-700 dark:text-slate-300">{ev.feedback}</span>
                              {ev.overriddenByTeacher && (
                                <span className="mt-2 block text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded inline-block">
                                  Dikoreksi oleh Guru
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
      </Card>
    </div>
  );
}
