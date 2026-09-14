import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  School as SchoolIcon,
  ChevronRight,
  ChevronLeft,
  Search,
  Check,
  AlertTriangle,
  ShieldCheck,
  ArrowRight,
  Building2,
  Map as MapIcon,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { useToast } from "@/hooks/useToast";
import { useSchool } from "@/hooks/useSchool";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/services/apiClient";
import { ThemePicker } from "@/components/ThemePicker";
import { useI18n } from "@/hooks/useI18n";
import {
  fetchSchools,
  fetchProvinces,
  fetchRegencies,
} from "@/services/schoolService";
import { riskStyles, type School, type RiskCategory } from "@/data/schools";

type Step = 1 | 2 | 3 | 4;

export default function SchoolSelectionPage() {
  const navigate = useNavigate();
  const { show } = useToast();
  const { setSelection } = useSchool();
  const { currentUser, currentProfile, refreshProfile, isLoading } = useAuth();
  const { t } = useI18n();

  const [step, setStep] = useState<Step>(1);

  useEffect(() => {
    if (!isLoading) {
      if (!currentUser) {
        navigate("/login");
      } else if (
        currentUser.role !== "dev" &&
        currentProfile?.schoolId &&
        currentProfile.schoolId !== "unknown"
      ) {
        navigate("/app");
      }
    }
  }, [isLoading, currentUser, currentProfile, navigate]);
  const [provinceId, setProvinceId] = useState("");
  const [regencyId, setRegencyId] = useState("");
  const [school, setSchool] = useState<School | null>(null);
  const [search, setSearch] = useState("");

  const [allProvinces, setAllProvinces] = useState<
    { id: string; name: string }[]
  >([]);
  const [regencies, setRegencies] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [schools, setSchools] = useState<School[]>([]);

  useEffect(() => {
    fetchProvinces().then(setAllProvinces).catch(console.error);
  }, []);

  useEffect(() => {
    if (provinceId) {
      fetchRegencies(provinceId).then(setRegencies).catch(console.error);
    } else {
      setRegencies([]);
    }
  }, [provinceId]);

  useEffect(() => {
    if (provinceId && regencyId) {
      fetchSchools(provinceId, regencyId).then(setSchools).catch(console.error);
    } else {
      setSchools([]);
    }
  }, [provinceId, regencyId]);

  const filteredProvinces = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return allProvinces;
    return allProvinces.filter((p) => p.name.toLowerCase().includes(q));
  }, [search, allProvinces]);

  const filteredRegencies = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return regencies;
    return regencies.filter((r) => r.name.toLowerCase().includes(q));
  }, [regencies, search]);

  const filteredSchools = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return schools;
    return schools.filter((s) => s.name.toLowerCase().includes(q));
  }, [schools, search]);

  const handleConfirm = async () => {
    if (!school || !provinceId || !regencyId) return;

    if (currentUser) {
      try {
        await apiClient.post("/api/users/me/school", { schoolId: school.id });
        setSelection(school);
        await refreshProfile();
        show(`Sekolah ${school.name} berhasil dipilih!`, "success");
        navigate("/app");
      } catch (err: any) {
        show(err.message || "Gagal menyimpan sekolah", "error");
      }
    } else {
      navigate("/login");
    }
  };

  const stepLabels = [
    t("school.province"),
    t("school.regency"),
    t("school.select"),
    t("school.confirm"),
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-brand-50 via-white to-sky-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:44px_44px] opacity-50 dark:opacity-20" />
        <motion.div
          className="absolute -top-20 left-1/2 h-96 w-[700px] -translate-x-1/2 rounded-full bg-brand-300/25 blur-[120px]"
          animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.3, 0.2] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-brand-100 bg-white/70 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/70">
        <div className="section-container flex h-16 items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2.5"
          >
            <Logo variant="icon" size={36} />
            <span className="font-display text-lg font-extrabold tracking-tight text-ink-900 dark:text-white">
              Harmony
              <span className="text-brand-600 dark:text-brand-400"> Edu</span>
            </span>
          </button>
          <div className="flex items-center gap-4">
            <ThemePicker />
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 transition-colors hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400"
            >
              {t("login.back")}
            </button>
          </div>
        </div>
      </header>

      <div className="section-container py-8 sm:py-12">
        {/* Title */}
        <div className="mb-10 text-center">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink-900 dark:text-white sm:text-4xl lg:text-5xl">
            {t("school.title")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-ink-500 dark:text-slate-400 sm:text-lg">
            {t("school.subtitle")}
          </p>
        </div>

        {/* Stepper */}
        <div className="mx-auto mb-8 flex max-w-3xl items-center justify-center gap-1 sm:gap-2">
          {stepLabels.map((label, i) => {
            const stepNum = (i + 1) as Step;
            const active = step >= stepNum;
            const current = step === stepNum;
            return (
              <div key={label} className="flex items-center">
                {i > 0 && (
                  <div
                    className={`h-0.5 w-6 sm:w-12 ${active ? "bg-brand-500" : "bg-brand-100 dark:bg-slate-700"}`}
                  />
                )}
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all ${
                      current
                        ? "bg-brand-600 text-white shadow-glass scale-110"
                        : active
                          ? "bg-brand-100 text-brand-700 dark:bg-slate-800 dark:text-brand-400"
                          : "bg-brand-50 text-ink-400 dark:bg-slate-800 dark:text-slate-500"
                    }`}
                  >
                    {active && !current ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      stepNum
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-semibold sm:text-xs ${active ? "text-ink-900 dark:text-white" : "text-ink-400 dark:text-slate-500"}`}
                  >
                    {label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Content card */}
        <div className="mx-auto max-w-3xl">
          <div className="glass rounded-3xl p-5 shadow-glass-lg sm:p-7">
            <AnimatePresence mode="wait">
              {/* Step 1: Province */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="font-display text-xl font-bold text-ink-900 dark:text-white">
                      {t("school.province")}
                    </h2>
                    <div className="relative w-full sm:w-auto">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400 dark:text-slate-500" />
                      <label htmlFor="search-province" className="sr-only">
                        Search
                      </label>
                      <input
                        id="search-province"
                        type="text"
                        placeholder={t("school.search")}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-full border border-brand-100 bg-white/70 py-2 pl-9 pr-4 text-sm text-ink-900 outline-none transition-all placeholder:text-ink-400 focus:border-brand-300 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800/70 dark:text-white dark:focus:border-brand-600 sm:w-64 sm:py-1.5"
                      />
                    </div>
                  </div>

                  <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
                    {filteredProvinces.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setProvinceId(p.id);
                          setSearch("");
                          setStep(2);
                        }}
                        className="group flex w-full items-center gap-3 rounded-xl border border-brand-50 bg-white/60 p-3.5 text-left transition-all hover:border-brand-200 hover:bg-brand-50 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-brand-600 dark:hover:bg-slate-800"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-slate-700 dark:text-brand-400">
                          <MapPin className="h-4 w-4" />
                        </span>
                        <span className="flex-1 truncate text-sm font-semibold text-ink-900 dark:text-white">
                          {p.name}
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-ink-400 transition-transform group-hover:translate-x-1 dark:text-slate-500" />
                      </button>
                    ))}
                    {filteredProvinces.length === 0 && (
                      <p className="py-8 text-center text-sm text-ink-400 dark:text-slate-500">
                        {t("school.not_found")}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 2: Regency */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="font-display text-xl font-bold text-ink-900 dark:text-white">
                      {t("school.regency")}
                    </h2>
                    <div className="relative w-full sm:w-auto">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400 dark:text-slate-500" />
                      <label htmlFor="search-regency" className="sr-only">
                        Search
                      </label>
                      <input
                        id="search-regency"
                        type="text"
                        placeholder={t("school.search")}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-full border border-brand-100 bg-white/70 py-2 pl-9 pr-4 text-sm text-ink-900 outline-none transition-all placeholder:text-ink-400 focus:border-brand-300 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800/70 dark:text-white dark:focus:border-brand-600 sm:w-64 sm:py-1.5"
                      />
                    </div>
                  </div>

                  <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
                    {filteredRegencies.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          setRegencyId(r.id);
                          setSearch("");
                          setStep(3);
                        }}
                        className="group flex w-full items-center gap-3 rounded-xl border border-brand-50 bg-white/60 p-3.5 text-left transition-all hover:border-brand-200 hover:bg-brand-50 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-brand-600 dark:hover:bg-slate-800"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-slate-700 dark:text-sky-400">
                          <Building2 className="h-4 w-4" />
                        </span>
                        <span className="flex-1 truncate text-sm font-semibold text-ink-900 dark:text-white">
                          {r.name}
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-ink-400 transition-transform group-hover:translate-x-1 dark:text-slate-500" />
                      </button>
                    ))}
                    {filteredRegencies.length === 0 && (
                      <p className="py-8 text-center text-sm text-ink-400 dark:text-slate-500">
                        {t("school.not_found")}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setStep(1);
                      setSearch("");
                      setRegencyId("");
                    }}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 transition-colors hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400"
                  >
                    <ChevronLeft className="h-4 w-4" /> {t("common.back")}
                  </button>
                </motion.div>
              )}

              {/* Step 3: School */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="font-display text-xl font-bold text-ink-900 dark:text-white">
                      {t("school.select")}
                    </h2>
                    <div className="relative w-full sm:w-auto">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400 dark:text-slate-500" />
                      <label htmlFor="search-school" className="sr-only">
                        Search
                      </label>
                      <input
                        id="search-school"
                        type="text"
                        placeholder={t("school.search")}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-full border border-brand-100 bg-white/70 py-2 pl-9 pr-4 text-sm text-ink-900 outline-none transition-all placeholder:text-ink-400 focus:border-brand-300 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800/70 dark:text-white dark:focus:border-brand-600 sm:w-64 sm:py-1.5"
                      />
                    </div>
                  </div>

                  <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
                    {(() => {
                      if (filteredSchools.length === 0) {
                        return (
                          <p className="py-8 text-center text-sm text-ink-400 dark:text-slate-500">
                            {t("school.not_found")}
                          </p>
                        );
                      }

                      const grouped = filteredSchools.reduce(
                        (acc, school: any) => {
                          const lvl =
                            school.level ||
                            school.bentuk_pendidikan ||
                            "Lainnya";
                          if (!acc[lvl]) acc[lvl] = [];
                          acc[lvl].push(school);
                          return acc;
                        },
                        {} as Record<string, typeof filteredSchools>,
                      );

                      const order = ["SD", "SMP", "SMA", "SMK", "SLB"];
                      const levels = Object.keys(grouped).sort((a, b) => {
                        const ia = order.indexOf(a);
                        const ib = order.indexOf(b);
                        if (ia !== -1 && ib !== -1) return ia - ib;
                        if (ia !== -1) return -1;
                        if (ib !== -1) return 1;
                        return a.localeCompare(b);
                      });

                      return levels.map((level) => (
                        <div key={level} className="mb-5 last:mb-0">
                          <h3 className="mb-2.5 px-1 text-[11px] font-extrabold uppercase tracking-widest text-ink-500 dark:text-slate-400 flex items-center gap-2">
                            <span className="h-px flex-1 bg-brand-100 dark:bg-slate-800"></span>
                            Tingkat {level}
                            <span className="h-px flex-1 bg-brand-100 dark:bg-slate-800"></span>
                          </h3>
                          <div className="space-y-2">
                            {grouped[level].map((s: any) => {
                              const isPublic =
                                s.isPublic !== undefined
                                  ? s.isPublic
                                  : s.status_sekolah === "Negeri";

                              return (
                                <button
                                  key={s.id || s.school_id}
                                  onClick={() => {
                                    setSchool(s);
                                    setStep(4);
                                  }}
                                  className="group flex w-full flex-col sm:flex-row sm:items-center items-start gap-3 rounded-xl border border-brand-50 bg-white/60 p-3.5 text-left transition-all hover:border-brand-200 hover:bg-brand-50 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-brand-600 dark:hover:bg-slate-800"
                                >
                                  <div className="flex w-full sm:w-auto items-center gap-3">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600 dark:bg-slate-700 dark:text-cyan-400">
                                      <SchoolIcon className="h-4 w-4" />
                                    </span>
                                    <div className="min-w-0 flex-1 sm:hidden">
                                      <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">
                                        {s.name}
                                      </p>
                                      <p className="text-xs text-ink-400 dark:text-slate-500">
                                        {isPublic
                                          ? t("school.public", "Negeri")
                                          : t("school.private", "Swasta")}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2 sm:hidden ml-auto">
                                      <ChevronRight className="h-4 w-4 shrink-0 text-ink-400 transition-transform group-hover:translate-x-1 dark:text-slate-500" />
                                    </div>
                                  </div>
                                  <div className="hidden sm:block min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">
                                      {s.name}
                                    </p>
                                    <p className="text-xs text-ink-400 dark:text-slate-500">
                                      {isPublic
                                        ? t("school.public", "Negeri")
                                        : t("school.private", "Swasta")}
                                    </p>
                                  </div>
                                  <span
                                    className={`hidden sm:inline-flex shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300`}
                                  >
                                    Pilih
                                  </span>
                                  <ChevronRight className="hidden sm:block h-4 w-4 shrink-0 text-ink-400 transition-transform group-hover:translate-x-1 dark:text-slate-500" />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>

                  <button
                    onClick={() => {
                      setStep(2);
                      setSearch("");
                      setSchool(null);
                    }}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 transition-colors hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400"
                  >
                    <ChevronLeft className="h-4 w-4" /> {t("common.back")}
                  </button>
                </motion.div>
              )}

              {/* Step 4: Confirm */}
              {step === 4 && school && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-6">
                    <button
                      onClick={() => setStep(3)}
                      className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
                    >
                      <ChevronLeft className="h-3 w-3" /> {t("school.select")}
                    </button>
                    <h2 className="font-display text-2xl font-bold text-ink-900 dark:text-white">
                      {t("school.confirm")}
                    </h2>
                  </div>

                  {/* School summary card */}
                  <div className="rounded-2xl border border-brand-100 bg-white/70 p-5 dark:border-slate-700 dark:bg-slate-800/70">
                    <div className="flex items-start gap-4">
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glass">
                        <SchoolIcon className="h-7 w-7" />
                      </span>
                      <div className="flex-1">
                        <h3 className="font-display text-lg font-bold text-ink-900 dark:text-white">
                          {school.name}
                        </h3>
                        <p className="mt-0.5 text-sm text-ink-500 dark:text-slate-400">
                          {(school as any).bentuk_pendidikan ||
                            school.level ||
                            "Lainnya"}{" "}
                          ·{" "}
                          {(school as any).status_sekolah === "Negeri" ||
                          school.isPublic
                            ? t("school.public", "Negeri")
                            : t("school.private", "Swasta")}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <div className="flex items-center gap-2 text-sm text-ink-500 dark:text-slate-400">
                            <MapIcon className="h-4 w-4" />
                            {filteredProvinces.find((p) => p.id === provinceId)
                              ?.name || provinceId}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-ink-500 dark:text-slate-400">
                            <Building2 className="h-4 w-4" />
                            {filteredRegencies.find((r) => r.id === regencyId)
                              ?.name || regencyId}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Risk profile */}
                    <div className="mt-5">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-slate-400">
                        {t("school.risk_profile", "Profil Risiko Regional")}
                      </p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {(
                          [
                            {
                              label: t("risk.earthquake", "Gempa Bumi"),
                              val:
                                (school as any).earthquake_hazard
                                  ?.regency_context_risk || "NOT_AVAILABLE",
                            },
                            {
                              label: t("risk.flood", "Banjir"),
                              val:
                                (school as any).flood_hazard
                                  ?.regency_context_risk || "NOT_AVAILABLE",
                            },
                            {
                              label: t("risk.tsunami", "Tsunami"),
                              val:
                                (school as any).tsunami_hazard
                                  ?.regency_context_risk || "NOT_AVAILABLE",
                            },
                          ] as const
                        ).map((h) => {
                          const isHigh = h.val === "Tinggi";
                          const isMod = h.val === "Sedang";
                          const isNotAvailable =
                            h.val === "NOT_AVAILABLE" ||
                            h.val === "NOT_CONFIGURED";

                          return (
                            <div
                              key={h.label}
                              className="rounded-xl bg-brand-50/60 p-3 text-center dark:bg-slate-700/40"
                            >
                              <p className="text-[10px] font-medium text-ink-500 dark:text-slate-400">
                                {h.label}
                              </p>
                              <p
                                className={`font-display text-sm font-bold ${isHigh ? "text-brand-600 dark:text-brand-400" : isMod ? "text-brand-500 dark:text-brand-400" : isNotAvailable ? "text-slate-400" : "text-brand-400 dark:text-brand-300"}`}
                              >
                                {isNotAvailable ? "Pending" : h.val}
                              </p>
                            </div>
                          );
                        })}
                        <div className="rounded-xl bg-brand-50/60 p-3 text-center dark:bg-slate-700/40 col-span-2 sm:col-span-3">
                          <p className="text-[10px] font-medium text-ink-500 dark:text-slate-400">
                            Status Integrasi Spasial
                          </p>
                          <p className="font-display text-xs font-bold text-slate-500 mt-1">
                            {(school as any).spatial_integration_status ===
                            "MISSING_COORDINATES"
                              ? "Koordinat Tidak Tersedia"
                              : "Menunggu Layer Geospasial"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={() => setStep(3)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-brand-100 bg-white/60 px-5 py-3 text-sm font-semibold text-ink-700 transition-all hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <ChevronLeft className="h-4 w-4" /> {t("common.back")}
                    </button>
                    <button
                      onClick={handleConfirm}
                      className="group inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-glass transition-all hover:bg-brand-700 hover:shadow-glow hover:-translate-y-0.5"
                    >
                      <ShieldCheck className="h-4 w-4" />{" "}
                      {t("school.confirm_action")}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Info note */}
          <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-brand-50/60 p-4 text-xs text-ink-600 dark:bg-slate-800/60 dark:text-slate-300">
            <AlertTriangle className="h-4 w-4 shrink-0 text-brand-600" />
            <p>{t("school.note")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
