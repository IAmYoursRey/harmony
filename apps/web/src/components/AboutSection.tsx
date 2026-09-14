import {
  Eye,
  Target,
  BookOpen,
  Brain,
  Boxes,
  Satellite,
  Globe,
  Leaf,
  Building2,
  Users,
  Code2,
  Palette,
  BarChart3,
  Sparkles,
  ArrowRight,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";

/* ─── Data ─────────────────────────────────────────────────────────────────── */

const technologies: {
  icon: LucideIcon;
  labelKey: string;
  descKey: string;
  featuresKey: string[];
}[] = [
  {
    icon: Brain,
    labelKey: "about.tech.ai.label",
    descKey: "about.tech.ai.desc",
    featuresKey: [
      "about.tech.ai.f1",
      "about.tech.ai.f2",
      "about.tech.ai.f3",
      "about.tech.ai.f4",
    ],
  },
  {
    icon: Boxes,
    labelKey: "about.tech.dt.label",
    descKey: "about.tech.dt.desc",
    featuresKey: [
      "about.tech.dt.f1",
      "about.tech.dt.f2",
      "about.tech.dt.f3",
      "about.tech.dt.f4",
    ],
  },
  {
    icon: Satellite,
    labelKey: "about.tech.geo.label",
    descKey: "about.tech.geo.desc",
    featuresKey: [
      "about.tech.geo.f1",
      "about.tech.geo.f2",
      "about.tech.geo.f3",
      "about.tech.geo.f4",
    ],
  },
];

const sdgs: {
  number: number;
  titleKey: string;
  descKey: string;
  icon: LucideIcon;
}[] = [
  {
    number: 4,
    titleKey: "sdgs.sdg4.title",
    descKey: "sdgs.sdg4.desc",
    icon: BookOpen,
  },
  {
    number: 11,
    titleKey: "sdgs.sdg11.title",
    descKey: "sdgs.sdg11.desc",
    icon: Building2,
  },
  {
    number: 13,
    titleKey: "sdgs.sdg13.title",
    descKey: "sdgs.sdg13.desc",
    icon: Leaf,
  },
];

const team: {
  initials: string;
  name: string;
  roleKey: string;
  subtitleKey: string;
  icon: LucideIcon;
  bioKey: string;
}[] = [
  {
    initials: "AN",
    name: "Alvira Fitriatun Nizha",
    roleKey: "about.team.an.role",
    subtitleKey: "about.team.an.subtitle",
    icon: Code2,
    bioKey: "about.team.an.bio",
  },
  {
    initials: "AK",
    name: "Aretha Kirana Putri Junaidi",
    roleKey: "about.team.ak.role",
    subtitleKey: "about.team.ak.subtitle",
    icon: Palette,
    bioKey: "about.team.ak.bio",
  },
  {
    initials: "SN",
    name: "Sinta Nadhifah",
    roleKey: "about.team.sn.role",
    subtitleKey: "about.team.sn.subtitle",
    icon: BarChart3,
    bioKey: "about.team.sn.bio",
  },
];

/* ─── Sub-components ────────────────────────────────────────────────────────── */

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`glass rounded-2xl p-6 transition-all hover:shadow-glass ${className}`}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-brand-600">
      {children}
    </span>
  );
}

/* ─── Decorative SVG illustration ───────────────────────────────────────────── */
function HeroIllustration() {
  return (
    <svg viewBox="0 0 420 320" className="w-full max-w-md" aria-hidden>
      <defs>
        <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
          <stop
            offset="0%"
            stopColor="hsl(var(--brand-600))"
            stopOpacity="0.18"
          />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.08" />
        </linearGradient>
        <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(var(--brand-600))" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
        <linearGradient id="g3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--brand-100))" />
          <stop offset="100%" stopColor="hsl(var(--brand-200))" />
        </linearGradient>
      </defs>

      {/* Background circle */}
      <circle cx="210" cy="155" r="130" fill="url(#g1)" />
      <circle
        cx="210"
        cy="155"
        r="130"
        fill="none"
        stroke="hsl(var(--brand-600))"
        strokeWidth="1"
        strokeOpacity="0.15"
      />
      <circle
        cx="210"
        cy="155"
        r="100"
        fill="none"
        stroke="hsl(var(--brand-600))"
        strokeWidth="0.5"
        strokeOpacity="0.1"
        strokeDasharray="4 4"
      />

      {/* Globe */}
      <circle cx="210" cy="155" r="68" fill="url(#g2)" />
      <ellipse
        cx="210"
        cy="155"
        rx="30"
        ry="68"
        fill="none"
        stroke="#fff"
        strokeWidth="1"
        strokeOpacity="0.3"
      />
      <ellipse
        cx="210"
        cy="155"
        rx="68"
        ry="22"
        fill="none"
        stroke="#fff"
        strokeWidth="1"
        strokeOpacity="0.3"
      />

      {/* Continents */}
      <path
        d="M185 130 Q200 120 215 128 Q225 135 218 148 Q208 155 195 150 Q182 143 185 130Z"
        fill="#fff"
        fillOpacity="0.25"
      />
      <path
        d="M220 158 Q235 150 245 162 Q248 172 238 178 Q226 180 218 170Z"
        fill="#fff"
        fillOpacity="0.25"
      />
      <path
        d="M175 160 Q183 155 190 163 Q193 170 186 174 Q178 175 174 167Z"
        fill="#fff"
        fillOpacity="0.25"
      />

      {/* Map pin */}
      <circle cx="210" cy="147" r="8" fill="#fff" fillOpacity="0.9" />
      <circle cx="210" cy="147" r="4" fill="hsl(var(--brand-600))" />
      <line
        x1="210"
        y1="155"
        x2="210"
        y2="162"
        stroke="#fff"
        strokeWidth="2"
        strokeOpacity="0.9"
      />

      {/* Orbit rings */}
      <ellipse
        cx="210"
        cy="155"
        rx="95"
        ry="30"
        fill="none"
        stroke="hsl(var(--brand-600))"
        strokeWidth="1"
        strokeOpacity="0.25"
        strokeDasharray="5 4"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 210 155"
          to="360 210 155"
          dur="18s"
          repeatCount="indefinite"
        />
      </ellipse>

      {/* Orbit dots */}
      <circle
        cx="305"
        cy="155"
        r="6"
        fill="hsl(var(--brand-600))"
        fillOpacity="0.8"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 210 155"
          to="360 210 155"
          dur="18s"
          repeatCount="indefinite"
        />
      </circle>
      <circle cx="115" cy="155" r="4" fill="#0ea5e9" fillOpacity="0.7">
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="180 210 155"
          to="540 210 155"
          dur="18s"
          repeatCount="indefinite"
        />
      </circle>

      {/* AI node constellation */}
      {[
        [70, 80],
        [340, 70],
        [360, 240],
        [55, 250],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle
            cx={x}
            cy={y}
            r="5"
            fill="hsl(var(--brand-600))"
            fillOpacity="0.5"
          />
          <line
            x1={x}
            y1={y}
            x2="210"
            y2="155"
            stroke="hsl(var(--brand-600))"
            strokeWidth="0.7"
            strokeOpacity="0.18"
            strokeDasharray="4 4"
          />
        </g>
      ))}

      {/* Pulse ring */}
      <circle
        cx="210"
        cy="155"
        r="75"
        fill="none"
        stroke="hsl(var(--brand-600))"
        strokeWidth="2"
        strokeOpacity="0"
      >
        <animate
          attributeName="r"
          values="68;95;68"
          dur="3s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="stroke-opacity"
          values="0.5;0;0.5"
          dur="3s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
}

/* ─── Main view ─────────────────────────────────────────────────────────────── */
export function AboutSection() {
  const { t } = useI18n();
  return (
    <section id="about" className="space-y-8 section-container py-24">
      {/* ── Hero banner ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-8 text-white shadow-glass-lg sm:p-10">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:40px_40px] opacity-15" />
        <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-10 left-0 h-40 w-64 rounded-full bg-brand-400/20 blur-2xl" />

        <div className="relative flex flex-col items-center gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-lg text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              <Globe className="h-3.5 w-3.5" /> {t("about.badge")}
            </span>
            <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              {t("nav.about")}
              <br />
              <span className="text-brand-200">Harmony Edu</span>
            </h1>
            <p className="mt-4 text-base leading-relaxed text-brand-100 sm:text-lg">
              {t("about.tagline")}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2.5 lg:justify-start">
              {[
                "Artificial Intelligence",
                "Digital Twin",
                "Geospatial Technology",
              ].map((tech) => (
                <span
                  key={tech}
                  className="rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold backdrop-blur-sm"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
          <div className="w-full max-w-[280px] shrink-0 lg:max-w-xs">
            <HeroIllustration />
          </div>
        </div>
      </div>

      {/* ── Vision & Mission ─────────────────────────────────────────────────── */}
      <div className="grid gap-5 sm:grid-cols-2">
        <Card className="relative overflow-hidden">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand-100/60 blur-xl" />
          <div className="relative">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glass">
                <Eye className="h-5 w-5" />
              </span>
              <div>
                <SectionLabel>{t("about.vision.label")}</SectionLabel>
              </div>
            </div>
            <h2 className="font-display text-xl font-extrabold text-ink-900 dark:text-white">
              {t("about.vision.title")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-600 dark:text-slate-300">
              {t("about.vision.desc")}
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-brand-600">
              <ArrowRight className="h-3.5 w-3.5" /> {t("about.vision.action")}
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand-100/60 blur-xl" />
          <div className="relative">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-glass">
                <Target className="h-5 w-5" />
              </span>
              <div>
                <SectionLabel>{t("about.mission.label")}</SectionLabel>
              </div>
            </div>
            <h2 className="font-display text-xl font-extrabold text-ink-900 dark:text-white">
              {t("about.mission.title")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-600 dark:text-slate-300">
              {t("about.mission.desc")}
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-brand-600">
              <ArrowRight className="h-3.5 w-3.5" /> {t("about.mission.action")}
            </div>
          </div>
        </Card>
      </div>

      {/* ── Background ───────────────────────────────────────────────────────── */}
      <Card className="relative overflow-hidden">
        <div className="absolute right-0 top-0 h-40 w-64 rounded-bl-full bg-brand-50/60 dark:bg-slate-800/60" />
        <div className="relative">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-glass">
              <BookOpen className="h-5 w-5" />
            </span>
            <div>
              <SectionLabel>{t("about.bg.label")}</SectionLabel>
              <h2 className="mt-0.5 font-display text-xl font-extrabold text-ink-900 dark:text-white">
                {t("about.bg.title")}
              </h2>
            </div>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-3 text-sm leading-relaxed text-ink-600 dark:text-slate-300">
              <p>{t("about.bg.p1")}</p>
              <p dangerouslySetInnerHTML={{ __html: t("about.bg.p2") }} />
            </div>
            <div className="space-y-3 text-sm leading-relaxed text-ink-600 dark:text-slate-300">
              <p>{t("about.bg.p3")}</p>
              <p>{t("about.bg.p4")}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {["Ring of Fire", "Mojokerto", "Research", "Harmony"].map(
              (tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-brand-50 px-3.5 py-1.5 text-xs font-semibold text-brand-700"
                >
                  {tag}
                </span>
              ),
            )}
          </div>
        </div>
      </Card>

      {/* ── Technologies ─────────────────────────────────────────────────────── */}
      <div>
        <div className="mb-5 text-center">
          <SectionLabel>
            <Sparkles className="h-3.5 w-3.5" /> {t("about.coretech.label")}
          </SectionLabel>
          <h2 className="mt-2 font-display text-2xl font-extrabold text-ink-900 dark:text-white">
            {t("about.coretech.title")}
          </h2>
          <p className="mt-2 text-sm text-ink-500 dark:text-slate-400">
            {t("about.coretech.desc")}
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {technologies.map((tc) => (
            <Card
              key={tc.labelKey}
              className="group flex flex-col hover:-translate-y-1"
            >
              <div
                className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glass transition-transform group-hover:scale-110`}
              >
                <tc.icon className="h-7 w-7" />
              </div>
              <h3 className="font-display text-base font-bold text-ink-900 dark:text-white">
                {t(tc.labelKey)}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600 dark:text-slate-300">
                {t(tc.descKey)}
              </p>
              <ul className="mt-4 space-y-1.5">
                {tc.featuresKey.map((fKey) => (
                  <li
                    key={fKey}
                    className="flex items-center gap-2 text-xs text-ink-600 dark:text-slate-300"
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br from-brand-500 to-brand-600`}
                    />
                    {t(fKey)}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>

      {/* ── SDGs ─────────────────────────────────────────────────────────────── */}
      <div>
        <div className="mb-5 text-center">
          <SectionLabel>
            <Globe className="h-3.5 w-3.5" /> {t("sdgs.badge")}
          </SectionLabel>
          <h2 className="mt-2 font-display text-2xl font-extrabold text-ink-900 dark:text-white">
            {t("sdgs.title")}
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          {sdgs.map((s) => (
            <Card
              key={s.number}
              className="group overflow-hidden p-0 hover:-translate-y-1"
            >
              <div
                className={`relative flex h-28 items-center justify-center bg-gradient-to-br from-brand-500 to-brand-600`}
              >
                <div className="absolute inset-0 bg-grid-pattern bg-[size:20px_20px] opacity-20" />
                <span className="relative font-display text-6xl font-extrabold text-white/90 drop-shadow">
                  {s.number}
                </span>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-slate-800 dark:text-brand-400">
                    <s.icon className="h-4 w-4" />
                  </span>
                  <h3 className="font-display text-sm font-bold text-ink-900 dark:text-white">
                    {t(s.titleKey)}
                  </h3>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-ink-600 dark:text-slate-300">
                  {t(s.descKey)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* ── Team ─────────────────────────────────────────────────────────────── */}
      <div>
        <div className="mb-5 text-center">
          <SectionLabel>
            <Users className="h-3.5 w-3.5" /> {t("about.team.label")}
          </SectionLabel>
          <h2 className="mt-2 font-display text-2xl font-extrabold text-ink-900 dark:text-white">
            {t("about.team.title")}
          </h2>
          <p className="mt-2 text-sm text-ink-500 dark:text-slate-400">
            Research & Development Team · SMA Negeri 1 Ngoro, Mojokerto, East
            Java
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          {team.map((m) => (
            <Card
              key={m.initials}
              className="group flex flex-col items-center text-center hover:-translate-y-1"
            >
              <div className="relative">
                <span
                  className={`flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-600 font-display text-2xl font-extrabold text-white shadow-glass ring-4 ring-white/70 transition-transform group-hover:scale-110`}
                >
                  {m.initials}
                </span>
                <span className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-white text-brand-600 shadow-glass ring-1 ring-brand-100">
                  <m.icon className="h-4 w-4" strokeWidth={2} />
                </span>
              </div>
              <h3 className="mt-5 font-display text-base font-bold text-ink-900 dark:text-white">
                {m.name}
              </h3>
              <p className="mt-1 text-sm font-semibold text-brand-600">
                {t(m.roleKey)}
              </p>
              <p className="mt-0.5 text-xs text-ink-500 dark:text-slate-400">
                {t(m.subtitleKey)}
              </p>
              <p className="mt-3 text-xs leading-relaxed text-ink-500 dark:text-slate-400">
                {t(m.bioKey)}
              </p>
            </Card>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2.5 rounded-2xl border border-brand-100 bg-brand-50/60 py-4 px-6 dark:border-brand-900/40 dark:bg-slate-800/40">
          <MapPin className="h-4 w-4 text-brand-500" />
          <p className="text-sm font-medium text-ink-600 dark:text-slate-300">
            {t("about.footer")}
          </p>
        </div>
      </div>
    </section>
  );
}

export default AboutSection;
