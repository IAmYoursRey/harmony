import { Gauge, Brain, Target, Timer, CalendarCheck, TrendingUp, Trophy, Zap, Award, ShieldCheck, Users, CloudLightning, Route, GraduationCap, AlertTriangle, CheckCircle2, Sparkles, Download, BarChart3, PieChart as PieIcon, FileText, ArrowUpRight, Shield, Lightbulb, Medal, MapPin, School, Map, X, Activity, type LucideIcon } from 'lucide-react';
import { Donut, RadarChart, Sparkline, BarChart, GroupedBarChart, PieChart, DonutChart } from '@/components/dashboard/Charts';
import { SmartReadinessIndex, calculateReadinessIndex } from '@/components/SmartReadinessIndex';
import { motion } from 'framer-motion';
import { RadarChart as RechartsRadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useI18n } from '@/context/I18nContext';
import { useSchool } from '@/context/SchoolContext';
import { useToast } from '@/context/ToastContext';
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getAllProfiles, type UserProfile } from '@/data/userProfiles';
import { getAllAccounts, type UserAccount } from '@/data/accounts';
import { getAllSchools } from '@/services/schoolService';
import type { School as SchoolData } from '@/data/schoolsTypes';


// --- Merged from GSSView.tsx ---

const metrics = [
  { icon: Brain, label: 'Knowledge', value: 88, color: 'hsl(var(--brand-600))', desc: 'Quiz and lesson mastery' },
  { icon: Target, label: 'Decision Accuracy', value: 82, color: '#0ea5e9', desc: 'Correct simulation choices' },
  { icon: Timer, label: 'Response Time', value: 76, color: '#22d3ee', desc: 'Speed of decisions' },
  { icon: CalendarCheck, label: 'Learning Consistency', value: 90, color: '#10b981', desc: 'Daily streak strength' },
  { icon: TrendingUp, label: 'Improvement Index', value: 85, color: '#8b5cf6', desc: 'Growth over time' },
];

const milestones = [
  { icon: Zap, label: 'First Simulation', done: true, date: 'Mar 2' },
  { icon: Trophy, label: '5-Day Streak', done: true, date: 'Mar 8' },
  { icon: Award, label: 'Flood Certified', done: true, date: 'Mar 15' },
  { icon: Trophy, label: 'Top 10% Region', done: true, date: 'Mar 22' },
  { icon: Award, label: 'Disaster Ready', done: false, date: 'Target: Apr 5' },
];

const scoreHistory = [62, 65, 68, 72, 70, 75, 78, 80, 79, 82, 84, 86];

const readinessResult = calculateReadinessIndex({
  knowledge: 88,
  decisionAccuracy: 82,
  evacuationTime: 76,
  learningConsistency: 90,
  improvement: 85,
});

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`glass rounded-2xl p-5 transition-all hover:shadow-glass dark:bg-slate-900/60 ${className}`}>{children}</div>;
}

export function GSSView() {
  const { currentProfile } = useAuth();
  const { t } = useI18n();
  const hasPoints = currentProfile && currentProfile.totalPoints > 0;

  const displayScore = hasPoints ? 86 : 0;
  const displayHistory = hasPoints ? scoreHistory : [0];
  const displayMetrics = hasPoints ? metrics : metrics.map(m => ({ ...m, value: 0 }));
  const displayMilestones = hasPoints ? milestones : milestones.map(ms => ({ ...ms, done: false }));
  const displayReadiness = hasPoints ? readinessResult : calculateReadinessIndex({
    knowledge: 0,
    decisionAccuracy: 0,
    evacuationTime: 0,
    learningConsistency: 0,
    improvement: 0,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-6 text-white shadow-glass-lg sm:p-8">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:36px_36px] opacity-15" />
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
            <Gauge className="h-3.5 w-3.5" /> Your GeoSense Score
          </div>
          <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            Preparedness, measured
          </h2>
          <p className="mt-1.5 max-w-md text-sm text-brand-100">
            A composite score across five dimensions that tracks how ready you are for real
            disasters.
          </p>
        </div>
      </div>

      {/* Smart Readiness Index */}
      <SmartReadinessIndex result={displayReadiness} />

      {/* Radar + metric list */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h3 className="mb-4 font-display text-base font-bold text-ink-900 dark:text-white">Score Breakdown</h3>
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-around">
            <RadarChart
              data={displayMetrics.map((m) => ({ label: m.label.split(' ')[0], value: m.value }))}
              size={260}
            />
            <div className="space-y-3">
              {displayMetrics.map((m) => (
                <div key={m.label} className="flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
                    style={{ background: m.color }}
                  >
                    <m.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink-900 dark:text-white">{m.label}</p>
                    <p className="text-xs text-ink-500 dark:text-slate-400">{m.desc}</p>
                  </div>
                  <span className="ml-auto font-display text-lg font-extrabold" style={{ color: m.color }}>
                    {m.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="flex flex-col items-center text-center">
          <h3 className="mb-4 font-display text-base font-bold text-ink-900 dark:text-white">Overall GSS</h3>
          <Donut value={displayScore} size={170} stroke={15} label={displayScore.toString()} sublabel="GeoSense Score" />
          <div className="mt-4 flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:bg-brand-950/30">
            <TrendingUp className="h-3.5 w-3.5" /> {hasPoints ? '+24 points this month' : t('dashboard.no_score_yet', 'Belum ada skor')}
          </div>
          <p className="mt-3 text-xs text-ink-500 dark:text-slate-400">
            {hasPoints ? 'Level 4 · Resilient — top 10% in your region' : t('dashboard.not_started', 'Belum Dimulai')}
          </p>
        </Card>
      </div>

      {/* History + milestones */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h3 className="mb-4 font-display text-base font-bold text-ink-900 dark:text-white">Score History</h3>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="font-display text-2xl font-extrabold text-ink-900 dark:text-white">{displayScore}</p>
              <p className="text-xs text-ink-500 dark:text-slate-400">{hasPoints ? 'Current score · up from 62' : t('dashboard.no_score_data', 'Belum ada data skor')}</p>
            </div>
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-950/30">
              {hasPoints ? '+38%' : '0%'}
            </span>
          </div>
          <Sparkline data={displayHistory} height={80} />
          <p className="mt-2 text-xs text-ink-400 dark:text-slate-500">Last 12 weeks</p>
        </Card>

        <Card>
          <h3 className="mb-4 font-display text-base font-bold text-ink-900 dark:text-white">Milestones</h3>
          <div className="space-y-3">
            {displayMilestones.map((ms) => (
              <div key={ms.label} className="flex items-center gap-3">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                    ms.done ? 'bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400' : 'bg-brand-50 text-brand-400 dark:bg-slate-800 dark:text-slate-500'
                  }`}
                >
                  <ms.icon className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${ms.done ? 'text-ink-900 dark:text-white' : 'text-ink-400 dark:text-slate-500'}`}>
                    {ms.label}
                  </p>
                  <p className="text-xs text-ink-500 dark:text-slate-400">{ms.date}</p>
                </div>
                {ms.done && <Trophy className="h-4 w-4 text-brand-500" />}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}



// --- Merged from SchoolResilienceIndexView.tsx ---


// Helper to deterministically calculate a score for a school based on its ID
export function pseudoRandomScore(schoolId: string, baseOffset: number): number {
  let h = 0;
  for (let i = 0; i < schoolId.length; i++) {
    h = (h << 5) - h + schoolId.charCodeAt(i);
    h |= 0;
  }
  const pseudo = Math.abs(h % 40); // 0 to 39
  return Math.min(100, Math.max(0, 50 + baseOffset + (pseudo / 2))); // 50 to 90 + base
}



export function SchoolResilienceIndexView() {
  const { selection } = useSchool();
  const { t } = useI18n();
  const schoolId = selection?.school?.id || 'default';
  const schoolRisk = selection?.school?.risk || 'Moderate';

  // Compute stats deterministically based on school ID
  const baseOffset = schoolRisk === 'Low' ? 20 : schoolRisk === 'Moderate' ? 10 : 0;
  
  const gss = Math.floor(pseudoRandomScore(schoolId + 'gss', baseOffset));
  const learning = Math.floor(pseudoRandomScore(schoolId + 'lrn', baseOffset));
  const sim = Math.floor(pseudoRandomScore(schoolId + 'sim', baseOffset));
  const evac = Math.floor(pseudoRandomScore(schoolId + 'evac', baseOffset));
  const teacher = Math.floor(pseudoRandomScore(schoolId + 'tch', baseOffset));

  const radarData = [
    { subject: t('resilience.radar.gss'), value: gss },
    { subject: t('resilience.radar.learning'), value: learning },
    { subject: t('resilience.radar.sim'), value: sim },
    { subject: t('resilience.radar.evac'), value: evac },
    { subject: t('resilience.radar.teacher'), value: teacher },
  ];

  const metrics = [
    { icon: Brain, label: t('resilience.metric.gss'), value: gss, max: 100, unit: '/100', color: 'from-brand-500 to-brand-700', desc: t('resilience.metric.gss.desc') },
    { icon: Users, label: t('resilience.metric.learning'), value: learning, max: 100, unit: '%', color: 'from-brand-500 to-brand-600', desc: t('resilience.metric.learning.desc') },
    { icon: CloudLightning, label: t('resilience.metric.sim'), value: sim, max: 100, unit: '%', color: 'from-brand-500 to-brand-600', desc: t('resilience.metric.sim.desc') },
    { icon: Route, label: t('resilience.metric.evac'), value: evac, max: 100, unit: '%', color: 'from-brand-500 to-brand-600', desc: t('resilience.metric.evac.desc') },
    { icon: GraduationCap, label: t('resilience.metric.teacher'), value: teacher, max: 100, unit: '%', color: 'from-brand-500 to-brand-600', desc: t('resilience.metric.teacher.desc') },
  ];

  const avgScore = Math.floor((gss + learning + sim + evac + teacher) / 5);
  let category = t('resilience.cat.needs_work');
  let color = 'from-brand-300 to-brand-500';
  let bg = 'bg-brand-50 text-brand-700';

  if (avgScore >= 80) {
    category = t('resilience.cat.highly_resilient');
    color = 'from-brand-600 to-brand-800';
    bg = 'bg-brand-100 text-brand-800';
  } else if (avgScore >= 70) {
    category = t('resilience.cat.ready');
    color = 'from-brand-500 to-brand-700';
    bg = 'bg-brand-100 text-brand-700';
  } else if (avgScore >= 60) {
    category = t('resilience.cat.developing');
    color = 'from-brand-400 to-brand-600';
    bg = 'bg-brand-50 text-brand-600';
  }

  const overallCategory = {
    score: avgScore,
    category,
    color,
    bg: `${bg} dark:bg-opacity-20`,
  };

  const strengths = [
    { label: t('resilience.strength.learning', { score: learning, strength: learning >= 70 ? t('resilience.level.strong') : t('resilience.level.moderate') }), icon: TrendingUp },
    { label: t('resilience.strength.teacher', { score: teacher, strength: teacher >= 70 ? t('resilience.level.active') : t('resilience.level.developing') }), icon: GraduationCap },
    { label: t('resilience.strength.platform'), icon: CheckCircle2 },
  ];

  const improvements = [
    { label: t('resilience.imp.evac', { score: evac }), icon: AlertTriangle },
    { label: t('resilience.imp.sim', { score: sim }), icon: AlertTriangle },
    { label: t('resilience.imp.schedule'), icon: Route },
  ];
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-6 text-white shadow-glass-lg sm:p-8">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:36px_36px] opacity-15" />
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
            <ShieldCheck className="h-3.5 w-3.5" /> {t('nav.resilience')}
          </div>
          <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            {t('resilience.header.title')}
          </h2>
          <p className="mt-1.5 max-w-md text-sm text-brand-100">
            {t('resilience.header.desc')}
          </p>
        </div>
      </div>

      {/* Overall score + radar */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center text-center">
          <div className="relative flex h-40 w-40 items-center justify-center">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="70" fill="none" stroke="#e2e8f0" strokeWidth="12" className="dark:stroke-slate-700" />
              <motion.circle
                cx="80" cy="80" r="70" fill="none" stroke="url(#resilGrad)" strokeWidth="12" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 70}
                initial={{ strokeDashoffset: 2 * Math.PI * 70 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 70 - ((isNaN(overallCategory.score) ? 0 : overallCategory.score) / 100) * 2 * Math.PI * 70 }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
              />
              <defs>
                <linearGradient id="resilGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--brand-600))" />
                  <stop offset="100%" stopColor="#0ea5e9" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="font-display text-4xl font-extrabold text-ink-900 dark:text-white">{overallCategory.score}</span>
              <span className="text-xs text-ink-500 dark:text-slate-400">{t('resilience.score.out_of')}</span>
            </div>
          </div>
          <span className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold ${overallCategory.bg}`}>
            <Award className="h-4 w-4" /> {overallCategory.category}
          </span>
          <p className="mt-2 text-xs text-ink-500 dark:text-slate-400">{t('resilience.score.category')}</p>
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="mb-4 font-display text-base font-bold text-ink-900 dark:text-white">{t('resilience.chart.radar')}</h3>
          <ResponsiveContainer width="100%" height={280}>
            <RechartsRadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#64748b' }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
              <Radar name="Score" dataKey="value" stroke="hsl(var(--brand-600))" fill="hsl(var(--brand-600))" fillOpacity={0.3} strokeWidth={2} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
            </RechartsRadarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Card>
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${m.color} text-white shadow-glass`}>
                <m.icon className="h-5 w-5" />
              </span>
              <p className="mt-3 font-display text-2xl font-extrabold text-ink-900 dark:text-white">
                {m.value}<span className="text-sm text-ink-400 dark:text-slate-500">{m.unit}</span>
              </p>
              <p className="text-xs font-medium text-ink-600 dark:text-slate-300">{m.label}</p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-brand-50 dark:bg-slate-800">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(m.value / m.max) * 100}%` }}
                  transition={{ duration: 0.8, delay: i * 0.08 }}
                  className={`h-full rounded-full bg-gradient-to-r ${m.color}`}
                />
              </div>
              <p className="mt-1.5 text-[10px] text-ink-400 dark:text-slate-500">{m.desc}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Strengths + improvements */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            <h3 className="font-display text-base font-bold text-ink-900 dark:text-white">{t('resilience.section.strengths')}</h3>
          </div>
          <div className="space-y-3">
            {strengths.map((s) => (
              <div key={s.label} className="flex items-center gap-3 rounded-xl border border-brand-100 bg-brand-50/40 p-3 dark:border-brand-900/40 dark:bg-brand-950/20">
                <s.icon className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                <p className="text-sm text-ink-700 dark:text-slate-300">{s.label}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-brand-500 dark:text-brand-400" />
            <h3 className="font-display text-base font-bold text-ink-900 dark:text-white">{t('resilience.section.improvements')}</h3>
          </div>
          <div className="space-y-3">
            {improvements.map((im) => (
              <div key={im.label} className="flex items-center gap-3 rounded-xl border border-brand-100 bg-brand-50/40 p-3 dark:border-brand-900/40 dark:bg-brand-950/20">
                <im.icon className="h-4 w-4 shrink-0 text-brand-500 dark:text-brand-400" />
                <p className="text-sm text-ink-700 dark:text-slate-300">{im.label}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* AI recommendations */}
      <Card className="relative overflow-hidden">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand-100/50 blur-2xl" />
        <div className="relative">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-600" />
            <h3 className="font-display text-base font-bold text-ink-900 dark:text-white">{t('resilience.ai.title')}</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: Route, titleKey: 'resilience.ai.rec1.title', detailKey: 'resilience.ai.rec1.desc', accent: 'from-brand-500 to-brand-700' },
              { icon: CloudLightning, titleKey: 'resilience.ai.rec2.title', detailKey: 'resilience.ai.rec2.desc', accent: 'from-brand-500 to-brand-600' },
              { icon: GraduationCap, titleKey: 'resilience.ai.rec3.title', detailKey: 'resilience.ai.rec3.desc', accent: 'from-brand-400 to-brand-500' },
            ].map((r) => (
              <div key={r.titleKey} className="group flex items-start gap-3 rounded-xl border border-brand-50 p-4 transition-colors hover:bg-brand-50/60 dark:border-slate-800 dark:hover:bg-slate-800/60">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${r.accent} text-white`}>
                  <r.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink-900 dark:text-white">{t(r.titleKey)}</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-500 dark:text-slate-400">{t(r.detailKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}



// --- Merged from SurveyAnalyticsView.tsx ---

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



// --- Merged from LeaderboardView.tsx ---

type Tab = 'school' | 'regency' | 'province';

export function LeaderboardView() {
  const { t } = useI18n();
  const { currentProfile, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('school');

  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState<SchoolData[]>([]);

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      setLoading(true);
      try {
        const [profs, accs, schs] = await Promise.all([getAllProfiles(), getAllAccounts(), getAllSchools()]);
        if (!cancelled) {
          setProfiles(profs);
          setAccounts(accs);
          setSchools(schs || []);
        }
      } catch (err) {
        console.error("Failed to load leaderboard data", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadData();
    return () => { cancelled = true; };
  }, []);

  const leaderboardData: LeaderboardEntry[] = useMemo(() => {
    if (loading) return [];
    
    const userSchool = schools.find(s => s.id === currentProfile?.schoolId);
    
    // Default values if school not found
    const currentSchoolId = currentProfile?.schoolId || 'unknown';
    const currentRegency = userSchool?.regency || 'Kabupaten Mojokerto';
    const currentProvince = userSchool?.province || 'Jawa Timur';

    let filteredProfiles = profiles;

    if (activeTab === 'school') {
      filteredProfiles = profiles.filter(p => p.schoolId === currentSchoolId);
    } else if (activeTab === 'regency') {
      filteredProfiles = profiles.filter(p => {
        const s = schools.find(sch => sch.id === p.schoolId);
        return s?.regency === currentRegency;
      });
    } else if (activeTab === 'province') {
      filteredProfiles = profiles.filter(p => {
        const s = schools.find(sch => sch.id === p.schoolId);
        return s?.province === currentProvince;
      });
    }

    // Map to display format and sort
    const mapped = filteredProfiles.map(p => {
      const acc = accounts.find(a => a.id === p.userId);
      const s = schools.find(sch => sch.id === p.schoolId);
      return {
        id: p.userId,
        name: acc?.name || 'Pengguna',
        avatar: p.avatar,
        totalPoints: p.totalPoints,
        schoolName: s?.name || p.schoolId,
        isCurrentUser: p.userId === currentProfile?.userId,
        grade: p.grade,
        classSection: p.classSection,
        badges: p.badges || []
      };
    });

    mapped.sort((a, b) => b.totalPoints - a.totalPoints);
    return mapped.slice(0, 10); // Top 10
  }, [activeTab, currentProfile]);

  return (
    <>
    <div className="glass rounded-2xl p-5 dark:bg-slate-900/60 mt-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h3 className="font-display text-lg font-bold text-ink-900 dark:text-white flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Papan Peringkat
          </h3>
          <p className="text-sm text-ink-500 dark:text-slate-400 mt-1">
            Top 10 pahlawan tangguh bencana terbaik
          </p>
        </div>

        {/* Tabs */}
        <div className="flex bg-brand-50 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('school')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'school'
                ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-sm'
                : 'text-ink-500 hover:text-ink-700 dark:text-slate-400'
            }`}
          >
            <School className="h-4 w-4" /> Sekolah
          </button>
          <button
            onClick={() => setActiveTab('regency')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'regency'
                ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-sm'
                : 'text-ink-500 hover:text-ink-700 dark:text-slate-400'
            }`}
          >
            <MapPin className="h-4 w-4" /> Kab/Kota
          </button>
          <button
            onClick={() => setActiveTab('province')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'province'
                ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-sm'
                : 'text-ink-500 hover:text-ink-700 dark:text-slate-400'
            }`}
          >
            <Map className="h-4 w-4" /> Provinsi
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {leaderboardData.length === 0 ? (
          <div className="py-8 text-center text-sm font-medium text-ink-500 dark:text-slate-400">
            {t('survey.no_data', 'Belum ada data untuk kategori ini.')}
          </div>
        ) : (
          leaderboardData.map((user, index) => (
            <button
              key={user.id}
              onClick={() => setSelectedUser(user.id)}
              className={`w-full text-left flex items-center gap-4 p-3 rounded-xl border transition-all ${
                user.isCurrentUser
                  ? 'border-brand-500 bg-brand-50/50 dark:border-brand-500/50 dark:bg-brand-900/20 shadow-sm hover:bg-brand-50 dark:hover:bg-brand-900/40'
                  : 'border-brand-100/50 bg-white/40 dark:border-slate-800 dark:bg-slate-800/40 hover:bg-white/80 dark:hover:bg-slate-800/80'
              }`}
            >
              <div className="w-8 shrink-0 text-center flex justify-center">
                {index === 0 ? <Trophy className="h-6 w-6 text-amber-500 drop-shadow-sm" /> :
                 index === 1 ? <Medal className="h-6 w-6 text-slate-400 drop-shadow-sm" /> :
                 index === 2 ? <Medal className="h-6 w-6 text-orange-600 drop-shadow-sm" /> :
                 <span className="font-bold text-ink-400 dark:text-slate-500">#{index + 1}</span>}
              </div>
              
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-brand-100 to-brand-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center font-bold text-brand-700 dark:text-brand-300">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  user.name.substring(0, 2).toUpperCase()
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm text-ink-900 dark:text-white truncate">
                    {user.name}
                  </p>
                  {user.isCurrentUser && (
                    <span className="text-[10px] font-bold bg-brand-500 text-white px-2 py-0.5 rounded-full">
                      Anda
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-500 dark:text-slate-400 truncate">
                  {user.schoolName}
                </p>
              </div>

              <div className="text-right shrink-0">
                <p className="font-display font-extrabold text-brand-600 dark:text-brand-400">
                  {user.totalPoints} <span className="text-xs font-medium text-ink-500">pts</span>
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
    
    {/* Public Profile Modal */}
    {selectedUser && (
      <LeaderboardProfileModal 
        userId={selectedUser} 
        onClose={() => setSelectedUser(null)} 
        leaderboardData={leaderboardData}
      />
    )}
    </>
  );
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  avatar?: string;
  totalPoints: number;
  schoolName: string;
  isCurrentUser: boolean;
  grade: 'X' | 'XI' | 'XII';
  classSection: string;
  badges: string[];
}

function LeaderboardProfileModal({ userId, onClose, leaderboardData }: { userId: string, onClose: () => void, leaderboardData: LeaderboardEntry[] }) {
  const user = leaderboardData.find(u => u.id === userId);
  
  if (!user) return null;
  
  const initials = user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
  

  // Mock radar data based on total points
  const radarData = [
    { subject: 'Pengetahuan', A: Math.min(100, 40 + (user.totalPoints % 60)) },
    { subject: 'Respons', A: Math.min(100, 50 + (user.totalPoints % 50)) },
    { subject: 'Logika', A: Math.min(100, 60 + (user.totalPoints % 40)) },
    { subject: 'Persiapan', A: Math.min(100, 30 + (user.totalPoints % 70)) },
    { subject: 'Konsistensi', A: Math.min(100, 70 + (user.totalPoints % 30)) },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-900/40 p-4 backdrop-blur-sm sm:p-6" onClick={onClose}>
      <div 
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Cover Photo */}
        <div className="h-32 bg-gradient-to-br from-brand-500 to-brand-700 relative">
          <div className="absolute inset-0 bg-grid-pattern bg-[size:24px_24px] opacity-20" />
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 h-8 w-8 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center text-white transition-colors backdrop-blur-sm"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <div className="px-6 pb-6 pt-0 relative">
          {/* Avatar */}
          <div className="flex justify-between items-end -mt-12 mb-4 relative z-10">
            <div className="h-24 w-24 rounded-full border-4 border-white dark:border-slate-900 bg-gradient-to-br from-brand-100 to-brand-300 dark:from-slate-700 dark:to-slate-800 shadow-sm flex items-center justify-center overflow-hidden">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-brand-700 dark:text-brand-300">{initials}</span>
              )}
            </div>
            
            <div className="pb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                <Trophy className="h-3.5 w-3.5" /> {user.totalPoints} PTS
              </span>
            </div>
          </div>
          
          {/* Info */}
          <div>
            <h2 className="text-xl font-bold text-ink-900 dark:text-white flex items-center gap-2">
              {user.name}
              {user.totalPoints >= 1000 && <BadgeCheck />}
            </h2>
            <div className="mt-1 flex flex-wrap gap-2 text-sm text-ink-500 dark:text-slate-400">
              <span className="flex items-center gap-1"><School className="h-3.5 w-3.5" /> {user.schoolName}</span>
              <span className="flex items-center gap-1">&bull; Kelas {user.grade} {user.classSection}</span>
            </div>
          </div>
          
          <div className="mt-6 border-t border-brand-50 pt-6 dark:border-slate-800 space-y-6">
            
            {/* Radar & Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="h-32 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex flex-col items-center justify-center p-2 relative overflow-hidden">
                <p className="absolute top-2 left-3 text-[10px] font-bold text-ink-400 uppercase tracking-wider">Skill Radar</p>
                <div className="w-full h-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsRadarChart cx="50%" cy="50%" outerRadius="60%" data={radarData}>
                      <PolarGrid stroke="currentColor" className="text-brand-200 dark:text-slate-700" />
                      <Radar name="Skor" dataKey="A" stroke="hsl(var(--brand-500))" fill="hsl(var(--brand-500))" fillOpacity={0.4} />
                    </RechartsRadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="bg-brand-50 dark:bg-brand-500/10 p-3 rounded-xl">
                  <p className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider mb-1">Status</p>
                  <p className="text-sm font-semibold text-ink-900 dark:text-white flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-brand-500" /> Aktif Belajar
                  </p>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Badges</p>
                  <div className="flex gap-1.5 flex-wrap">
                    <div className="h-6 w-6 rounded-full bg-amber-100 flex items-center justify-center" title="Pemula"><Shield className="h-3 w-3 text-amber-600" /></div>
                    {user.totalPoints >= 500 && <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center" title="Konsisten"><Award className="h-3 w-3 text-blue-600" /></div>}
                    {user.totalPoints >= 1000 && <div className="h-6 w-6 rounded-full bg-brand-100 flex items-center justify-center" title="Master"><Target className="h-3 w-3 text-brand-600" /></div>}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Chart */}
            <div>
              <p className="text-xs font-bold text-ink-900 dark:text-white mb-3 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-brand-500" /> Aktivitas 7 Hari Terakhir
              </p>
              <div className="flex h-24 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-sm text-slate-400">Belum ada data aktivitas</span>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}

// BadgeCheck icon since it's missing from import sometimes, inline it just in case
function BadgeCheck() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-500">
      <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

