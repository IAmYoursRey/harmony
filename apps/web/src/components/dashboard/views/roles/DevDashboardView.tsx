import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  getAllAccounts,
  updateAccount,
  provisionAccount,
  deleteAccount,
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
  Search,
  Zap,
  Trophy,
  Compass,
  Flame,
  Medal,
  Save,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import {
  fetchSchools,
  fetchProvinces,
  fetchRegencies,
  getSchoolById,
} from "@/services/schoolService";
import { apiClient } from "@/services/apiClient";
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
import { LoadingState } from "@/components/ui/LoadingState";

function SearchableSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; name: string }[];
  placeholder: string;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()),
  );
  const selectedName = options.find((o) => o.id === value)?.name || placeholder;

  return (
    <div
      className={`relative ${disabled ? "opacity-50 pointer-events-none" : ""}`}
      ref={dropdownRef}
    >
      <button
        type="button"
        id={id}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left rounded-xl border border-brand-200 bg-white py-2.5 px-4 text-sm outline-none transition-all dark:border-slate-700 dark:bg-slate-800 dark:text-white flex justify-between items-center"
      >
        <span className="truncate">{selectedName}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-ink-400" />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-brand-200 rounded-xl shadow-lg max-h-60 flex flex-col dark:bg-slate-800 dark:border-slate-700">
          <div className="p-2 border-b border-brand-100 dark:border-slate-700">
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari..."
              className="w-full rounded-lg border border-brand-100 bg-brand-50 px-3 py-1.5 text-sm text-ink-900 outline-none focus:border-brand-400 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:focus:border-brand-500"
            />
          </div>
          <div className="overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="p-3 text-sm text-ink-400 dark:text-slate-400 text-center">
                Tidak ditemukan
              </div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-brand-50 dark:hover:bg-slate-700 ${value === opt.id ? "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400" : "text-ink-700 dark:text-slate-300"}`}
                >
                  {opt.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SchoolFilterCombobox({
  value,
  onChange,
  uniqueIds,
  schoolNamesMap,
  schoolUserCounts,
}: {
  value: string;
  onChange: (id: string) => void;
  uniqueIds: string[];
  schoolNamesMap: Record<string, string>;
  schoolUserCounts: Record<string, number>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredIds = useMemo(() => {
    if (!search.trim()) return uniqueIds;
    const lowerSearch = search.toLowerCase();
    return uniqueIds.filter((id) => {
      const name = schoolNamesMap[id] || id;
      return name.toLowerCase().includes(lowerSearch);
    });
  }, [search, uniqueIds, schoolNamesMap]);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-64 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-ink-700 dark:text-slate-300 transition-colors border border-slate-200 dark:border-slate-700"
      >
        <span className="truncate">
          {value === "all" ? "Semua Sekolah" : schoolNamesMap[value] || value}
        </span>
        <ChevronDown className="h-3 w-3 ml-2 shrink-0 opacity-50" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-80 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden right-0"
          >
            <div className="p-2 border-b border-slate-100 dark:border-slate-700">
              <input
                autoFocus
                type="text"
                placeholder="Cari sekolah..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-ink-700 dark:text-slate-300"
              />
            </div>
            <div className="max-h-60 overflow-y-auto p-1.5">
              <button
                onClick={() => {
                  onChange("all");
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors ${value === "all" ? "bg-brand-50 dark:bg-brand-500/10 text-brand-600 font-bold" : "hover:bg-slate-50 dark:hover:bg-slate-700/50 text-ink-700 dark:text-slate-300"}`}
              >
                Semua Sekolah
              </button>
              {filteredIds.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-slate-500">
                  Sekolah tidak ditemukan
                </div>
              ) : (
                filteredIds.map((id) => (
                  <button
                    key={id}
                    onClick={() => {
                      onChange(id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between text-left px-3 py-2 text-xs rounded-lg transition-colors ${value === id ? "bg-brand-50 dark:bg-brand-500/10 text-brand-600 font-bold" : "hover:bg-slate-50 dark:hover:bg-slate-700/50 text-ink-700 dark:text-slate-300"}`}
                  >
                    <span className="truncate pr-2">
                      {schoolNamesMap[id] || id}
                    </span>
                    <span className="shrink-0 bg-brand-100/50 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {schoolUserCounts[id] || 0} siswa
                    </span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function DevDashboardView() {
  const { register } = useAuth();
  const { show } = useToast();
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [systemStats, setSystemStats] = useState<any>(null);

  const [regRole, setRegRole] = useState<"student" | "teacher">("teacher");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPasswordConfirm, setRegPasswordConfirm] = useState("");
  const [regGender, setRegGender] = useState<Gender>("male");
  const [regGrade, setRegGrade] = useState<"X" | "XI" | "XII">("X");
  const [regSection, setRegSection] = useState("");
  const [regDob, setRegDob] = useState("");
  const [regProvId, setRegProvId] = useState("");
  const [regRegId, setRegRegId] = useState("");
  const [regSchoolId, setRegSchoolId] = useState("");

  const [userFilter, setUserFilter] = useState<"all" | "teacher" | "student">(
    "all",
  );
  const [schoolFilter, setSchoolFilter] = useState("all");
  const [devUserSearchQuery, setDevUserSearchQuery] = useState("");

  const uniqueSchoolIds = useMemo(() => {
    const ids = new Set<string>();
    profiles.forEach((p) => {
      if (p.schoolId && p.schoolId !== "unknown") {
        ids.add(p.schoolId);
      }
    });
    return Array.from(ids).sort();
  }, [profiles]);

  const [schoolNamesMap, setSchoolNamesMap] = useState<Record<string, string>>(
    {},
  );
  const [schoolUserCounts, setSchoolUserCounts] = useState<Record<string, number>>(
    {},
  );

  const handleDeleteAccount = async (id: string) => {
    if (confirm("Hapus pengguna ini secara permanen?")) {
      const res = await deleteAccount(id);
      if (res.success) {
        show("Pengguna berhasil dihapus.", "success");
        refreshData();
      } else {
        show(res.error || "Gagal menghapus pengguna.", "error");
      }
    }
  };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editSchoolId, setEditSchoolId] = useState("");
  const [editProvId, setEditProvId] = useState("");
  const [editRegId, setEditRegId] = useState("");
  const [editGrade, setEditGrade] = useState<"X" | "XI" | "XII">("X");
  const [editSection, setEditSection] = useState("");

  const [allProvinces, setAllProvinces] = useState<
    { id: string; name: string }[]
  >([]);

  const [regencies, setRegencies] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [schools, setSchools] = useState<SchoolData[]>([]);

  const [editRegencies, setEditRegencies] = useState<
    { id: string; name: string }[]
  >([]);
  const [editSchoolsList, setEditSchoolsList] = useState<SchoolData[]>([]);

  useEffect(() => {
    fetchProvinces().then(setAllProvinces).catch(console.error);
  }, []);

  useEffect(() => {
    if (regProvId) {
      fetchRegencies(regProvId).then(setRegencies).catch(console.error);
    } else {
      setRegencies([]);
    }
  }, [regProvId]);

  useEffect(() => {
    if (regProvId && regRegId) {
      fetchSchools(regProvId, regRegId).then(setSchools).catch(console.error);
    } else {
      setSchools([]);
    }
  }, [regProvId, regRegId]);

  useEffect(() => {
    if (editProvId) {
      fetchRegencies(editProvId).then(setEditRegencies).catch(console.error);
    } else {
      setEditRegencies([]);
    }
  }, [editProvId]);

  useEffect(() => {
    if (editProvId && editRegId) {
      fetchSchools(editProvId, editRegId)
        .then(setEditSchoolsList)
        .catch(console.error);
    } else {
      setEditSchoolsList([]);
    }
  }, [editProvId, editRegId]);

  const refreshData = useCallback(async () => {
    setLoadingData(true);
    try {
      const acc = await getAllAccounts();
      const profs = await getAllProfiles();
      setProfiles(profs);
      setAccounts(acc);
      const stats = await apiClient.get("/api/analytics/system");
      if (stats.success) setSystemStats(stats.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    const fetchSchoolNames = async () => {
      const counts: Record<string, number> = {};
      profiles.forEach((p) => {
        if (p.schoolId && p.schoolId !== "unknown") {
          counts[p.schoolId] = (counts[p.schoolId] || 0) + 1;
        }
      });
      setSchoolUserCounts(counts);

      const map: Record<string, string> = {};
      await Promise.all(
        uniqueSchoolIds.map(async (id) => {
          const school = await getSchoolById(id);
          if (school) {
            map[id] = school.name;
          }
        }),
      );
      setSchoolNamesMap(map);
    };
    if (uniqueSchoolIds.length > 0) {
      fetchSchoolNames();
    }
  }, [uniqueSchoolIds, profiles]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPassword) {
      show("Mohon lengkapi semua data wajib.", "error");
      return;
    }
    if (regPassword.length < 6) {
      show("Kata sandi minimal 6 karakter.", "error");
      return;
    }

    if (regPassword !== regPasswordConfirm) {
      show("Kata sandi tidak cocok", "error");
      return;
    }
    setLoading(true);
    const finalGrade = regGrade;
    const finalClass = regRole === "teacher" ? "" : regSection;
    const finalSchoolId = regSchoolId || "unknown";

    const result = await provisionAccount(
      regName,
      regEmail,
      regPassword,
      regRole,
      regGender,
      finalGrade,
      finalClass,
      finalSchoolId,
      regDob || undefined,
    );
    setLoading(false);

    if (result.success) {
      show(
        `Akun ${regRole === "teacher" ? "Guru" : "Siswa"} ${regName} berhasil dibuat!`,
        "success",
      );
      setRegName("");
      setRegEmail("");
      setRegPassword("");
      setIsModalOpen(false);
      refreshData();
    } else {
      show(result.error ?? "Gagal membuat akun", "error");
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(accounts, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daftar_pengguna_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    show("Data berhasil diekspor ke file JSON", "success");
  };

  const handleEditClick = async (acc: UserAccount, prof?: UserProfile) => {
    setEditingUserId(acc.id);
    setEditName(acc.name);
    setEditPassword(""); // Leave blank unless they want to change it
    let prov = "";
    let reg = "";
    const sid = prof?.schoolId || "";
    if (sid && sid !== "unknown") {
      const sch = await getSchoolById(sid);
      if (sch) {
        prov = sch.province || "";
        reg = sch.regency || "";
      }
    }
    setEditProvId(prov);
    setEditRegId(reg);
    setEditSchoolId(sid);
    setEditGrade(
      prof?.grade === "X" || prof?.grade === "XI" || prof?.grade === "XII"
        ? prof.grade
        : "X",
    );
    setEditSection(prof?.classSection || "");
  };

  const handleSaveEdit = async (accId: string) => {
    try {
      const finalEditGrade = editGrade as "X" | "XI" | "XII";
      const accountUpdates: {
        name?: string;
        password?: string;
        schoolId?: string;
        grade?: string;
        classSection?: string;
      } = {
        name: editName,
        schoolId: editSchoolId,
        grade: finalEditGrade,
        classSection: editSection,
      };

      if (editPassword.trim().length > 0) {
        if (editPassword.trim().length < 6) {
          show("Kata sandi baru minimal 6 karakter", "error");
          return;
        }
        accountUpdates.password = editPassword.trim();
      }

      const res = await updateAccount(accId, accountUpdates);
      if (!res.success) {
        throw new Error(res.error || "Update failed");
      }

      show("Data pengguna berhasil diperbarui!", "success");
      setEditingUserId(null);
      refreshData();
    } catch (err) {
      show("Gagal memperbarui data", "error");
    }
  };

  const stats = {
    total: systemStats?.totalUsers || accounts.length,
    teachers:
      systemStats?.teachers ||
      accounts.filter((a) => a.role === "teacher").length,
    devs: accounts.filter((a) => a.role === "developer").length,
  };

  if (loadingData && accounts.length === 0) {
    return <LoadingState fullPage message="Memuat data Developer..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-brand-600/5 border border-brand-100 dark:border-brand-500/20 rounded-2xl p-6 relative overflow-hidden">
        {/* Abstract Background Decoration */}
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-brand-100 dark:bg-brand-500/20 rounded-lg text-brand-600 dark:text-brand-400 shadow-sm border border-brand-200 dark:border-brand-500/30">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink-900 dark:text-white">
              User Account
            </h2>
          </div>
          <p className="mt-1 text-sm text-ink-500 dark:text-slate-400">
            Pusat kendali dan manajemen akun sistem (Akses Developer).
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm self-start sm:self-auto w-full sm:w-auto">
          <div className="flex-1">
            <p className="text-[10px] font-bold text-ink-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Status Sistem</p>
            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              Online & Aman
            </div>
          </div>
          <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-2"></div>
          <div>
            <p className="text-[10px] font-bold text-ink-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Total Akun</p>
            <p className="text-sm font-bold text-ink-900 dark:text-white flex items-center gap-1.5">
              <Users className="h-4 w-4 text-ink-400" />
              {accounts.length} Aktif
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Total Pengguna",
            value: stats.total,
            icon: Users,
            color: "text-brand-600",
            bg: "bg-brand-50 dark:bg-brand-500/10",
          },
          {
            label: "Guru / Pengguna",
            value: stats.teachers,
            icon: BookOpen,
            color: "text-amber-600",
            bg: "bg-amber-50 dark:bg-amber-500/10",
          },
          {
            label: "Admin (Dev)",
            value: stats.devs,
            icon: ShieldAlert,
            color: "text-red-600",
            bg: "bg-red-50 dark:bg-red-500/10",
          },
        ].map((s, i) => (
          <div
            key={i}
            className="rounded-2xl border border-brand-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl ${s.bg}`}
              >
                <s.icon className={`h-6 w-6 ${s.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-ink-500 dark:text-slate-400">
                  {s.label}
                </p>
                <p className="font-display text-2xl font-bold text-ink-900 dark:text-white">
                  {s.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-1">
        {/* User List */}
        <div className="rounded-2xl border border-brand-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col min-h-[400px] max-h-[800px]">
          <div className="border-b border-brand-100 dark:border-slate-800 px-6 py-4 bg-brand-50/50 dark:bg-slate-800/50 flex flex-col xl:flex-row gap-4 xl:items-center justify-between">
            {/* Left Section: Title & Role Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <h3 className="font-bold text-ink-900 dark:text-white flex items-center gap-2 whitespace-nowrap">
                <Users className="h-4 w-4 text-brand-600" /> Daftar Pengguna
              </h3>

              <div className="flex bg-white dark:bg-slate-800 rounded-xl p-1 border border-brand-100 dark:border-slate-700 shadow-sm w-fit">
                <button
                  onClick={() => setUserFilter("all")}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${userFilter === "all" ? "bg-brand-600 text-white" : "text-ink-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"}`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setUserFilter("teacher")}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${userFilter === "teacher" ? "bg-brand-600 text-white" : "text-ink-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"}`}
                >
                  Teacher
                </button>
                <button
                  onClick={() => setUserFilter("student")}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${userFilter === "student" ? "bg-brand-600 text-white" : "text-ink-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"}`}
                >
                  Student
                </button>
              </div>
            </div>

            {/* Right Section: School Filter, Search, Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full xl:w-auto flex-wrap lg:flex-nowrap justify-end">
              <SchoolFilterCombobox
                value={schoolFilter}
                onChange={setSchoolFilter}
                uniqueIds={uniqueSchoolIds}
                schoolNamesMap={schoolNamesMap}
                schoolUserCounts={schoolUserCounts}
              />
              <div className="relative w-full sm:w-64 md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
                <input
                  type="text"
                  placeholder="Cari nama atau email..."
                  value={devUserSearchQuery}
                  onChange={(e) => setDevUserSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full rounded-xl border border-brand-100 text-sm focus:ring-2 focus:ring-brand-100 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1.5 rounded-xl bg-white dark:bg-slate-800 border border-brand-100 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-ink-600 hover:text-brand-600 hover:border-brand-300 transition-colors shadow-sm"
                >
                  <Download className="h-4 w-4" /> Ekspor JSON
                </button>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 transition-colors shadow-sm"
                >
                  <Plus className="h-4 w-4" /> Tambah Akun
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 dark:bg-slate-900/50">
            {accounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 dark:bg-slate-800 text-brand-500 mb-4 border border-brand-100 dark:border-slate-700">
                  <Users className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-ink-900 dark:text-white mb-1">
                  Belum ada pengguna
                </h3>
                <p className="text-sm text-ink-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
                  Sistem belum memiliki data pengguna untuk ditampilkan. Silakan
                  tambahkan pengguna baru.
                </p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-all shadow-sm"
                >
                  <Plus className="h-4 w-4" /> Tambah Pengguna
                </button>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {accounts
                  .filter((acc) =>
                    userFilter === "all" ? true : acc.role === userFilter,
                  )
                  .filter((acc) => {
                    if (schoolFilter === "all") return true;
                    const prof = profiles.find((p) => p.userId === acc.id);
                    return prof?.schoolId === schoolFilter;
                  })
                  .filter((acc) => {
                    if (!devUserSearchQuery.trim()) return true;
                    const q = devUserSearchQuery.toLowerCase();
                    return (
                      acc.name?.toLowerCase().includes(q) ||
                      acc.email?.toLowerCase().includes(q)
                    );
                  })
                  .slice()
                  .reverse()
                  .map((acc) => {
                    const profile = profiles.find((p) => p.userId === acc.id);
                    return (
                      <div
                        key={acc.id}
                        className="flex flex-col gap-3 rounded-2xl border border-brand-100 dark:border-slate-800 bg-white dark:bg-slate-800/80 p-5 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div
                              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${acc.role === "developer" ? "bg-red-50 text-red-600 border border-red-100" : acc.role === "teacher" ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"}`}
                            >
                              {acc.role === "developer" ? (
                                <ShieldAlert className="h-6 w-6" />
                              ) : acc.role === "teacher" ? (
                                <BookOpen className="h-6 w-6" />
                              ) : (
                                <GraduationCap className="h-6 w-6" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-ink-900 dark:text-white flex items-center gap-2 text-base">
                                {acc.name}
                                <span
                                  className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border tracking-wide uppercase ${acc.role === "developer" ? "border-red-200 bg-red-50 text-red-700" : acc.role === "teacher" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
                                >
                                  {acc.role}
                                </span>
                              </p>
                              <p className="text-sm text-ink-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                                <Mail className="h-3.5 w-3.5" /> {acc.email}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-auto">
                            <button
                              onClick={() => handleEditClick(acc, profile)}
                              className="p-2.5 text-ink-400 bg-slate-50 hover:bg-brand-50 hover:text-brand-600 rounded-xl transition-colors border border-transparent hover:border-brand-100 dark:bg-slate-800 dark:hover:bg-brand-900/30"
                              title="Edit Account"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            {acc.role !== "developer" && (
                              <button
                                onClick={() => handleDeleteAccount(acc.id)}
                                className="p-2.5 text-ink-400 bg-slate-50 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors border border-transparent hover:border-red-100 dark:bg-slate-800 dark:hover:bg-red-900/30"
                                title="Delete Account"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {profile && (
                          <div className="mt-1 grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 p-4 border border-slate-100 dark:border-slate-800">
                            <div>
                              <span className="text-[10px] font-bold text-ink-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                                Sekolah
                              </span>
                              <span
                                className="text-xs font-semibold text-ink-800 dark:text-slate-200 truncate block"
                                title={profile.schoolId ? (schoolNamesMap[profile.schoolId] || profile.schoolId) : "-"}
                              >
                                {profile.schoolId && profile.schoolId !== "unknown" ? (schoolNamesMap[profile.schoolId] || profile.schoolId) : "-"}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-ink-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                                Kelas
                              </span>
                              <span className="text-xs font-semibold text-ink-800 dark:text-slate-200">
                                {profile.grade}{profile.classSection ? ` - ${profile.classSection}` : ""}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-ink-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                                Total Poin
                              </span>
                              <span className="text-xs font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1">
                                <Award className="h-3 w-3" />{" "}
                                {profile.totalPoints}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-ink-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                                Progress
                              </span>
                              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />{" "}
                                {
                                  Object.keys(profile.topicScores || {})
                                    .length
                                }{" "}
                                Modul
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden border border-brand-100 dark:border-slate-800 flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between border-b border-brand-100 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-900/50">
                <h3 className="font-bold text-ink-900 dark:text-white flex items-center gap-2.5 text-lg">
                  <div className="p-1.5 bg-brand-100 dark:bg-brand-500/20 rounded-lg text-brand-600">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  Tambah Pengguna
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-xl text-ink-400 hover:text-ink-700 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                <form onSubmit={handleRegister} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-ink-600 dark:text-slate-400 uppercase tracking-wider">
                      Pilih Peran Pengguna
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setRegRole("teacher")}
                        className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-bold transition-all ${regRole === "teacher" ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400" : "border-slate-200 bg-white text-ink-500 hover:bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"}`}
                      >
                        <BookOpen className="h-4 w-4" /> Guru / Pendidik
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegRole("student")}
                        className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-bold transition-all ${regRole === "student" ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400" : "border-slate-200 bg-white text-ink-500 hover:bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"}`}
                      >
                        <GraduationCap className="h-4 w-4" /> Murid / Siswa
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="regName"
                        className="text-xs font-bold text-ink-700 dark:text-slate-300"
                      >
                        Nama Lengkap <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                        <input
                          id="regName"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          placeholder="Nama pengguna"
                          className="w-full rounded-xl border border-brand-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="regEmail"
                        className="text-xs font-bold text-ink-700 dark:text-slate-300"
                      >
                        Email Login <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                        <input
                          id="regEmail"
                          type="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="email@harmony.edu"
                          className="w-full rounded-xl border border-brand-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="regPassword"
                        className="text-xs font-bold text-ink-700 dark:text-slate-300"
                      >
                        Kata Sandi <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                        <input
                          id="regPassword"
                          type="text"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Min. 6 karakter"
                          className="w-full rounded-xl border border-brand-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="regPasswordConfirm"
                        className="text-xs font-bold text-ink-700 dark:text-slate-300"
                      >
                        Konfirmasi Sandi <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                        <input
                          id="regPasswordConfirm"
                          type="text"
                          value={regPasswordConfirm}
                          onChange={(e) =>
                            setRegPasswordConfirm(e.target.value)
                          }
                          placeholder="Min. 6 karakter"
                          className="w-full rounded-xl border border-brand-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="regGender"
                        className="text-xs font-bold text-ink-700 dark:text-slate-300"
                      >
                        Jenis Kelamin
                      </label>
                      <select
                        id="regGender"
                        value={regGender}
                        onChange={(e) => setRegGender(e.target.value as Gender)}
                        className="w-full rounded-xl border border-brand-200 bg-white py-2.5 px-3 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition-all"
                      >
                        <option value="male">Laki-laki</option>
                        <option value="female">Perempuan</option>
                        <option value="other">Lainnya</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-4 bg-brand-50/50 dark:bg-slate-800/30 rounded-xl border border-brand-100 dark:border-slate-700/50 space-y-4">
                    <h4 className="text-xs font-bold text-brand-700 dark:text-brand-400 uppercase tracking-wider flex items-center gap-1.5">
                      <School className="h-3.5 w-3.5" /> Penempatan Sekolah
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label
                          htmlFor="regProvId"
                          className="text-xs font-bold text-ink-600 dark:text-slate-400"
                        >
                          Provinsi
                        </label>
                        <SearchableSelect
                          id="regProvId"
                          value={regProvId}
                          onChange={setRegProvId}
                          options={allProvinces.map((p) => ({ id: p.id, name: p.name }))}
                          placeholder="Pilih Provinsi"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label
                          htmlFor="regRegId"
                          className="text-xs font-bold text-ink-600 dark:text-slate-400"
                        >
                          Kabupaten/Kota
                        </label>
                        <SearchableSelect
                          id="regRegId"
                          value={regRegId}
                          onChange={setRegRegId}
                          options={regencies.map((r) => ({ id: r.id, name: r.name }))}
                          placeholder="Pilih Kab/Kota"
                          disabled={!regProvId}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label
                          htmlFor="regSchoolId"
                          className="text-xs font-bold text-ink-600 dark:text-slate-400"
                        >
                          Sekolah
                        </label>
                        <SearchableSelect
                          id="regSchoolId"
                          value={regSchoolId}
                          onChange={setRegSchoolId}
                          options={schools.map((s) => ({ id: s.id, name: s.name }))}
                          placeholder="Pilih Sekolah"
                          disabled={!regRegId}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {(regRole === "student" || regRole === "teacher") && (
                      <div className="space-y-1.5">
                        <label
                          htmlFor="regGrade"
                          className="text-xs font-bold text-ink-700 dark:text-slate-300"
                        >
                          Tingkat Kelas <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="regGrade"
                          value={regGrade}
                          onChange={(e) =>
                            setRegGrade(e.target.value as "X" | "XI" | "XII")
                          }
                          className="w-full rounded-xl border border-brand-200 bg-white py-2.5 px-3 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition-all"
                        >
                          <option value="X">Kelas X</option>
                          <option value="XI">Kelas XI</option>
                          <option value="XII">Kelas XII</option>
                        </select>
                      </div>
                    )}

                    {regRole === "student" && (
                      <div className="space-y-1.5">
                        <label
                          htmlFor="regSection"
                          className="text-xs font-bold text-ink-700 dark:text-slate-300"
                        >
                          Ruang/No. Kelas{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="regSection"
                          type="text"
                          value={regSection}
                          onChange={(e) => setRegSection(e.target.value)}
                          placeholder="Contoh: MIPA 4"
                          className="w-full rounded-xl border border-brand-200 bg-white py-2.5 px-3 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition-all"
                        />
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-5 py-2.5 text-sm font-bold text-ink-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl transition-all"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-brand-500/20 transition-all hover:bg-brand-700 disabled:opacity-60 disabled:shadow-none min-w-[140px]"
                    >
                      {loading ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" /> Buat Pengguna
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
        {editingUserId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setEditingUserId(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden border border-brand-100 dark:border-slate-800 flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between border-b border-brand-100 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-900/50">
                <h3 className="font-bold text-ink-900 dark:text-white flex items-center gap-2.5 text-lg">
                  <div className="p-1.5 bg-brand-100 dark:bg-brand-500/20 rounded-lg text-brand-600">
                    <Pencil className="h-5 w-5" />
                  </div>
                  Edit Pengguna
                </h3>
                <button
                  onClick={() => setEditingUserId(null)}
                  className="p-2 rounded-xl text-ink-400 hover:text-ink-700 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-5 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-ink-600 dark:text-slate-400 mb-1.5">
                      Ubah Nama
                    </label>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-brand-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-ink-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-300 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink-600 dark:text-slate-400 mb-1.5">
                      Ganti Sandi (Opsional)
                    </label>
                    <input
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="Kata sandi baru..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-brand-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-ink-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-300 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-ink-600 dark:text-slate-400 mb-1.5">
                      Provinsi
                    </label>
                    <select
                      value={editProvId}
                      onChange={(e) => {
                        setEditProvId(e.target.value);
                        setEditRegId("");
                        setEditSchoolId("");
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-brand-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-ink-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-100"
                    >
                      <option value="">Pilih Provinsi...</option>
                      {allProvinces.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink-600 dark:text-slate-400 mb-1.5">
                      Kab/Kota
                    </label>
                    <select
                      className="w-full px-3.5 py-2.5 rounded-xl border border-brand-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-ink-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-100 disabled:opacity-50"
                      value={editRegId}
                      onChange={(e) => {
                        setEditRegId(e.target.value);
                        setEditSchoolId("");
                      }}
                      disabled={!editProvId}
                    >
                      <option value="">Pilih Kab/Kota</option>
                      {editRegencies.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink-600 dark:text-slate-400 mb-1.5">
                      Sekolah
                    </label>
                    <select
                      value={editSchoolId}
                      onChange={(e) => setEditSchoolId(e.target.value)}
                      disabled={!editRegId}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-brand-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-ink-900 dark:text-white disabled:opacity-50 outline-none focus:ring-2 focus:ring-brand-100"
                    >
                      <option value="">Pilih Sekolah...</option>
                      {editSchoolsList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-ink-600 dark:text-slate-400 mb-1.5">
                      Tingkat Kelas
                    </label>
                    <select
                      value={editGrade}
                      onChange={(e) =>
                        setEditGrade(e.target.value as "X" | "XI" | "XII")
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-brand-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-ink-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-100"
                    >
                      <option value="X">Kelas X</option>
                      <option value="XI">Kelas XI</option>
                      <option value="XII">Kelas XII</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink-600 dark:text-slate-400 mb-1.5">
                      No. Ruang
                    </label>
                    <input
                      type="text"
                      value={editSection}
                      onChange={(e) => setEditSection(e.target.value)}
                      placeholder="Contoh: MIPA 4"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-brand-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-ink-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
                  <button
                    onClick={() => setEditingUserId(null)}
                    className="px-6 py-2.5 text-sm font-bold text-ink-600 hover:bg-slate-200 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => {
                      if (editingUserId) handleSaveEdit(editingUserId);
                    }}
                    className="px-6 py-2.5 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl flex items-center gap-2 transition-all shadow-sm focus:ring-4 focus:ring-brand-500/30"
                  >
                    <Save className="h-4 w-4" /> Simpan Perubahan
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
