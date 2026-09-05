import {
  Users,
  TrendingUp,
  Download,
  BarChart3,
  PieChart as PieIcon,
  GraduationCap,
  FileText,
  ArrowUpRight,
  Sparkles,
  Shield,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';
import { useI18n } from '@/context/I18nContext';
import { useToast } from '@/context/ToastContext';
import { BarChart, GroupedBarChart, PieChart, RadarChart, DonutChart } from '@/components/dashboard/Charts';

const topicData = [
  { labelKey: 'risk.earthquake', value: 78 },
  { labelKey: 'risk.flood', value: 92 },
  { labelKey: 'risk.tsunami', value: 65 },
  { labelKey: 'risk.landslide', value: 58 },
  { labelKey: 'risk.volcanic', value: 48 },
  { labelKey: 'risk.fire', value: 84 },
];

const prePostData = [
  { labelKey: 'risk.earthquake', pre: 42, post: 78 },
  { labelKey: 'risk.flood', pre: 50, post: 92 },
  { labelKey: 'risk.tsunami', pre: 35, post: 65 },
  { labelKey: 'risk.fire', pre: 48, post: 84 },
];

const pieData = [
  { labelKey: 'survey.pie.beginner', value: 145, color: 'hsl(var(--brand-400))' },
  { labelKey: 'survey.pie.intermediate', value: 98, color: 'hsl(var(--brand-600))' },
  { labelKey: 'survey.pie.advanced', value: 57, color: 'hsl(var(--brand-700))' },
];

const radarData = [
  { labelKey: 'risk.earthquake', value: 78 },
  { labelKey: 'risk.flood', value: 92 },
  { labelKey: 'risk.tsunami', value: 65 },
  { labelKey: 'risk.volcanic', value: 48 },
  { labelKey: 'risk.landslide', value: 58 },
  { labelKey: 'risk.fire', value: 84 },
];

const donutData = [
  { labelKey: 'survey.donut.prepared', value: 72, color: 'hsl(var(--brand-600))' },
  { labelKey: 'survey.donut.inprogress', value: 18, color: 'hsl(var(--brand-400))' },
  { labelKey: 'survey.donut.needswork', value: 10, color: 'hsl(var(--brand-100))' },
];

const riskDistribution = [
  { labelKey: 'risk.earthquake', value: 35, color: 'hsl(var(--brand-400))' },
  { labelKey: 'risk.flood', value: 28, color: 'hsl(var(--brand-500))' },
  { labelKey: 'risk.landslide', value: 18, color: 'hsl(var(--brand-600))' },
  { labelKey: 'risk.volcanic', value: 12, color: 'hsl(var(--brand-700))' },
  { labelKey: 'risk.fire', value: 7, color: 'hsl(var(--brand-300))' },
];

const summaryStats = [
  { icon: Users, labelKey: 'survey.stat.respondents', value: '300', changeKey: 'survey.stat.respondents.sub' },
  { icon: TrendingUp, labelKey: 'survey.stat.avg', value: '74%', changeKey: 'survey.stat.avg.sub' },
  { icon: GraduationCap, labelKey: 'survey.stat.comp', value: '88%', changeKey: 'survey.stat.comp.sub' },
  { icon: FileText, labelKey: 'survey.stat.surveys', value: '24', changeKey: 'survey.stat.surveys.sub' },
];

const recommendations = [
  {
    icon: AlertTriangle,
    titleKey: 'survey.rec1.title',
    detailKey: 'survey.rec1.detail',
    accent: 'from-brand-500 to-brand-700',
  },
  {
    icon: TrendingUp,
    titleKey: 'survey.rec2.title',
    detailKey: 'survey.rec2.detail',
    accent: 'from-brand-500 to-brand-600',
  },
  {
    icon: Lightbulb,
    titleKey: 'survey.rec3.title',
    detailKey: 'survey.rec3.detail',
    accent: 'from-brand-400 to-brand-500',
  },
];

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`glass rounded-2xl p-5 transition-all hover:shadow-glass ${className}`}>{children}</div>;
}

export function SurveyAnalyticsView() {
  const { show } = useToast();
  const { t } = useI18n();

  // Map data with translations
  const mappedTopicData = topicData.map(d => ({ ...d, label: t(d.labelKey) }));
  const mappedPrePostData = prePostData.map(d => ({ ...d, label: t(d.labelKey) }));
  const mappedPieData = pieData.map(d => ({ ...d, label: t(d.labelKey) }));
  const mappedRadarData = radarData.map(d => ({ ...d, label: t(d.labelKey) }));
  const mappedDonutData = donutData.map(d => ({ ...d, label: t(d.labelKey) }));
  const mappedRiskDistribution = riskDistribution.map(d => ({ ...d, label: t(d.labelKey) }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-6 text-white shadow-glass-lg sm:p-8">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:36px_36px] opacity-15" />
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              <BarChart3 className="h-3.5 w-3.5" /> {t('nav.survey')}
            </div>
            <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              {t('survey.header.title')}
            </h2>
            <p className="mt-1.5 max-w-md text-sm text-brand-100">
              {t('survey.header.desc')}
            </p>
          </div>
          <button onClick={() => show(t('survey.header.download_msg'), 'info')} className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-brand-700 shadow-glass transition-all hover:-translate-y-0.5 hover:shadow-glow">
            <Download className="h-4 w-4" /> {t('survey.header.download')}
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryStats.map((s) => (
          <Card key={s.labelKey}>
            <div className="flex items-center justify-between">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-brand-600 bg-brand-100`}>
                <s.icon className="h-5 w-5" />
              </span>
              <ArrowUpRight className="h-4 w-4 text-brand-500" />
            </div>
            <p className="mt-3 font-display text-2xl font-extrabold text-ink-900 dark:text-white">{s.value}</p>
            <p className="text-xs text-ink-500 dark:text-slate-400">{t(s.labelKey)}</p>
            <p className="mt-1 text-[11px] font-medium text-brand-600 dark:text-brand-400">{t(s.changeKey)}</p>
          </Card>
        ))}
      </div>

      {/* School Preparedness Index (Donut) + Risk Distribution (Pie) */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-brand-600" />
            <h3 className="font-display text-base font-bold text-ink-900 dark:text-white">{t('survey.chart.preparedness')}</h3>
          </div>
          <div className="flex items-center justify-center py-2">
            <DonutChart data={mappedDonutData} size={200} stroke={30} />
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <PieIcon className="h-5 w-5 text-brand-600" />
            <h3 className="font-display text-base font-bold text-ink-900 dark:text-white">{t('survey.chart.risk_dist')}</h3>
          </div>
          <div className="flex justify-center py-2">
            <PieChart data={mappedRiskDistribution} size={190} />
          </div>
        </Card>
      </div>

      {/* Bar chart + Radar chart */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-brand-600" />
            <h3 className="font-display text-base font-bold text-ink-900 dark:text-white">
              {t('survey.chart.avg_score')}
            </h3>
          </div>
          <BarChart data={mappedTopicData} height={150} />
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-600" />
            <h3 className="font-display text-base font-bold text-ink-900 dark:text-white">{t('survey.chart.radar')}</h3>
          </div>
          <RadarChart data={mappedRadarData} size={220} color="hsl(var(--brand-600))" />
        </Card>
      </div>

      {/* Pre-test vs Post-test */}
      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-brand-600" />
            <h3 className="font-display text-base font-bold text-ink-900 dark:text-white">
              {t('survey.chart.comparison')}
            </h3>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-[hsl(var(--brand-400))]" /> {t('survey.legend.pre')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-[hsl(var(--brand-700))]" /> {t('survey.legend.post')}
            </span>
          </div>
        </div>
        <GroupedBarChart data={mappedPrePostData} height={170} />
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          {[
            { label: t('survey.stat.avg_pre'), value: '44%', color: 'text-brand-600' },
            { label: t('survey.stat.avg_post'), value: '80%', color: 'text-brand-700' },
            { label: t('survey.stat.improvement'), value: '+36%', color: 'text-brand-600' },
            { label: t('survey.stat.pass_rate'), value: '88%', color: 'text-brand-600' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-brand-50/60 p-3 text-center">
              <p className={`font-display text-xl font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-ink-500 dark:text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Recommendation Summary */}
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand-600" />
          <h3 className="font-display text-base font-bold text-ink-900 dark:text-white">{t('survey.chart.rec_summary')}</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {recommendations.map((r) => (
            <div key={r.titleKey} className="group flex flex-col gap-3 rounded-xl border border-brand-50 p-4 transition-colors hover:bg-brand-50/60 dark:bg-slate-800/60">
              <span className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${r.accent} text-white shadow-glass`}>
                <r.icon className="h-5 w-5" />
              </span>
              <div>
                <h4 className="text-sm font-bold text-ink-900 dark:text-white">{t(r.titleKey)}</h4>
                <p className="mt-1 text-xs leading-relaxed text-ink-500 dark:text-slate-400">{t(r.detailKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default SurveyAnalyticsView;
