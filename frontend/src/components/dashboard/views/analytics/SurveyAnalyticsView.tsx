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

// Survey data is now fetched from the backend via /api/surveys.
// See: frontend/src/services/surveyService.ts

export function SurveyAnalyticsView() {
  const { show } = useToast();
  const { t } = useI18n();
  const { selection } = useSchool();

  const [surveyStats, setSurveyStats] = useState<SurveyStats | null>(null);
  const [surveyLoading, setSurveyLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setSurveyLoading(true);
      try {
        const data = await getSurveyStats(selection?.school.id);
        if (!cancelled) setSurveyStats(data.stats);
      } catch {
        if (!cancelled) setSurveyStats(null);
      } finally {
        if (!cancelled) setSurveyLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [selection?.school.id]);

  const hasData = surveyStats && surveyStats.totalRespondents > 0;

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

      {surveyLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      ) : !hasData ? (
        /* Empty state — no survey data submitted yet */
        <div className="glass rounded-2xl p-8 text-center dark:bg-slate-900/60">
          <BarChart3 className="mx-auto h-12 w-12 text-brand-300 dark:text-brand-700 mb-4" />
          <h3 className="text-lg font-bold text-ink-900 dark:text-white mb-2">{t('survey.empty.title') || 'Belum Ada Data Survei'}</h3>
          <p className="text-sm text-ink-500 dark:text-slate-400">
            {t('survey.empty.desc') || 'Survei akan tersedia setelah siswa mengumpulkan respons untuk sekolah ini.'}
          </p>
        </div>
      ) : (
        /* Summary stats from real data */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Users, label: t('survey.stat.respondents'), value: String(surveyStats!.totalRespondents), sub: t('survey.stat.respondents.sub') },
            { icon: TrendingUp, label: t('survey.stat.avg'), value: `${surveyStats!.averageScore}%`, sub: t('survey.stat.avg.sub') },
            { icon: GraduationCap, label: t('survey.stat.comp'), value: `${surveyStats!.completionRate}%`, sub: t('survey.stat.comp.sub') },
            { icon: FileText, label: t('survey.stat.surveys'), value: String(surveyStats!.totalSurveys), sub: t('survey.stat.surveys.sub') },
          ].map((s) => (
            <Card key={s.label}>
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl text-brand-600 bg-brand-100">
                  <s.icon className="h-5 w-5" />
                </span>
                <ArrowUpRight className="h-4 w-4 text-brand-500" />
              </div>
              <p className="mt-3 font-display text-2xl font-extrabold text-ink-900 dark:text-white">{s.value}</p>
              <p className="text-xs text-ink-500 dark:text-slate-400">{s.label}</p>
              <p className="mt-1 text-[11px] font-medium text-brand-600 dark:text-brand-400">{s.sub}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}



// --- Merged from LeaderboardView.tsx ---
