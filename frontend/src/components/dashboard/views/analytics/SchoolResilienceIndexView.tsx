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


// --- School Resilience Index View ---
// Real school-level resilience data requires a dedicated API endpoint (/api/analytics/resilience).
// Until that endpoint is implemented, this view shows an informational empty state
// rather than fake/pseudorandom statistics.

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`glass rounded-2xl p-5 transition-all hover:shadow-glass dark:bg-slate-900/60 ${className}`}>{children}</div>;
}

export function SchoolResilienceIndexView() {
  const { selection } = useSchool();
  const { t } = useI18n();

  // School-level resilience analytics require a dedicated backend endpoint
  // (/api/analytics/resilience) that has not yet been implemented.
  // Until real data is available, show an informational empty state.
  // DO NOT use pseudorandom/fake statistics — violates data integrity policy.
  const hasRealData = false;

  // Placeholder metric structure (all zeros) — only shown if hasRealData is true.
  const resilienceMetrics = [
    { icon: Brain, label: t('resilience.metric.gss'), value: 0, max: 100, unit: '/100', color: 'from-brand-500 to-brand-700', desc: t('resilience.metric.gss.desc') },
    { icon: Users, label: t('resilience.metric.learning'), value: 0, max: 100, unit: '%', color: 'from-brand-500 to-brand-600', desc: t('resilience.metric.learning.desc') },
    { icon: CloudLightning, label: t('resilience.metric.sim'), value: 0, max: 100, unit: '%', color: 'from-brand-500 to-brand-600', desc: t('resilience.metric.sim.desc') },
    { icon: Route, label: t('resilience.metric.evac'), value: 0, max: 100, unit: '%', color: 'from-brand-500 to-brand-600', desc: t('resilience.metric.evac.desc') },
    { icon: GraduationCap, label: t('resilience.metric.teacher'), value: 0, max: 100, unit: '%', color: 'from-brand-500 to-brand-600', desc: t('resilience.metric.teacher.desc') },
  ];

  void resilienceMetrics; // Reserved for when real API data is available
  void selection;

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

      {/* Data availability notice */}
      {!hasRealData && (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-900/20 mb-4">
            <ShieldCheck className="h-8 w-8 text-brand-400" aria-hidden="true" />
          </div>
          <h3 className="font-display text-lg font-bold text-ink-900 dark:text-white">
            Data Resiliensi Belum Tersedia
          </h3>
          <p className="mt-2 max-w-md text-sm text-ink-500 dark:text-slate-400">
            Statistik resiliensi sekolah akan muncul setelah siswa menyelesaikan simulasi dan survei.
            Data ini memerlukan pengumpulan dari aktivitas nyata di platform.
          </p>
          <p className="mt-3 text-xs text-ink-400 dark:text-slate-500 italic">
            Hubungi administrator untuk informasi lebih lanjut tentang pengaktifan fitur ini.
          </p>
        </Card>
      )}

      {/* AI recommendations — always visible as informational guidance */}
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




