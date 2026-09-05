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

