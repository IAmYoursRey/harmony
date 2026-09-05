import { motion } from 'framer-motion';
import { ShieldCheck, TrendingUp, Brain, Target, Clock, Activity, ArrowUp, Gauge } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';

export interface ReadinessFactors {
  knowledge: number;
  decisionAccuracy: number;
  evacuationTime: number;
  learningConsistency: number;
  improvement: number;
}

export interface ReadinessResult {
  score: number;
  previousScore: number;
  improvement: number;
  category: ReadinessCategory;
  breakdown: { label: string; value: number; weight: number; weighted: number; icon: typeof Brain }[];
}

export type ReadinessCategory = 'Very Ready' | 'Ready' | 'Needs Improvement' | 'Needs Assistance';

export function calculateReadinessIndex(f: ReadinessFactors): ReadinessResult {
  const breakdown = [
    { label: 'Knowledge', value: f.knowledge, weight: 0.25, icon: Brain },
    { label: 'Decision Accuracy', value: f.decisionAccuracy, weight: 0.25, icon: Target },
    { label: 'Evacuation Time', value: f.evacuationTime, weight: 0.20, icon: Clock },
    { label: 'Learning Consistency', value: f.learningConsistency, weight: 0.15, icon: Activity },
    { label: 'Improvement', value: f.improvement, weight: 0.15, icon: TrendingUp },
  ];

  const score = Math.round(
    breakdown.reduce((sum, b) => sum + b.value * b.weight, 0)
  );

  const previousScore = Math.max(0, score - Math.round(f.improvement * 0.3));
  const improvement = score - previousScore;

  let category: ReadinessCategory;
  if (score >= 85) category = 'Very Ready';
  else if (score >= 70) category = 'Ready';
  else if (score >= 50) category = 'Needs Improvement';
  else category = 'Needs Assistance';

  return {
    score,
    previousScore,
    improvement,
    category,
    breakdown: breakdown.map((b) => ({ ...b, weighted: Math.round(b.value * b.weight) })),
  };
}

const categoryStyles: Record<ReadinessCategory, { bg: string; text: string }> = {
  'Very Ready': { bg: 'bg-brand-100', text: 'text-brand-700', },
  Ready: { bg: 'bg-brand-100', text: 'text-brand-700', },
  'Needs Improvement': { bg: 'bg-brand-200', text: 'text-brand-800', },
  'Needs Assistance': { bg: 'bg-brand-300', text: 'text-brand-900', },
};

export function SmartReadinessIndex({ result }: { result: ReadinessResult }) {
  const { t } = useI18n();
  const style = categoryStyles[result.category];
  const circumference = 2 * Math.PI * 70;
  const safeScore = isNaN(result.score) ? 0 : result.score;
  const offset = circumference - (safeScore / 100) * circumference;

  const translateCategory = (cat: ReadinessCategory) => {
    switch (cat) {
      case 'Very Ready': return t('sri.cat.very_ready');
      case 'Ready': return t('sri.cat.ready');
      case 'Needs Improvement': return t('sri.cat.needs_imp');
      case 'Needs Assistance': return t('sri.cat.needs_ast');
      default: return cat;
    }
  };

  const translateFactor = (label: string) => {
    switch (label) {
      case 'Knowledge': return t('sri.factor.knowledge');
      case 'Decision Accuracy': return t('sri.factor.decision');
      case 'Evacuation Time': return t('sri.factor.evac_time');
      case 'Learning Consistency': return t('sri.factor.consistency');
      case 'Improvement': return t('sri.factor.improvement');
      default: return label;
    }
  };

  return (
    <div className="space-y-6">
      {/* Score display */}
      <div className="glass relative overflow-hidden rounded-2xl p-6 dark:bg-slate-900/60 sm:p-8">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-100/50 blur-3xl" />
        <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          {/* Progress ring */}
          <div className="relative flex h-44 w-44 items-center justify-center">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="70" fill="none" stroke="#e2e8f0" strokeWidth="12" className="dark:stroke-slate-700" />
              <motion.circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke="url(#scoreGrad)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
              />
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--brand-600))" />
                  <stop offset="100%" stopColor="#0ea5e9" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="font-display text-4xl font-extrabold text-ink-900 dark:text-white">
                {result.score}
              </span>
              <span className="text-xs font-medium text-ink-500 dark:text-slate-400">{t('sri.out_of')}</span>
            </div>
          </div>

          {/* Score info */}
          <div className="flex-1 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600 dark:bg-slate-800 dark:text-brand-400">
              <Gauge className="h-3.5 w-3.5" /> {t('sri.title')}
            </div>
            <h2 className="mt-3 font-display text-2xl font-extrabold text-ink-900 dark:text-white">
              {translateCategory(result.category)}
            </h2>
            <div className="mt-3 flex flex-wrap justify-center gap-3 sm:justify-start">
              <div className="rounded-xl bg-brand-50/60 px-4 py-2.5 dark:bg-slate-800/60">
                <p className="text-[10px] uppercase tracking-wider text-ink-400 dark:text-slate-500">{t('sri.prev')}</p>
                <p className="font-display text-lg font-bold text-ink-900 dark:text-white">{result.previousScore}</p>
              </div>
              <div className="rounded-xl bg-brand-50/60 px-4 py-2.5 dark:bg-slate-800/60">
                <p className="text-[10px] uppercase tracking-wider text-ink-400 dark:text-slate-500">{t('sri.current')}</p>
                <p className="font-display text-lg font-bold text-ink-900 dark:text-white">{result.score}</p>
              </div>
              <div className="rounded-xl bg-brand-50 px-4 py-2.5 dark:bg-brand-950/30">
                <p className="text-[10px] uppercase tracking-wider text-brand-600">{t('sri.improve')}</p>
                <p className="flex items-center gap-1 font-display text-lg font-bold text-brand-600">
                  <ArrowUp className="h-4 w-4" /> +{result.improvement}
                </p>
              </div>
            </div>
            <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ${style.bg} ${style.text}`}>
              <ShieldCheck className="h-4 w-4" /> {translateCategory(result.category)}
            </span>
          </div>
        </div>
      </div>

      {/* Factor breakdown */}
      <div className="glass rounded-2xl p-5 dark:bg-slate-900/60">
        <h3 className="mb-4 font-display text-base font-bold text-ink-900 dark:text-white">
          {t('sri.breakdown')}
        </h3>
        <div className="space-y-4">
          {result.breakdown.map((b, i) => (
            <motion.div
              key={b.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium text-ink-700 dark:text-slate-300">
                  <b.icon className="h-4 w-4 text-brand-500" />
                  {translateFactor(b.label)}
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-semibold text-ink-900 dark:text-white">{b.value}</span>
                  <span className="text-xs text-ink-400">× {b.weight}</span>
                  <span className="font-display font-bold text-brand-600">= {b.weighted}</span>
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-brand-50 dark:bg-slate-800">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${b.value}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-700"
                />
              </div>
            </motion.div>
          ))}
        </div>
        <div className="mt-4 rounded-xl bg-brand-50/60 p-4 text-xs text-ink-600 dark:bg-slate-800/60 dark:text-slate-300">
          <p className="font-semibold text-ink-900 dark:text-white">{t('sri.formula')}</p>
          <p className="mt-1">
            {t('sri.formula_desc')}
          </p>
        </div>
      </div>

      {/* Category scale */}
      <div className="glass rounded-2xl p-5 dark:bg-slate-900/60">
        <h3 className="mb-4 font-display text-base font-bold text-ink-900 dark:text-white">
          {t('sri.categories')}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: t('sri.cat.very_ready'), range: '85-100', color: 'bg-brand-600', active: result.category === 'Very Ready' },
            { label: t('sri.cat.ready'), range: '70-84', color: 'bg-brand-500', active: result.category === 'Ready' },
            { label: t('sri.cat.needs_imp'), range: '50-69', color: 'bg-brand-400', active: result.category === 'Needs Improvement' },
            { label: t('sri.cat.needs_ast'), range: '0-49', color: 'bg-brand-300', active: result.category === 'Needs Assistance' },
          ].map((c) => (
            <div
              key={c.label}
              className={`rounded-xl border p-4 transition-all ${
                c.active
                  ? 'border-brand-300 bg-brand-50/60 dark:border-slate-600 dark:bg-slate-800/60'
                  : 'border-brand-50 dark:border-slate-800'
              }`}
            >
              <span className={`inline-block h-3 w-3 rounded-full ${c.color}`} />
              <p className="mt-2 text-sm font-bold text-ink-900 dark:text-white">{c.label}</p>
              <p className="text-xs text-ink-500 dark:text-slate-400">{c.range}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SmartReadinessIndex;
