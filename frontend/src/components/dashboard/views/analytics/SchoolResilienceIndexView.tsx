import { Gauge, Brain, Target, Timer, CalendarCheck, TrendingUp, Trophy, Zap, Award, ShieldCheck, Users, CloudLightning, Route, GraduationCap, AlertTriangle, CheckCircle2, Sparkles, Download, BarChart3, PieChart as PieIcon, FileText, ArrowUpRight, Shield, Lightbulb, Medal, MapPin, School, Map, X, Activity, Loader2, type LucideIcon } from 'lucide-react';
import { Donut, RadarChart, Sparkline, BarChart, GroupedBarChart, PieChart, DonutChart } from '@/components/dashboard/Charts';
import { SmartReadinessIndex, calculateReadinessIndex } from '@/components/SmartReadinessIndex';
import { motion } from 'framer-motion';
import { RadarChart as RechartsRadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useI18n } from '@/hooks/useI18n';
import { useSchool } from '@/hooks/useSchool';
import {  useToast  } from '@/hooks/useToast';
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getAllProfiles, type UserProfile } from '@/data/userProfiles';
import { getAllAccounts, type UserAccount } from '@/data/accounts';
import { getAllSchools } from '@/services/schoolService';
import type { School as SchoolData } from '@/data/schoolsTypes';
import { getSurveyStats, type SurveyStats } from '@/services/surveyService';


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

