import {
  Code2,
  Palette,
  BarChart3,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";

interface TeamMember {
  initials: string;
  name: string;
  roleKey: string;
  subtitleKey: string;
  icon: LucideIcon;
}

const members: TeamMember[] = [
  {
    initials: "MD",
    name: "M. David Silva W.",
    roleKey: "Data & Research Analyst",
    subtitleKey: "Geospatial Data Collection",
    icon: BarChart3,
  },
  {
    initials: "AF",
    name: "Alvira Fitriatun Nizha",
    roleKey: "Project Leader & Ideator",
    subtitleKey: "Principal Coordinator",
    icon: Sparkles,
  },
  {
    initials: "RA",
    name: "Raihan Ansari",
    roleKey: "Lead Software Engineer",
    subtitleKey: "Full Stack & UI/UX Developer",
    icon: Code2,
  },
];

interface TeamSectionProps {
  heading?: string;
  variant?: "card" | "section";
}

export function TeamSection({ heading, variant = "card" }: TeamSectionProps) {
  const { t } = useI18n();
  const title = heading ?? t("about.team.title", "Tim Pengembang & Riset");

  if (variant === "section") {
    return (
      <section id="team" className="relative py-20 sm:py-28">
        <div className="section-container">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-semibold uppercase tracking-wider text-brand-600">
              {t("about.team.label", "Tim Kami")}
            </span>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
              {title}
            </h2>
            <p className="mt-4 text-ink-600 dark:text-slate-300">
              {t("about.team.desc", "Orang-orang di balik platform edukasi dan mitigasi bencana interaktif ini.")}
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((m, i) => (
              <article
                key={i}
                className="glass group flex flex-col items-center rounded-2xl p-7 text-center transition-all hover:-translate-y-1.5 hover:shadow-glass-lg"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="relative">
                  <span
                    className={`flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-600 font-display text-2xl font-extrabold text-white shadow-glass ring-4 ring-white/60 transition-transform group-hover:scale-110`}
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
                  {m.roleKey}
                </p>
                <p className="mt-0.5 text-xs text-ink-500 dark:text-slate-400">
                  {m.subtitleKey}
                </p>
              </article>
            ))}
          </div>

          <p className="mt-10 text-center text-sm font-medium text-ink-400 dark:text-slate-500">
            {t("about.team.footer", "Dikembangkan untuk meningkatkan kesadaran bencana di Indonesia")}
          </p>
        </div>
      </section>
    );
  }

  return (
    <div className="glass rounded-2xl p-5 transition-all hover:shadow-glass">
      <div className="mb-1 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-brand-600" />
        <h3 className="font-display text-base font-bold text-ink-900 dark:text-white">
          {title}
        </h3>
      </div>
      <p className="mb-5 text-xs text-ink-500 dark:text-slate-400">
        SMA Negeri 1 Ngoro · Mojokerto, Jawa Timur
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        {members.map((m, i) => (
          <div
            key={i}
            className="group flex flex-col items-center rounded-xl border border-brand-50 bg-white/40 p-4 text-center transition-all hover:-translate-y-1 hover:shadow-glass"
          >
            <div className="relative">
              <span
                className={`flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-600 font-display text-xl font-extrabold text-white shadow-glass ring-4 ring-white/70 transition-transform group-hover:scale-110`}
              >
                {m.initials}
              </span>
              <span className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-white text-brand-600 shadow-glass ring-1 ring-brand-100">
                <m.icon className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
            </div>
            <h4 className="mt-3 text-sm font-bold leading-tight text-ink-900 dark:text-white">
              {m.name}
            </h4>
            <p className="mt-1 text-xs font-semibold text-brand-600">
              {m.roleKey}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-500 dark:text-slate-400">
              {m.subtitleKey}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-5 text-center text-xs font-medium text-ink-400 dark:text-slate-500">
        {t("about.team.footer", "Dikembangkan untuk kesiapsiagaan bencana geospasial di Indonesia.")}
      </p>
    </div>
  );
}
