import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Brain,
  Map,
  Boxes,
  CloudLightning,
  Gauge,
  GraduationCap,
  ShieldCheck,
  BarChart3,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";

interface FeatureCard {
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
  to: string;
}

const cards: FeatureCard[] = [
  {
    icon: Brain,
    titleKey: "features.card1.title",
    descKey: "features.card1.desc",
    to: "/app/ai-learning",
  },
  {
    icon: Map,
    titleKey: "features.card2.title",
    descKey: "features.card2.desc",
    to: "/app/geo-risk-map",
  },
  {
    icon: Boxes,
    titleKey: "features.card3.title",
    descKey: "features.card3.desc",
    to: "/app/digital-twin",
  },
  {
    icon: CloudLightning,
    titleKey: "features.card4.title",
    descKey: "features.card4.desc",
    to: "/app/simulation",
  },
  {
    icon: Gauge,
    titleKey: "features.card5.title",
    descKey: "features.card5.desc",
    to: "/app/gss",
  },
  {
    icon: GraduationCap,
    titleKey: "features.card6.title",
    descKey: "features.card6.desc",
    to: "/app/teacher",
  },
  {
    icon: ShieldCheck,
    titleKey: "features.card7.title",
    descKey: "features.card7.desc",
    to: "/app/resilience",
  },
  {
    icon: BarChart3,
    titleKey: "features.card8.title",
    descKey: "features.card8.desc",
    to: "/app/survey",
  },
];

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

export function FeatureCards() {
  const { t } = useI18n();
  return (
    <section className="relative py-16 sm:py-20">
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-10 max-w-2xl text-center"
        >
          <span className="text-sm font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
            {t("features.explore")}
          </span>
          <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
            {t("features.title")}
          </h2>
          <p className="mt-3 text-ink-600 dark:text-slate-300">
            {t("features.subtitle")}
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {cards.map((c) => (
            <motion.div key={c.titleKey} variants={item}>
              <Link to={c.to} className="group block h-full">
                <article
                  className={`glass group relative h-full overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-glass-lg group-hover:shadow-brand-300/40`}
                >
                  <div
                    className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-20`}
                  />
                  <div
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-glass transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}
                  >
                    <c.icon className="h-6 w-6" strokeWidth={2} />
                  </div>
                  <h3 className="mt-5 font-display text-base font-bold text-ink-900 dark:text-white">
                    {t(c.titleKey)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-slate-300">
                    {t(c.descKey)}
                  </p>
                  <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-brand-600 opacity-0 transition-all group-hover:opacity-100">
                    {t("common.open")}{" "}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </article>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
