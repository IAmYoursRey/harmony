import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  Sparkles,
  LogIn,
  ArrowRight,
  X,
  Loader2,
  ShieldCheck,
  Map,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSchool } from "@/hooks/useSchool";
import { useToast } from "@/hooks/useToast";
import { getSchoolById, SMAN_1_NGORO_FALLBACK } from "@/services/schoolService";
import { generateRandomDemoPayload } from "@/utils/demoSchool";

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
  const { setSelection } = useSchool();
  const { show } = useToast();
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);

  if (!isOpen) return null;

  const handleProceedLogin = () => {
    onClose();
    navigate(`/login?redirect=${encodeURIComponent(targetPath)}`);
  };

  const handleQuickLogin = async () => {
    setIsLoadingDemo(true);
    try {
      const demoPayload = generateRandomDemoPayload("student");

      const result = await login(JSON.stringify(demoPayload));
      if (result.success && result.account) {
        await finalizeLogin(result.account);
        const ngoro = await getSchoolById("ffdcdf34-fc99-4209-913e-5a6042e957ad");
        setSelection(ngoro || SMAN_1_NGORO_FALLBACK);
        show(`Masuk Mode Demo SMAN 1 Ngoro (${result.account.name}).`, "success");
        onClose();
        navigate(targetPath);
      } else {
        show(result.error ?? "Gagal masuk mode demo", "error");
      }
    } catch (e: any) {
      show(e?.message || "Gagal masuk sesi demo", "error");
    } finally {
      setIsLoadingDemo(false);
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

            <span className="mt-4 inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-[11px] font-semibold text-brand-700 ring-1 ring-inset ring-brand-500/20 dark:bg-brand-950/60 dark:text-brand-300">
              Portal Edukasi
            </span>

            <h3 className="mt-2.5 font-display text-lg font-extrabold tracking-tight text-ink-900 dark:text-white">
              Masuk: {itemName}
            </h3>

            <p className="mt-2 text-xs leading-relaxed text-ink-500 dark:text-slate-400">
              Masuk dengan akun Google atau gunakan Demo SMAN 1 Ngoro untuk membuka seluruh modul.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={handleProceedLogin}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors"
            >
              <LogIn className="h-4 w-4" />
              <span>Masuk Akun</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>

            <button
              type="button"
              disabled={isLoadingDemo}
              onClick={handleQuickLogin}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50/70 px-4 py-2.5 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100 hover:text-brand-800 disabled:opacity-50 dark:border-brand-900/50 dark:bg-brand-950/40 dark:text-brand-300 dark:hover:bg-brand-900/50"
            >
              {isLoadingDemo ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600 dark:text-brand-400" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
              )}
              <span>Demo SMAN 1</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="mt-0.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-xs font-medium text-ink-500 transition-colors hover:bg-slate-50 hover:text-ink-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <Map className="h-3.5 w-3.5 text-slate-400" />
              <span>Kembali ke Peta</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
