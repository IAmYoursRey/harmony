import { useEffect, useRef, useState } from "react";
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

function useCountUp(target: number, active: boolean, duration = 1600) {
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!active || startedRef.current) return;
    startedRef.current = true;

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);

  return value;
}

function StatCard({
  stat,
  index,
  locale,
}: {
  stat: Stat;
  index: number;
  locale: string;
}) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  const animated = useCountUp(stat.value, visible);

  return (
    <div
      ref={ref}
      className={`reveal glass group h-full rounded-2xl p-6 text-center transition-all hover:-translate-y-1 hover:shadow-glass-lg ${
        visible ? "is-visible" : ""
      }`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <p className="font-display text-4xl font-extrabold text-brand-700 sm:text-5xl">
        {animated.toLocaleString()}
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
    <section id="impact" className="relative py-16 sm:py-20">
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
