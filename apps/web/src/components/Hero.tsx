import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Play,
  Brain,
  Boxes,
  ShieldCheck,
  Satellite,
  GraduationCap,
  Map,
  Gauge,
  BarChart3,
} from "lucide-react";
import { HeroIllustration } from "@/components/HeroIllustration";
import { useI18n } from "@/hooks/useI18n";
import { useDemoStudentLogin } from "@/hooks/useDemoStudentLogin";

const pillars = [
  { icon: Brain, label: "Pembelajaran Adaptif" },
  { icon: Boxes, label: "Denah Digital Twin" },
  { icon: Satellite, label: "Pemetaan Geospasial" },
];

const featureCards = [
  {
    icon: Brain,
    title: "AI Learning Engine",
    description: "Latihan materi bencana sesuai tingkat pemahaman siswa.",
    to: "/app/ai-learning",
    accent: "from-brand-500 to-brand-700",
  },
  {
    icon: Map,
    title: "GeoSpatial Risk Mapping",
    description: "Pemetaan bahaya langsung pada koordinat sekitar sekolah.",
    to: "/app/geo-risk-map",
    accent: "from-brand-500 to-brand-600",
  },
  {
    icon: Boxes,
    title: "Harmony Twin School",
    description: "Simulasi evakuasi interaktif di atas denah sekolah nyata.",
    to: "/app/digital-twin",
    accent: "from-brand-500 to-brand-600",
  },
  {
    icon: Gauge,
    title: "Smart Readiness Index",
    description: "Pengukuran skor kesiapsiagaan siswa dan satuan pendidikan.",
    to: "/app/gss",
    accent: "from-brand-500 to-brand-600",
  },
];

export function Hero() {
  const { t } = useI18n();
  const { isDemoLoading, handleInstantDemoLogin } = useDemoStudentLogin();
  return (
    <section
      id="home"
      className="relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-28"
    >
      {/* Animated background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-50 via-white to-white dark:from-slate-900 dark:via-slate-950 dark:to-slate-950" />
        <div className="absolute inset-0 bg-grid-pattern bg-[size:44px_44px] opacity-60 dark:opacity-20" />
        <motion.div
          className="absolute -top-24 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-brand-300/30 blur-[120px]"
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.4, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-40 -right-20 h-72 w-72 rounded-full bg-brand-400/20 blur-[100px]"
          animate={{ y: [0, 30, 0], opacity: [0.2, 0.3, 0.2] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-10 -left-20 h-72 w-72 rounded-full bg-brand-200/20 blur-[100px]"
          animate={{ y: [0, -20, 0], opacity: [0.2, 0.3, 0.2] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="section-container">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-10">
          {/* Left: copy */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-4 py-1.5 text-xs font-semibold text-brand-700 backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/80 dark:text-brand-400"
            >
              Platform Mitigasi Sekolah
            </motion.div>

            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.12] tracking-tight text-ink-900 sm:text-5xl lg:text-6xl dark:text-white">
              Harmony
            </h1>

            <p className="mt-3 font-display text-lg font-bold text-brand-600 sm:text-xl dark:text-brand-400">
              Ekosistem Geospasial Sekolah
            </p>

            <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-ink-600 sm:text-base lg:mx-0 dark:text-slate-300">
              Memadukan data geospasial, denah digital sekolah, dan latihan evakuasi terukur untuk Satuan Pendidikan Aman Bencana.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
              <Link
                to="/app/maps"
                className="group inline-flex items-center gap-2 rounded-full bg-brand-600 px-7 py-3.5 text-sm font-semibold text-white shadow-glass transition-colors hover:bg-brand-700"
              >
                <Play className="h-4 w-4 fill-white" />
                {t("landing.start_learning")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <button
                type="button"
                onClick={handleInstantDemoLogin}
                disabled={isDemoLoading}
                className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-7 py-3.5 text-sm font-semibold text-brand-700 backdrop-blur-md transition-colors hover:border-brand-300 hover:bg-white disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800/80 dark:text-brand-400"
              >
                <GraduationCap className="h-4 w-4" />
                {isDemoLoading ? "Memuat Demo..." : "Demo SMAN 1"}
              </button>
            </div>

            {/* Tech pillars */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start"
            >
              {pillars.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-ink-700 dark:text-slate-300"
                >
                  <Icon className="h-4 w-4 text-brand-600" />
                  {label}
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative"
          >
            <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-tr from-brand-400/25 via-brand-300/20 to-transparent blur-2xl" />
            <div className="glass rounded-[1.75rem] p-3 shadow-glass-lg sm:p-5">
              <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/40 dark:border-slate-700/60 dark:bg-slate-800/40">
                <HeroIllustration />
              </div>
            </div>

            {/* Floating chips */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -left-3 top-1/4 hidden sm:block"
            >
              <div className="glass inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-left shadow-glass">
                <ShieldCheck className="h-5 w-5 text-brand-600" />
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-brand-600">
                    {t("landing.chips.school_score.label")}
                  </p>
                  <p className="text-sm font-bold text-ink-900 dark:text-white">
                    {t("landing.chips.school_score.value")}
                  </p>
                </div>
              </div>
            </motion.div>
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -right-3 bottom-1/4 hidden sm:block"
            >
              <div className="glass inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-left shadow-glass">
                <Satellite className="h-5 w-5 text-brand-600" />
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-brand-600">
                    {t("landing.chips.live_data.label")}
                  </p>
                  <p className="text-sm font-bold text-ink-900 dark:text-white">
                    {t("landing.chips.live_data.value")}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* 4 Feature Cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {featureCards.map((c) => (
            <Link
              key={c.title}
              to={c.to}
              className="group glass relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-glass-lg"
            >
              <div
                className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${c.accent} opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-20`}
              />
              <div
                className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${c.accent} text-white shadow-glass transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}
              >
                <c.icon className="h-6 w-6" strokeWidth={2} />
              </div>
              <h3 className="mt-4 font-display text-base font-bold text-ink-900 dark:text-white">
                {c.title === "AI Learning Engine"
                  ? "Mesin Pembelajaran AI"
                  : c.title === "GeoSpatial Risk Mapping"
                    ? "Pemetaan Risiko Geo"
                    : c.title === "Harmony Twin School"
                      ? "Harmony Twin Sekolah"
                      : "Indeks Kesiapan Pintar"}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-slate-300">
                {c.description}
              </p>
              <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-brand-600 opacity-100 sm:opacity-0 transition-all sm:group-hover:opacity-100 dark:text-brand-400">
                Buka{" "}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
