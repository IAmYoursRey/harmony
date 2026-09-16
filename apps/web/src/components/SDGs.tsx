import { Reveal } from "@/components/Reveal";
import { useI18n } from "@/hooks/useI18n";

interface SDG {
  number: number;
  titleKey: string;
  descKey: string;
}

const sdgs: SDG[] = [
  {
    number: 4,
    titleKey: "sdgs.sdg4.title",
    descKey: "sdgs.sdg4.desc",
  },
  {
    number: 11,
    titleKey: "sdgs.sdg11.title",
    descKey: "sdgs.sdg11.desc",
  },
  {
    number: 13,
    titleKey: "sdgs.sdg13.title",
    descKey: "sdgs.sdg13.desc",
  },
];

export function SDGs() {
  const { t } = useI18n();
  return (
    <section id="sdgs" className="relative scroll-mt-20 sm:scroll-mt-24 py-20 sm:py-28">
      <div className="section-container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
            {t("sdgs.badge")}
          </span>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
            {t("sdgs.title")}
          </h2>
          <p className="mt-4 text-ink-600 dark:text-slate-300">
            {t("sdgs.subtitle")}
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sdgs.map((s, i) => (
            <Reveal key={s.number} delay={(i % 3) * 90} className="h-full">
              <article className="glass group h-full overflow-hidden rounded-2xl transition-all hover:-translate-y-1.5 hover:shadow-glass-lg">
                <div
                  className={`relative flex h-24 items-center justify-center bg-gradient-to-br from-brand-500 to-brand-600`}
                >
                  <span className="font-display text-5xl font-extrabold text-white/95 drop-shadow">
                    {s.number}
                  </span>
                  <div className="absolute inset-0 bg-grid-pattern bg-[size:20px_20px] opacity-20" />
                </div>
                <div className="p-5">
                  <h3 className="font-display text-sm font-bold leading-snug text-ink-900 dark:text-white">
                    {t(s.titleKey)}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-ink-600 dark:text-slate-300">
                    {t(s.descKey)}
                  </p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
