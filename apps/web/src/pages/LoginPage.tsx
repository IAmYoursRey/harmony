import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Satellite, Boxes, ShieldCheck, ArrowLeft, LogOut, CheckCircle2, ChevronDown, Search, GraduationCap, BookOpen, MapPin, Building2, School as SchoolIcon } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useToast } from "@/hooks/useToast";
import { ThemePicker } from "@/components/ThemePicker";
import { SearchableDropdown } from "@/components/SchoolLocationSelector";
import { useAuth } from "@/hooks/useAuth";
import { GoogleLogin } from "@react-oauth/google";
import { fetchProvinces, fetchRegencies, fetchSchools } from "@/services/schoolService";
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
  const { show } = useToast();
  const { login, finalizeLogin, registerGoogle, currentUser } = useAuth();

  const [authStatus, setAuthStatus] = useState<AuthStatus>("initial");
  const [googleData, setGoogleData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

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
    fetchProvinces().then(setProvinces);
  }, []);

  useEffect(() => {
    if (regProv) {
      fetchRegencies(regProv).then(setCities);
    } else {
      setCities([]);
    }
  }, [regProv]);

  useEffect(() => {
    if (regProv && regCity) {
      fetchSchools(regProv, regCity).then(setSchools);
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
    if (currentUser && authStatus === "initial") {
      navigate("/app");
    }
  }, [currentUser, navigate, authStatus]);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) {
      show("Gagal mendapatkan token dari Google", "error");
      return;
    }
    setLoading(true);
    const result = await login(credentialResponse.credential);
    setLoading(false);
    
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
      show(result.error ?? "Gagal masuk", "error");
    }
  };

  const handleCancel = () => {
    setAuthStatus("initial");
    setGoogleData(null);
  };

  const handleLanjutMasuk = async () => {
    if (googleData?.account) {
      setLoading(true);
      await finalizeLogin(googleData.account);
      show("Selamat datang kembali!", "success");
      navigate("/app");
    }
  };

  const submitRegistration = async () => {
    if (!regSchool) {
      show("Pilih sekolah terlebih dahulu", "error");
      return;
    }
    setLoading(true);
    const result = await registerGoogle(
      googleData.token, 
      regRole, 
      regName, 
      regSchool, 
      "X", 
      "1"
    );
    setLoading(false);
    
    if (result.success) {
      show("Pendaftaran berhasil!", "success");
      navigate("/app");
    } else {
      show(result.error ?? "Gagal mendaftar", "error");
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-950 px-4 py-10">
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
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400"
          >
            <ArrowLeft className="h-4 w-4" /> Beranda
          </button>
          <ThemePicker />
        </div>

        {/* Logo */}
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo variant="icon" size={48} />
          <h1 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-ink-900 dark:text-white">
            Harmony
            <span className="text-brand-600 dark:text-brand-400">Edu</span>
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-slate-400">
            Platform Pembelajaran Mitigasi Bencana Berbasis AI
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass rounded-3xl p-7 shadow-glass-lg sm:p-9"
        >
          <AnimatePresence mode="wait">
            {authStatus === "initial" && (
              <motion.div
                key="initial"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col items-center justify-center gap-6"
              >
                <p className="text-sm font-medium text-ink-500 dark:text-slate-400">
                  Silakan masuk menggunakan akun Google Anda
                </p>
                {loading ? (
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
                ) : (
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => show("Gagal login dengan Google", "error")}
                    useOneTap
                    shape="pill"
                  />
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
                  <img src={googleData?.picture} alt="Profil" className="h-full w-full object-cover" />
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
                  <button onClick={handleCancel} className="flex-1 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center justify-center gap-2">
                    <LogOut className="h-4 w-4" /> Keluar
                  </button>
                  <button onClick={handleLanjutMasuk} className="flex-1 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Lanjut masuk
                  </button>
                </div>
              </motion.div>
            )}

            {authStatus === "register_name" && (
              <motion.div key="register_name" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-6">
                <h3 className="text-lg font-bold text-ink-900 dark:text-white text-center">Nama Lengkap</h3>
                <input
                  type="text"
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
                    <p className="text-sm font-bold text-ink-900 dark:text-white">Teacher</p>
                  </button>
                  <button onClick={() => { setRegRole("student"); setAuthStatus("register_level"); }} className="flex-1 flex flex-col items-center justify-center gap-2 rounded-2xl border border-brand-100 bg-white/60 p-6 text-center transition-all hover:border-brand-300 hover:bg-brand-50 hover:shadow-glass dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-brand-600">
                    <GraduationCap className="h-8 w-8 text-brand-600 dark:text-brand-400" />
                    <p className="text-sm font-bold text-ink-900 dark:text-white">Student</p>
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
                <h3 className="text-lg font-bold text-ink-900 dark:text-white text-center">Pilih Lokasi & Sekolah</h3>
                
                <div className="space-y-4">
                  <div className="space-y-4">
                    <SearchableDropdown
                      label="Provinsi"
                      icon={MapPin}
                      value={regProv}
                      options={provinces}
                      placeholder="Pilih Provinsi"
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
                      placeholder="Pilih Kota/Kabupaten"
                      onChange={(val) => {
                        setRegCity(val);
                        setRegSchool("");
                      }}
                      disabled={!regProv}
                    />
                    
                    <SearchableDropdown
                      label="Sekolah"
                      icon={SchoolIcon}
                      value={regSchool}
                      options={filteredSchools.map(s => ({ id: s.id, name: s.name }))}
                      placeholder="Pilih Sekolah"
                      onChange={setRegSchool}
                      disabled={!regCity}
                    />
                  </div>
                </div>

                <div className="flex w-full flex-col gap-3 sm:flex-row mt-4">
                  <button onClick={() => setAuthStatus("register_level")} className="flex-1 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center justify-center gap-2">
                    Kembali
                  </button>
                  <button onClick={submitRegistration} disabled={loading || !regSchool} className="flex-1 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading ? "Menyimpan..." : "Selesai"}
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
