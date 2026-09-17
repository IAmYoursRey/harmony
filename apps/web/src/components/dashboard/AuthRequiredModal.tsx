import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  Sparkles,
  LogIn,
  ArrowRight,
  X,
  UserCheck,
  Loader2,
  ShieldCheck,
  Map,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";

interface AuthRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemName?: string;
  targetPath?: string;
}

export function AuthRequiredModal({
  isOpen,
  onClose,
  itemName = "Fitur Edukasi",
  targetPath = "/app/dashboard",
}: AuthRequiredModalProps) {
  const navigate = useNavigate();
  const { login, finalizeLogin } = useAuth();
  const { show } = useToast();
  const [loadingRole, setLoadingRole] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleProceedLogin = () => {
    onClose();
    navigate(`/login?redirect=${encodeURIComponent(targetPath)}`);
  };

  const handleQuickLogin = async (role: "developer" | "student") => {
    setLoadingRole(role);
    try {
      const devPayload =
        role === "developer"
          ? {
              email: "raihanansari3345@gmail.com",
              name: "Raihan Ansari",
              sub: "116086836535518680376",
              picture:
                "https://lh3.googleusercontent.com/a/ACg8ocILCQOch6sL8tq_D5QC25Km3hcV9kb-m3kA0_5HBSnoie9Zjrg=s96-c",
            }
          : {
              email: "student6273@sman1ngoro.sch.id",
              name: "ABDUL WAHID",
              sub: "usr-6273-1789454953604-708",
              picture:
                "https://api.dicebear.com/7.x/avataaars/svg?seed=AbdulWahid",
            };

      const result = await login(JSON.stringify(devPayload));
      if (result.success && result.account) {
        await finalizeLogin(result.account);
        show(`Selamat datang, ${result.account.name}! Akses fitur terbuka.`, "success");
        onClose();
        navigate(targetPath);
      } else {
        show(result.error ?? "Gagal masuk mode pengujian", "error");
      }
    } catch (e: any) {
      show(e?.message || "Gagal masuk sesi demo", "error");
    } finally {
      setLoadingRole(null);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-ink-950/60 backdrop-blur-md dark:bg-black/75"
        />

        {/* Dialog Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl border border-brand-100 bg-white/95 p-6 shadow-glass-xl backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-900/95 sm:p-7 z-10"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-ink-400 hover:bg-slate-100 hover:text-ink-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
            aria-label="Tutup dialog"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Decorative glow */}
          <div className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 h-32 w-48 rounded-full bg-brand-500/20 blur-3xl dark:bg-brand-500/30" />

          {/* Header & Icon */}
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 text-white shadow-lg shadow-brand-500/30 ring-4 ring-brand-100 dark:ring-slate-800">
              <GraduationCap className="h-7 w-7" />
            </div>

            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-[11px] font-bold text-brand-700 ring-1 ring-inset ring-brand-500/20 dark:bg-brand-950/60 dark:text-brand-300">
              <Sparkles className="h-3 w-3" />
              <span>Modul Edukasi & Penelitian</span>
            </div>

            <h3 className="mt-2.5 font-display text-lg font-extrabold tracking-tight text-ink-900 dark:text-white">
              Akses {itemName} Memerlukan Akun
            </h3>

            <p className="mt-2 text-xs leading-relaxed text-ink-500 dark:text-slate-400">
              Fitur <span className="font-semibold text-ink-800 dark:text-slate-200">{itemName}</span> memerlukan akun terdaftar untuk menyimpan riwayat kesiapsiagaan, simulasi SPAB, dan capaian pembelajaran Anda.
            </p>

            <div className="mt-3.5 w-full rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3 text-left text-xs text-indigo-900 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-200">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
                <div>
                  <p className="font-semibold">Apakah Anda ingin melanjutkan dan login atau daftar akun?</p>
                  <p className="mt-0.5 text-[11px] text-indigo-700 dark:text-indigo-300">
                    Gunakan akun Google Anda untuk masuk atau mendaftar otomatis ke modul sekolah.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={handleProceedLogin}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition-all hover:from-brand-700 hover:to-indigo-700 hover:shadow-lg active:scale-[0.99]"
            >
              <LogIn className="h-4 w-4" />
              <span>Lanjutkan Masuk / Daftar Akun</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>

            {/* Quick test logins for fast evaluation */}
            <div className="relative my-1 flex items-center justify-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
              <span className="absolute bg-white px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-900 dark:text-slate-500">
                Akses Cepat Pengujian
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={loadingRole !== null}
                onClick={() => handleQuickLogin("developer")}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs font-semibold text-ink-700 transition-all hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {loadingRole === "developer" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-brand-500" />
                )}
                <span>Dev (Raihan)</span>
              </button>

              <button
                type="button"
                disabled={loadingRole !== null}
                onClick={() => handleQuickLogin("student")}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs font-semibold text-ink-700 transition-all hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {loadingRole === "student" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" />
                ) : (
                  <UserCheck className="h-3.5 w-3.5 text-slate-500" />
                )}
                <span>Siswa (Demo)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-xs font-medium text-ink-500 transition-colors hover:bg-slate-50 hover:text-ink-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <Map className="h-3.5 w-3.5 text-slate-400" />
              <span>Tetap di Peta Interaktif (Batal)</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
