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
    icon: Map,
    badge: "Warga & Publik",
    title: "Peta Siaga Terbuka",
    description: "Pantau gempa, cuaca, dan rute aman tanpa login.",
    to: "/app/maps",
    accent: "from-sky-500 to-blue-600",
  },
  {
    icon: GraduationCap,
    badge: "Murid",
    title: "Belajar & Simulasi 3D",
    description: "Latihan evakuasi sekolah, kuis, dan tanya GeoBot.",
    to: "/login?role=student&redirect=/app/dashboard",
    accent: "from-brand-500 to-indigo-600",
  },
  {
    icon: Boxes,
    badge: "Guru & Sekolah",
    title: "Kendali Kelas & SPAB",
    description: "Susun denah sekolah dan pantau kesiapan kelas.",
    to: "/login?role=teacher&redirect=/app/teacher",
    accent: "from-amber-500 to-orange-600",
  },
  {
    icon: Satellite,
    badge: "Ahli & Peneliti",
    title: "Studio Geospasial & IoT",
    description: "Analisis WebGIS, citra satelit, dan telemetri lahan.",
    to: "/app/geospatial",
    accent: "from-emerald-500 to-teal-600",
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

        {/* 4 Persona Entry Cards */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.35 }}
          className="mt-16 space-y-4"
        >
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <h2 className="font-display text-lg font-extrabold tracking-tight text-ink-900 dark:text-white sm:text-xl">
                Pilih Ruang Kerja Sesuai Kebutuhan
              </h2>
              <p className="text-xs text-ink-500 dark:text-slate-400 sm:text-sm">
                Tampilan dan fitur disusun bertahap agar nyaman dipakai warga, murid, guru, maupun peneliti.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featureCards.map((c) => (
              <Link
                key={c.title}
                to={c.to}
                className="group glass relative flex flex-col justify-between overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-glass-lg"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${c.accent} text-white shadow-glass transition-transform duration-300 group-hover:scale-105`}
                    >
                      <c.icon className="h-5 w-5" strokeWidth={2} />
                    </div>
                    <span className="rounded-full border border-slate-200/80 bg-white/80 px-2.5 py-0.5 text-[11px] font-bold text-ink-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {c.badge}
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-base font-bold text-ink-900 dark:text-white">
                    {c.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-600 dark:text-slate-300">
                    {c.description}
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400">
                  <span>Buka Ruang Kerja</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
