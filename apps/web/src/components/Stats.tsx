import { Reveal } from "@/components/Reveal";
import { useReveal } from "@/hooks/useReveal";

import { useI18n } from "@/hooks/useI18n";

interface Stat {
  value: number;
  suffix: string;
  labelEn: string;
  labelId: string;
}

const stats: Stat[] = [
  { value: 1200, suffix: "+", labelEn: "Schools", labelId: "Sekolah" },
  { value: 50000, suffix: "+", labelEn: "Students", labelId: "Siswa" },
  {
    value: 350,
    suffix: "+",
    labelEn: "Disaster Questions",
    labelId: "Pertanyaan Bencana",
  },
  {
    value: 98,
    suffix: "%",
    labelEn: "Preparedness Improvement",
    labelId: "Peningkatan Kesiapsiagaan",
  },
];

function StatCard({
  stat,
  index,
  locale,
}: {
  stat: Stat;
  index: number;
  locale: string;
}) {
  const { ref } = useReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className="reveal is-visible glass group h-full rounded-2xl p-6 text-center transition-all hover:-translate-y-1 hover:shadow-glass-lg"
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      <p className="font-display text-4xl font-extrabold text-brand-700 sm:text-5xl">
        {stat.value.toLocaleString()}
        <span className="text-brand-500 dark:text-brand-400">
          {stat.suffix}
        </span>
      </p>
      <p className="mt-2 text-sm font-medium text-ink-600 dark:text-slate-300">
        {locale === "id" ? stat.labelId : stat.labelEn}
      </p>
    </div>
  );
}

export function Stats() {
  const { locale } = useI18n();
  return (
    <section id="impact" className="relative scroll-mt-20 sm:scroll-mt-24 py-16 sm:py-20">
      <div className="section-container">
        <Reveal className="mx-auto mb-10 max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
            {locale === "id" ? "Dampak nyata" : "Real-world impact"}
          </span>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
            {locale === "id"
              ? "Dipercaya pendidik, dibangun untuk ketahanan"
              : "Trusted by educators, built for resilience"}
          </h2>
        </Reveal>
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {stats.map((s, i) => (
            <StatCard key={s.labelEn} stat={s} index={i} locale={locale} />
          ))}
        </div>
      </div>
    </section>
  );
}
