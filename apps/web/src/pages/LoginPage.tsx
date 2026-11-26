import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Satellite, Boxes, ShieldCheck, ArrowLeft, LogOut, CheckCircle2, GraduationCap, BookOpen, Shield, MapPin, Building2, School as SchoolIcon, Loader2, Sparkles, User, TrendingUp, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useToast } from "@/hooks/useToast";
import { ThemePicker } from "@/components/ThemePicker";
import { SearchableDropdown } from "@/components/SchoolLocationSelector";
import { useAuth } from "@/hooks/useAuth";
import { useSchool } from "@/hooks/useSchool";
import { GoogleLogin } from "@react-oauth/google";
import { fetchProvinces, fetchRegencies, fetchSchools, SMAN_1_NGORO_FALLBACK } from "@/services/schoolService";
import { generateRandomDemoPayload } from "@/utils/demoSchool";
import type { School } from "@/data/schools";

type AuthStatus = 
  | "initial" 
  | "not_registered" 
  | "registered"
  | "register_name"
  | "register_role"
  | "register_level"
  | "register_school";

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const explicitRedirect = searchParams.get("redirect");
  const roleHint = searchParams.get("role");
  const resolveTargetRoute = (role?: string | null) => {
    if (explicitRedirect) return explicitRedirect;
    if (role === "teacher") return "/app/teacher";
    if (role === "developer") return "/app/maps?mode=expert";
    return "/app/dashboard";
  };
  const redirectUrl = resolveTargetRoute(roleHint);
  const { show } = useToast();
  const { login, finalizeLogin, registerGoogle, currentUser } = useAuth();
  const { setSelection } = useSchool();

  const [authStatus, setAuthStatus] = useState<AuthStatus>("initial");
  const [googleData, setGoogleData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const manualRedirectRef = useRef(false);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingSchools, setLoadingSchools] = useState(false);

  // Demo account optional custom nickname
  const [demoNickname, setDemoNickname] = useState("");
  const [quotaGoogleFallback, setQuotaGoogleFallback] = useState<{
    name: string;
    email: string;
    sub: string;
    picture?: string;
  } | null>(null);

  const decodeGoogleJwtPayload = (jwtToken: string) => {
    try {
      const parts = jwtToken.split(".");
      if (parts.length < 2) return null;
      const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const jsonStr = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => `%${("00" + c.charCodeAt(0).toString(16)).slice(-2)}`)
          .join(""),
      );
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  };

  // Registration Data
  const [regName, setRegName] = useState("");
  const [regRole, setRegRole] = useState<"student" | "teacher">("student");
  const [regLevel, setRegLevel] = useState<string>("ALL");
  const [regProv, setRegProv] = useState("");
  const [regCity, setRegCity] = useState("");
  const [regSchool, setRegSchool] = useState("");

  // Location & School Data
  const [provinces, setProvinces] = useState<{id: string, name: string}[]>([]);
  const [cities, setCities] = useState<{id: string, name: string}[]>([]);
  const [schools, setSchools] = useState<School[]>([]);

  useEffect(() => {
    setLoadingProvinces(true);
    fetchProvinces()
      .then(setProvinces)
      .finally(() => setLoadingProvinces(false));
  }, []);

  useEffect(() => {
    if (regProv) {
      setLoadingCities(true);
      fetchRegencies(regProv)
        .then(setCities)
        .finally(() => setLoadingCities(false));
    } else {
      setCities([]);
    }
  }, [regProv]);

  useEffect(() => {
    if (regProv && regCity) {
      setLoadingSchools(true);
      fetchSchools(regProv, regCity)
        .then(setSchools)
        .finally(() => setLoadingSchools(false));
    } else {
      setSchools([]);
    }
  }, [regProv, regCity]);

  const filteredSchools = useMemo(() => {
    return schools.filter(
      (s) => regLevel === "ALL" || s.level === regLevel || (s as any).school_level === regLevel
    );
  }, [schools, regLevel]);

  useEffect(() => {
    if (currentUser && authStatus === "initial" && !manualRedirectRef.current) {
      navigate(resolveTargetRoute(currentUser.role), { replace: true });
    }
  }, [currentUser, navigate, authStatus]);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) {
      show("Gagal mendapatkan token dari Google", "error");
      return;
    }
    setLoading(true);
    setLoadingText("Memverifikasi akun Google...");
    try {
      const result = await login(credentialResponse.credential);
      if (result.success) {
        if (result.status === "not_registered") {
          setGoogleData({
            token: credentialResponse.credential,
            email: result.email,
            name: result.name,
            picture: result.picture,
          });
          setRegName(result.name || "");
          setAuthStatus("not_registered");
        } else if (result.status === "registered") {
          setGoogleData({
            account: result.account,
          });
          setAuthStatus("registered");
        }
      } else {
        const errMsg = String(result.error ?? "Gagal masuk");
        if (/53000|kuota|quota|database/i.test(errMsg)) {
          const decoded = decodeGoogleJwtPayload(credentialResponse.credential);
          if (decoded?.email) {
            setQuotaGoogleFallback({
              name: decoded.name || decoded.email.split("@")[0],
              email: decoded.email,
              sub: decoded.sub || `usr-demo-g-${Date.now()}`,
              picture: decoded.picture,
            });
            show("Database sedang penuh kuota. Gunakan masuk cepat dengan profil Google di bawah.", "info");
            return;
          }
        }
        show(errMsg, "error");
      }
    } catch (e: any) {
      show(e?.message || "Terjadi kesalahan saat memverifikasi akun", "error");
    } finally {
      setLoading(false);
      setLoadingText("");
    }
  };

  const handleDevLogin = async (role: "developer" | "student" | "teacher" = "developer") => {
    setLoading(true);
    const demoPayload = generateRandomDemoPayload(role, demoNickname);
    setLoadingText(
      role === "developer"
        ? `Masuk akun Demo Pengembang (${demoPayload.name})...`
        : role === "teacher"
        ? `Masuk akun Demo Guru (${demoPayload.name})...`
        : `Masuk akun Demo Siswa (${demoPayload.name})...`
    );
    try {
      const result = await login(JSON.stringify(demoPayload));
      if (result.success && result.account) {
        manualRedirectRef.current = true;
        setSelection(SMAN_1_NGORO_FALLBACK);
        await finalizeLogin(result.account);
        show(`Masuk sebagai ${result.account.name} · SMAN 1 Ngoro`, "success");
        navigate(resolveTargetRoute(result.account.role), { replace: true });
      } else if (result.status === "not_registered") {
        setGoogleData({
          token: JSON.stringify(demoPayload),
          email: result.email,
          name: result.name,
          picture: result.picture,
        });
        setRegName(result.name || "");
        setAuthStatus("not_registered");
      } else {
        show(result.error ?? "Gagal masuk mode demo", "error");
      }
    } catch (e: any) {
      show(e?.message || "Gagal masuk sesi demo", "error");
    } finally {
      setLoading(false);
      setLoadingText("");
    }
  };

  const handleGoogleQuotaEnter = async (role: "student" | "teacher") => {
    if (!quotaGoogleFallback) return;
    setLoading(true);
    setLoadingText(`Masuk sebagai ${quotaGoogleFallback.name}...`);
    try {
      const payload = {
        email: quotaGoogleFallback.email,
        name: quotaGoogleFallback.name,
        sub: quotaGoogleFallback.sub,
        picture: quotaGoogleFallback.picture,
        role,
        isDemo: true,
      };
      const result = await login(JSON.stringify(payload));
      if (result.success && result.account) {
        manualRedirectRef.current = true;
        setSelection(SMAN_1_NGORO_FALLBACK);
        await finalizeLogin(result.account);
        setQuotaGoogleFallback(null);
        show(`Masuk sebagai ${result.account.name} · SMAN 1 Ngoro`, "success");
        navigate(resolveTargetRoute(result.account.role), { replace: true });
      } else {
        show(result.error ?? "Gagal masuk sesi sementara", "error");
      }
    } catch (e: any) {
      show(e?.message || "Gagal masuk sesi sementara", "error");
    } finally {
      setLoading(false);
      setLoadingText("");
    }
  };

  const handleCancel = () => {
    setAuthStatus("initial");
    setGoogleData(null);
  };

  const handleLanjutMasuk = async () => {
    if (googleData?.account) {
      setLoading(true);
      setLoadingText("Menghubungkan akun ke dasbor...");
      try {
        await finalizeLogin(googleData.account);
        setLoadingText("Membuka aplikasi...");
        show("Selamat datang kembali!", "success");
        navigate(resolveTargetRoute(googleData.account.role));
      } catch (err: any) {
        show(err?.message || "Gagal masuk ke sistem. Silakan coba lagi.", "error");
        setLoading(false);
        setLoadingText("");
      }
    }
  };

  const submitRegistration = async () => {
    if (!regSchool) {
      show("Pilih sekolah terlebih dahulu", "error");
      return;
    }
    setLoading(true);
    setLoadingText("Mendaftarkan akun & menyiapkan profil...");
    try {
      const result = await registerGoogle(
        googleData.token, 
        regRole, 
        regName, 
        regSchool, 
        "X", 
        "1"
      );
      
      if (result.success) {
        setLoadingText("Menyiapkan dasbor...");
        show("Pendaftaran berhasil!", "success");
        navigate(resolveTargetRoute(regRole));
      } else {
        show(result.error ?? "Gagal mendaftar", "error");
        setLoading(false);
        setLoadingText("");
      }
    } catch (e: any) {
      show(e?.message || "Terjadi kesalahan saat mendaftar", "error");
      setLoading(false);
      setLoadingText("");
    }
  };

  const isRawIpOrigin =
    typeof window !== "undefined" &&
    /^(?:\d{1,3}\.){3}\d{1,3}$/.test(window.location.hostname);

  return (
    <div className="relative flex min-h-viewport items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-950 px-3 sm:px-4 py-6 sm:py-10">
      {/* Background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-50/50 via-white to-sky-50/50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900" />
        <div className="absolute inset-0 bg-grid-pattern bg-[size:32px_32px] opacity-20 dark:opacity-10" />
        <motion.div
          className="absolute -top-20 left-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-brand-400/20 blur-[120px]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-0 right-1/4 h-[400px] w-[400px] translate-x-1/2 rounded-full bg-sky-400/20 blur-[100px]"
          animate={{ y: [0, -50, 0], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 8, repeat: Infinity, delay: 1 }}
        />
      </div>

      <div className="w-full max-w-xl">
        <div className="mb-4 sm:mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400"
          >
            <ArrowLeft className="h-4 w-4" /> Beranda
          </button>
          <ThemePicker />
        </div>

        {/* Logo */}
        <div className="mb-4 sm:mb-6 flex flex-col items-center text-center">
          <Logo variant="icon" size={44} />
          <h1 className="mt-2.5 sm:mt-3 font-display text-2xl font-extrabold tracking-tight text-ink-900 dark:text-white">
            Harmony
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-ink-500 dark:text-slate-400">
            Sistem Mitigasi Bencana & Geospasial Sekolah
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="glass rounded-3xl p-5 sm:p-9 shadow-glass-lg"
        >
          <AnimatePresence mode="wait">
            {authStatus === "initial" && (
              <motion.div
                key="initial"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col items-center justify-center gap-4 sm:gap-6"
              >
                <p className="text-center text-xs sm:text-sm font-medium text-ink-500 dark:text-slate-400">
                  Masuk menggunakan akun Google atau akses Demo SMAN 1 Ngoro
                </p>
                {loading ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-6">
                    <Loader2 className="h-10 w-10 animate-spin text-brand-600" />
                    <div className="space-y-1 text-center">
                      <p className="text-sm font-semibold text-brand-600 dark:text-brand-400">
                        {loadingText || "Memverifikasi akun..."}
                      </p>
                      <p className="text-xs text-ink-400 dark:text-slate-500">
                        Mohon tunggu sebentar
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center gap-3.5 sm:gap-4">
                    {isRawIpOrigin ? (
                      <div className="w-full rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-center text-[11px] font-medium text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300">
                        Akses via IP Jaringan Lokal ({window.location.hostname}) — login Google dinonaktifkan, silakan pilih Mode Demo di bawah.
                      </div>
                    ) : (
                      <div className="flex justify-center w-full">
                        <GoogleLogin
                          onSuccess={handleGoogleSuccess}
                          onError={() => {
                            show("Login Google tidak tersedia pada origin ini. Gunakan Mode Demo SMAN 1 Ngoro.", "info");
                          }}
                          shape="pill"
                        />
                      </div>
                    )}

                    {quotaGoogleFallback && (
                      <div className="w-full rounded-2xl border border-amber-300/70 bg-amber-50/90 dark:border-amber-700/60 dark:bg-amber-950/40 p-3.5 space-y-2.5">
                        <div className="flex items-center gap-2.5">
                          {quotaGoogleFallback.picture && (
                            <img
                              src={quotaGoogleFallback.picture}
                              alt={quotaGoogleFallback.name}
                              className="h-9 w-9 rounded-full border border-amber-300 dark:border-amber-700 object-cover shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {quotaGoogleFallback.name}
                            </p>
                            <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-snug">
                              Database permanen sedang penuh kuota. Lanjutkan sesi sementara memakai profil Google Anda:
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleGoogleQuotaEnter("student")}
                            className="rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold py-2 px-3 transition-colors"
                          >
                            Lanjut sebagai Murid
                          </button>
                          <button
                            type="button"
                            onClick={() => handleGoogleQuotaEnter("teacher")}
                            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-semibold py-2 px-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            Lanjut sebagai Guru
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="relative flex w-full items-center justify-center py-1">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                      </div>
                      <div className="relative bg-white dark:bg-slate-900 px-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold rounded-full">
                        Mode Demo — SMAN 1 Ngoro
                      </div>
                    </div>

                    <div className="flex w-full flex-col gap-2.5">
                      {/* Optional Nickname Input */}
                      <div className="w-full space-y-1.5 rounded-xl border border-brand-100 bg-brand-50/50 p-2.5 dark:border-brand-900/40 dark:bg-brand-950/20">
                        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                          <span className="font-semibold flex items-center gap-1.5 text-brand-700 dark:text-brand-300">
                            <User className="h-3.5 w-3.5" />
                            Nama Tampilan Demo
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">
                            Acak otomatis bila kosong
                          </span>
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            value={demoNickname}
                            onChange={(e) => setDemoNickname(e.target.value)}
                            placeholder="Ketik nama kamu untuk bermain bersama..."
                            maxLength={24}
                            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-ink-900 dark:text-white placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                          />
                          {demoNickname && (
                            <button
                              type="button"
                              onClick={() => setDemoNickname("")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                              aria-label="Hapus nama"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Primary Demo Button: Siswa SMAN 1 Ngoro */}
                      <button
                        type="button"
                        onClick={() => handleDevLogin("student")}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 px-4 py-3 text-sm font-bold text-white shadow-md shadow-brand-500/20 transition-all hover:shadow-lg active:scale-[0.99]"
                      >
                        <GraduationCap className="h-4.5 w-4.5" />
                        <span>Demo Murid</span>
                        <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
                      </button>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleDevLogin("teacher")}
                          className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 px-3 py-2.5 text-xs font-semibold text-ink-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <BookOpen className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                          <span>Demo Guru</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDevLogin("developer")}
                          className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 px-3 py-2.5 text-xs font-semibold text-ink-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          <span>Demo Ahli</span>
                        </button>
                      </div>

                      <Link
                        to="/app/maps"
                        className="w-full flex items-center justify-center gap-2 rounded-xl border border-sky-200/80 bg-sky-50/70 px-3 py-2 text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-100/80 dark:border-sky-800/60 dark:bg-sky-950/30 dark:text-sky-300"
                      >
                        <MapPin className="h-3.5 w-3.5" />
                        <span>Lanjut Tanpa Masuk sebagai Warga Publik</span>
                      </Link>

                      <p className="text-[11px] text-center text-slate-500 dark:text-slate-400 leading-tight pt-1">
                        Setiap akun demo dibuat unik agar <strong className="text-brand-600 dark:text-brand-400">tidak saling bertabrakan</strong> saat sesi bersama.
                      </p>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                        <Link
                          to="/app/learning-gain"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
                        >
                          <TrendingUp className="h-3.5 w-3.5" />
                          <span>Validasi Empiris</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {authStatus === "not_registered" && (
              <motion.div
                key="not_registered"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col items-center justify-center gap-6 text-center"
              >
                <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-brand-100">
                  <img src={googleData?.picture} alt="Profil" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-ink-900 dark:text-white">{googleData?.name}</h3>
                  <p className="text-sm text-ink-500 dark:text-slate-400">{googleData?.email}</p>
                </div>
                <div className="rounded-lg bg-amber-50 px-4 py-3 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    Akun belum pernah terdaftar.
                  </p>
                </div>
                <div className="flex w-full flex-col gap-3 sm:flex-row">
                  <button onClick={handleCancel} className="flex-1 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center justify-center gap-2">
                    <LogOut className="h-4 w-4" /> Keluar
                  </button>
                  <button onClick={() => setAuthStatus("register_name")} className="flex-1 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Lanjut registrasi akun
                  </button>
                </div>
              </motion.div>
            )}

            {authStatus === "registered" && (
              <motion.div
                key="registered"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col items-center justify-center gap-6 text-center"
              >
                <div className="rounded-lg bg-brand-50 px-4 py-3 border border-brand-200 dark:bg-brand-500/10 dark:border-brand-500/20">
                  <p className="text-sm font-medium text-brand-800 dark:text-brand-300">
                    Akun sudah terdaftar atas nama {googleData?.account?.name}.
                  </p>
                </div>
                <div className="flex w-full flex-col gap-3 sm:flex-row">
                  <button
                    onClick={handleCancel}
                    disabled={loading}
                    className="flex-1 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center justify-center gap-2"
                  >
                    <LogOut className="h-4 w-4" /> Keluar
                  </button>
                  <button
                    onClick={handleLanjutMasuk}
                    disabled={loading}
                    className="flex-1 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-75 disabled:cursor-wait flex items-center justify-center gap-2 shadow-md shadow-brand-500/20 transition-all"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                        <span>{loadingText || "Memproses..."}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Lanjut masuk</span>
                      </>
                    )}
                  </button>
                </div>
                {loading && (
                  <div className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-brand-200 bg-brand-50/80 px-4 py-3 text-xs font-medium text-brand-700 dark:border-brand-900/50 dark:bg-brand-950/40 dark:text-brand-300 shadow-sm animate-pulse">
                    <Loader2 className="h-4 w-4 animate-spin text-brand-600 dark:text-brand-400 shrink-0" />
                    <span>{loadingText || "Sedang memuat data akun dan mengarahkan ke dasbor..."}</span>
                  </div>
                )}
              </motion.div>
            )}

            {authStatus === "register_name" && (
              <motion.div key="register_name" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-6">
                <h3 className="text-lg font-bold text-ink-900 dark:text-white text-center">Nama Lengkap</h3>
                <input
                  id="register-fullname-input"
                  name="fullname"
                  type="text"
                  autoComplete="name"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Masukkan nama lengkap Anda"
                  className="w-full rounded-xl border border-brand-100 bg-white/70 px-4 py-3 text-sm outline-none focus:border-brand-300 dark:border-slate-700 dark:bg-slate-900/70 dark:text-white"
                />
                <div className="flex w-full flex-col gap-3 sm:flex-row mt-4">
                  <button onClick={() => setAuthStatus("not_registered")} className="flex-1 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center justify-center gap-2">
                    Kembali
                  </button>
                  <button onClick={() => setAuthStatus("register_role")} className="flex-1 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 flex items-center justify-center gap-2">
                    Lanjut
                  </button>
                </div>
              </motion.div>
            )}

            {authStatus === "register_role" && (
              <motion.div key="register_role" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-6">
                <h3 className="text-lg font-bold text-ink-900 dark:text-white text-center">Pilih Peran</h3>
                <div className="flex justify-center gap-4">
                  <button onClick={() => { setRegRole("teacher"); setAuthStatus("register_level"); }} className="flex-1 flex flex-col items-center justify-center gap-2 rounded-2xl border border-brand-100 bg-white/60 p-6 text-center transition-all hover:border-brand-300 hover:bg-brand-50 hover:shadow-glass dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-brand-600">
                    <BookOpen className="h-8 w-8 text-brand-600 dark:text-brand-400" />
                    <p className="text-sm font-bold text-ink-900 dark:text-white">Guru</p>
                  </button>
                  <button onClick={() => { setRegRole("student"); setAuthStatus("register_level"); }} className="flex-1 flex flex-col items-center justify-center gap-2 rounded-2xl border border-brand-100 bg-white/60 p-6 text-center transition-all hover:border-brand-300 hover:bg-brand-50 hover:shadow-glass dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-brand-600">
                    <GraduationCap className="h-8 w-8 text-brand-600 dark:text-brand-400" />
                    <p className="text-sm font-bold text-ink-900 dark:text-white">Siswa</p>
                  </button>
                </div>
                <div className="flex w-full flex-col mt-4">
                  <button onClick={() => setAuthStatus("register_name")} className="rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center justify-center gap-2">
                    Kembali
                  </button>
                </div>
              </motion.div>
            )}

            {authStatus === "register_level" && (
              <motion.div key="register_level" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-6">
                <h3 className="text-lg font-bold text-ink-900 dark:text-white text-center">Tingkat Pendidikan</h3>
                <div className="flex flex-col gap-3">
                  {(["SD", "SMP", "SMA", "SMK"] as const).map((lvl) => (
                    <button key={lvl} onClick={() => { setRegLevel(lvl); setAuthStatus("register_school"); }} className="rounded-xl border border-brand-100 bg-white/60 px-4 py-3 text-sm font-semibold text-ink-900 transition-all hover:border-brand-300 hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-800/60 dark:text-white dark:hover:border-brand-600">
                      {lvl === "SD" ? "SD / MI" : lvl === "SMP" ? "SMP / MTs" : lvl === "SMA" ? "SMA / MA" : "SMK / MAK"}
                    </button>
                  ))}
                </div>
                <div className="flex w-full flex-col mt-4">
                  <button onClick={() => setAuthStatus("register_role")} className="rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center justify-center gap-2">
                    Kembali
                  </button>
                </div>
              </motion.div>
            )}

            {authStatus === "register_school" && (
              <motion.div key="register_school" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-4">
                <h3 className="text-lg font-bold text-ink-900 dark:text-white text-center">Pilih Sekolah</h3>
                
                <div className="space-y-4">
                  <div className="space-y-4">
                    <SearchableDropdown
                      label="Provinsi"
                      icon={MapPin}
                      value={regProv}
                      options={provinces}
                      placeholder={loadingProvinces ? "Memuat provinsi..." : "Pilih Provinsi"}
                      onChange={(val) => {
                        setRegProv(val);
                        setRegCity("");
                        setRegSchool("");
                      }}
                    />
                    
                    <SearchableDropdown
                      label="Kabupaten / Kota"
                      icon={Building2}
                      value={regCity}
                      options={cities}
                      placeholder={
                        !regProv
                          ? "Pilih provinsi terlebih dahulu"
                          : loadingCities
                          ? "Memuat kabupaten/kota..."
                          : "Pilih Kota/Kabupaten"
                      }
                      onChange={(val) => {
                        setRegCity(val);
                        setRegSchool("");
                      }}
                      disabled={!regProv || loadingCities}
                    />
                    
                    <SearchableDropdown
                      label="Sekolah"
                      icon={SchoolIcon}
                      value={regSchool}
                      options={filteredSchools.map(s => ({ id: s.id, name: s.name }))}
                      placeholder={
                        !regCity
                          ? "Pilih kota/kabupaten terlebih dahulu"
                          : loadingSchools
                          ? "Memuat daftar sekolah..."
                          : "Pilih Sekolah"
                      }
                      onChange={setRegSchool}
                      disabled={!regCity || loadingSchools}
                    />

                    {loadingSchools && (
                      <p className="text-xs text-brand-600 dark:text-brand-400 animate-pulse flex items-center gap-1.5 mt-1">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Mengambil basis data sekolah...</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex w-full flex-col gap-3 sm:flex-row mt-4">
                  <button
                    onClick={() => setAuthStatus("register_level")}
                    disabled={loading}
                    className="flex-1 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center justify-center gap-2"
                  >
                    Kembali
                  </button>
                  <button
                    onClick={submitRegistration}
                    disabled={loading || !regSchool}
                    className="flex-1 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-brand-500/20 transition-all"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                        <span>{loadingText || "Menyimpan..."}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Selesai</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>

        {/* Tech badges */}
        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-ink-400 dark:text-slate-500">
          <span className="flex items-center gap-1.5"><Brain className="h-3.5 w-3.5" /> AI</span>
          <span className="flex items-center gap-1.5"><Boxes className="h-3.5 w-3.5" /> Harmony Twin</span>
          <span className="flex items-center gap-1.5"><Satellite className="h-3.5 w-3.5" /> Geospasial</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> SPAB</span>
        </div>
      </div>
    </div>
  );
}
