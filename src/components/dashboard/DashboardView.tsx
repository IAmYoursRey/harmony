import {
  ArrowRight,
  Sparkles,
  Trophy,
  Flame,
  Shield,
  Zap,
  Award,
  BookOpen,
  CloudRain,
  Mountain,
  Play,
  CheckCircle2,
  TrendingUp,
  Brain,
  Compass,
  Medal,
  Rocket,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { LineChart, RadarChart, DonutChart, Sparkline, ProgressRing } from '@/components/dashboard/Charts';
import { TeamSection } from '@/components/TeamSection';
import { LeaderboardView } from './views/AnalyticsViews';
import { useSchool } from '@/context/SchoolContext';
import { useI18n } from '@/context/I18nContext';
import { useAuth } from '@/context/AuthContext';

function getDashboardData(userId: string, baseScore: number) {
  const seed = userId + baseScore;
  const p = (str: string, max: number) => baseScore === 0 ? 0 : Math.floor(pseudoRandomScore(seed + str, 0) / 100 * max);
  
  if (baseScore === 0) {
    return {
      weeklyLearning: [
        { label: 'Mon', value: 0 }, { label: 'Tue', value: 0 }, { label: 'Wed', value: 0 },
        { label: 'Thu', value: 0 }, { label: 'Fri', value: 0 }, { label: 'Sat', value: 0 }, { label: 'Sun', value: 0 },
      ],
      radarData: [
        { label: 'Earthquake', value: 0 }, { label: 'Flood', value: 0 }, { label: 'Tsunami', value: 0 },
        { label: 'Volcano', value: 0 }, { label: 'Landslide', value: 0 }, { label: 'Fire', value: 0 },
      ],
      donutData: [
        { label: 'Prepared', value: 0, color: 'hsl(var(--brand-600))' },
        { label: 'In Progress', value: 0, color: 'hsl(var(--brand-400))' },
        { label: 'Needs Work', value: 100, color: 'hsl(var(--brand-100))' },
      ],
      sparkData: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      stats: [
        { icon: BookOpen, label: 'Modules Completed', value: '0', sub: 'No activity yet', color: 'from-brand-500 to-brand-700', bg: 'bg-brand-100 text-brand-600 dark:bg-slate-800 dark:text-brand-400' },
        { icon: TrendingUp, label: 'Learning Progress', value: '0%', sub: 'Not started', color: 'from-brand-500 to-brand-600', bg: 'bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400' },
        { icon: Shield, label: 'Risk Awareness', value: '0%', sub: 'No data', color: 'from-brand-500 to-brand-600', bg: 'bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400' },
      ],
      activities: [
        { icon: Mountain, title: 'Earthquake Simulation', status: '0%', accent: 'text-brand-600 bg-brand-100 dark:bg-brand-900/40 dark:text-brand-400' },
        { icon: CloudRain, title: 'Flood Module', status: 'Pending', accent: 'text-brand-600 bg-brand-100 dark:bg-brand-900/40 dark:text-brand-400' },
      ],
      badges: []
    };
  }

  return {
    weeklyLearning: [
      { label: 'Mon', value: p('w1', 100) },
      { label: 'Tue', value: p('w2', 100) },
      { label: 'Wed', value: p('w3', 100) },
      { label: 'Thu', value: p('w4', 100) },
      { label: 'Fri', value: p('w5', 100) },
      { label: 'Sat', value: p('w6', 100) },
      { label: 'Sun', value: p('w7', 100) },
    ],
    radarData: [
      { label: 'Earthquake', value: p('r1', 100) },
      { label: 'Flood', value: p('r2', 100) },
      { label: 'Tsunami', value: p('r3', 100) },
      { label: 'Volcano', value: p('r4', 100) },
      { label: 'Landslide', value: p('r5', 100) },
      { label: 'Fire', value: p('r6', 100) },
    ],
    donutData: [
      { label: 'Prepared', value: p('d1', 80) + 20, color: 'hsl(var(--brand-600))' },
      { label: 'In Progress', value: p('d2', 20), color: 'hsl(var(--brand-400))' },
      { label: 'Needs Work', value: p('d3', 10), color: 'hsl(var(--brand-100))' },
    ],
    sparkData: [p('s1',100), p('s2',100), p('s3',100), p('s4',100), p('s5',100), p('s6',100), p('s7',100), p('s8',100), p('s9',100), p('s10',100)],
    stats: [
      { icon: BookOpen, label: 'Modules Completed', value: `${p('st1', 50)}`, sub: `+${p('st1a', 10)} this month`, color: 'from-brand-500 to-brand-700', bg: 'bg-brand-100 text-brand-600 dark:bg-slate-800 dark:text-brand-400' },
      { icon: TrendingUp, label: 'Learning Progress', value: `${p('st2', 100)}%`, sub: 'On track', color: 'from-brand-500 to-brand-600', bg: 'bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400' },
      { icon: Shield, label: 'Risk Awareness', value: `${p('st3', 100)}%`, sub: 'Excellent', color: 'from-brand-500 to-brand-600', bg: 'bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400' },
      { icon: Zap, label: 'Preparedness Score', value: `${baseScore}`, sub: 'Highly Resilient', color: 'from-brand-500 to-brand-600', bg: 'bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400' },
      { icon: Award, label: 'Certificates', value: `${p('st5', 10)}`, sub: '2 pending', color: 'from-brand-500 to-brand-600', bg: 'bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400' },
    ],
    activities: [
      { icon: Mountain, title: 'Earthquake Simulation', status: `${p('a1', 100)}%`, accent: 'text-brand-600 bg-brand-100 dark:bg-brand-900/40 dark:text-brand-400' },
      { icon: CloudRain, title: 'Flood Module', status: 'Completed', accent: 'text-brand-600 bg-brand-100 dark:bg-brand-900/40 dark:text-brand-400' },
      { icon: Compass, title: 'Risk Mapping', status: 'Completed', accent: 'text-brand-600 bg-brand-100 dark:bg-brand-900/40 dark:text-brand-400' },
      { icon: Brain, title: 'Quiz', status: `${p('a2', 100)}%`, accent: 'text-brand-600 bg-brand-100 dark:bg-slate-800 dark:text-brand-400' },
    ],
    badges: [
      { icon: Shield, label: 'Disaster Ready', color: 'from-brand-500 to-brand-600' },
      { icon: Trophy, label: 'Top Learner', color: 'from-brand-400 to-brand-500' },
      { icon: Compass, label: 'Geo Explorer', color: 'from-brand-500 to-brand-700' },
      { icon: Brain, label: 'AI Explorer', color: 'from-brand-500 to-brand-600' },
      { icon: Flame, label: '100 Days Learning', color: 'from-brand-600 to-brand-800' },
      { icon: Medal, label: 'Research Contributor', color: 'from-brand-500 to-brand-600' },
    ].slice(0, p('bdg', 4) + 2)
  };
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`glass rounded-2xl p-5 transition-all hover:shadow-glass ${className}`}>{children}</div>;
}

function SectionTitle({ children, action, to }: { children: React.ReactNode; action?: string; to?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="font-display text-base font-bold text-ink-900 dark:text-white">{children}</h3>
      {action && to ? <Link to={to} className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">{action}</Link> : action ? <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">{action}</span> : null}
    </div>
  );
}

/* Welcome illustration */
function WelcomeIllustration() {
  return (
    <svg viewBox="0 0 200 160" className="w-full max-w-[200px]" aria-hidden>
      <defs>
        <linearGradient id="wG1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      {/* Shield outline */}
      <path d="M100 20 L150 40 L150 90 Q150 120 100 140 Q50 120 50 90 L50 40 Z" fill="url(#wG1)" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.4" />
      {/* Checkmark */}
      <path d="M75 80 L92 100 L130 60" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.9" />
      {/* Pulse dots */}
      <circle cx="100" cy="80" r="55" fill="none" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.15" strokeDasharray="4 4">
        <animateTransform attributeName="transform" type="rotate" from="0 100 80" to="360 100 80" dur="14s" repeatCount="indefinite" />
      </circle>
      <circle cx="155" cy="80" r="5" fill="#ffffff" fillOpacity="0.6">
        <animateTransform attributeName="transform" type="rotate" from="0 100 80" to="360 100 80" dur="14s" repeatCount="indefinite" />
      </circle>
      <circle cx="45" cy="80" r="4" fill="#ffffff" fillOpacity="0.5">
        <animateTransform attributeName="transform" type="rotate" from="180 100 80" to="540 100 80" dur="14s" repeatCount="indefinite" />
      </circle>
      {/* Stars */}
      {[{x:60,y:30}, {x:140,y:35}, {x:155,y:110}, {x:50,y:105}].map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2" fill="#ffffff" fillOpacity="0.4" />
      ))}
    </svg>
  );
}

import { pseudoRandomScore } from './views/AnalyticsViews';

export function DashboardView() {
  const { selection } = useSchool();
  const { t } = useI18n();
  const { currentUser, currentProfile } = useAuth();
  
  const schoolRisk = selection?.school?.risk || 'Moderate';
  const baseOffset = schoolRisk === 'Low' ? 20 : schoolRisk === 'Moderate' ? 10 : 0;
  
  const uid = currentUser?.id || 'default';
  // If they have points in their profile, compute from that. Otherwise use pseudo-random seeded by user ID.
  const currentScore = currentProfile?.totalPoints ? Math.min(100, Math.floor(currentProfile.totalPoints / 100) + baseOffset) : Math.floor(pseudoRandomScore(uid + 'gss', baseOffset));
  const previousScore = Math.max(0, currentScore - Math.floor(pseudoRandomScore(uid + 'prev', 0) / 4));
  const improvement = currentScore - previousScore;
  const improvementPct = previousScore > 0 ? Math.round((improvement / previousScore) * 100) : 0;

  const d = getDashboardData(uid, currentScore);

  return (
    <div className="space-y-6">
      {/* ── Welcome Card ────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-6 text-white shadow-glass-lg sm:p-8">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:36px_36px] opacity-15" />
        <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-16 right-32 h-40 w-40 rounded-full bg-brand-400/20 blur-2xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-white/30 to-white/10 text-2xl font-extrabold backdrop-blur-md ring-1 ring-white/20">
              {currentUser?.name?.substring(0, 2).toUpperCase() || 'GS'}
            </span>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5" /> {currentUser?.role === 'dev' ? 'Developer' : currentUser?.role === 'teacher' ? 'Guru' : t('dashboard.student_researcher')}
              </div>
              <p className="mt-2.5 text-sm font-medium text-brand-200">{t('dashboard.welcome')},</p>
              <h2 className="font-display text-2xl font-extrabold tracking-tight uppercase sm:text-3xl">
                {currentUser?.name || 'Pengguna'}
              </h2>
              <p className="mt-1 text-sm text-brand-200">
                {currentUser?.role === 'teacher' ? 'Guru' : t('dashboard.student')} · {currentProfile?.schoolId || 'SMA Negeri 1 Ngoro'}
              </p>

              {/* Score badges */}
              <div className="mt-4 flex flex-wrap gap-3">
                <div className="flex items-center gap-2.5 rounded-xl bg-white/10 px-4 py-2.5 backdrop-blur-sm ring-1 ring-white/15">
                  <Zap className="h-5 w-5 text-brand-300" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-brand-200">{t('dashboard.score')}</p>
                    <p className="font-display text-lg font-extrabold">{currentScore}<span className="text-sm text-brand-300">/100</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl bg-white/10 px-4 py-2.5 backdrop-blur-sm ring-1 ring-white/15">
                  <TrendingUp className="h-5 w-5 text-brand-300" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-brand-200">{t('dashboard.previous_score')}</p>
                    <p className="font-display text-lg font-extrabold">{previousScore}<span className="text-sm text-brand-300">/100</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl bg-brand-400/20 px-4 py-2.5 backdrop-blur-sm ring-1 ring-brand-300/30">
                  <TrendingUp className="h-5 w-5 text-brand-300" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-brand-200">{t('dashboard.improvement_label')}</p>
                    <p className="font-display text-lg font-extrabold">+{improvement} <span className="text-sm text-brand-300">({improvementPct}%)</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl bg-white/10 px-4 py-2.5 backdrop-blur-sm ring-1 ring-white/15">
                  <Shield className="h-5 w-5 text-brand-300" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-brand-200">{t('dashboard.preparedness')}</p>
                    <p className="font-display text-lg font-extrabold">Highly Resilient</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Illustration */}
          <div className="hidden shrink-0 sm:block">
            <WelcomeIllustration />
          </div>
        </div>

        {/* CTA buttons */}
        <div className="relative mt-5 flex flex-wrap gap-2.5">
          <Link to="/app/simulation" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 transition-all hover:-translate-y-0.5 hover:shadow-glow">
            <Play className="h-4 w-4 fill-brand-600 text-brand-600" /> {t('dashboard.start_simulation')}
          </Link>
          <Link to="/app/ai-learning" className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20">
            {t('dashboard.continue_learning')} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* ── Score Improvement Card ─────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-5 dark:bg-slate-900/60">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-5">
            <ProgressRing value={currentScore} size={72} stroke={7} label={`${currentScore}`} />
            <div>
              <h3 className="font-display text-base font-bold text-ink-900 dark:text-white">{t('dashboard.learning_progress')}</h3>
              <p className="text-sm text-ink-500 dark:text-slate-400">{t('dashboard.current_score')}: {currentScore}/100 · {t('dashboard.previous_score')}: {previousScore}/100</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700 dark:bg-brand-950/40 dark:text-brand-400">
                  <TrendingUp className="h-3.5 w-3.5" /> +{improvement} points (+{improvementPct}%)
                </span>
              </div>
            </div>
          </div>
          <Link to="/app/ai-learning" className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-glass transition-all hover:bg-brand-700 hover:-translate-y-0.5">
            <Play className="h-4 w-4 fill-white" /> {t('dashboard.continue_learning')}
          </Link>
        </div>
      </div>

      {/* ── Leaderboard ────────────────────────────────────────────────────── */}
      <LeaderboardView />

      {/* ── Research & Development Team ────────────────────────────────────── */}
      <TeamSection />

      {/* ── Quick Statistics ────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {d.stats.map((s, i) => (
          <Card key={s.label} className="animate-fade-up" >
            <div className="flex items-center justify-between">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.bg}`}>
                <s.icon className="h-5 w-5" />
              </span>
              <TrendingUp className="h-4 w-4 text-brand-500" />
            </div>
            <p className="mt-3 font-display text-2xl font-extrabold text-ink-900 dark:text-white">{s.value}</p>
            <p className="text-xs text-ink-500 dark:text-slate-400">{s.label}</p>
            <p className="mt-1 text-[11px] font-medium text-brand-600">{s.sub}</p>
          </Card>
        ))}
      </div>

      {/* ── Charts row ──────────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Weekly Learning Progress — Line Chart */}
        <Card className="lg:col-span-1">
          <SectionTitle action="Details" to="/app/ai-learning">Weekly Learning Progress</SectionTitle>
          <LineChart data={d.weeklyLearning} height={160} color="hsl(var(--brand-600))" />
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-ink-500 dark:text-slate-400">This week</span>
            <span className="flex items-center gap-1 font-semibold text-brand-600">
              <TrendingUp className="h-3.5 w-3.5" /> +18% vs last week
            </span>
          </div>
        </Card>

        {/* Disaster Knowledge — Radar Chart */}
        <Card className="lg:col-span-1">
          <SectionTitle action="Details" to="/app/gss">Disaster Knowledge</SectionTitle>
          <RadarChart data={d.radarData} size={240} color="hsl(var(--brand-600))" />
        </Card>

        {/* School Preparedness — Donut Chart */}
        <Card className="lg:col-span-1">
          <SectionTitle action="Details" to="/app/resilience">School Preparedness</SectionTitle>
          <div className="flex items-center justify-center py-2">
            <DonutChart data={d.donutData} size={180} stroke={28} />
          </div>
        </Card>
      </div>

      {/* ── AI Recommendation + Recent Activities ───────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* AI Recommendation */}
        <Card className="relative overflow-hidden lg:col-span-1">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand-100/50 blur-2xl" />
          <div className="relative">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glass">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-600">AI Powered</span>
                <h3 className="font-display text-sm font-bold text-ink-900 dark:text-white">GeoSense AI Recommendation</h3>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-ink-600 dark:text-slate-300">
              Based on your learning progress and your school's geospatial risk profile, we recommend completing the <strong className="text-ink-900 dark:text-white">Tsunami Simulation</strong> and <strong className="text-ink-900 dark:text-white">Earthquake Preparedness</strong> modules this week.
            </p>
            <Link
              to="/app/ai-learning"
              className="group mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-glass transition-all hover:-translate-y-0.5 hover:shadow-glow"
            >
              <Rocket className="h-4 w-4" /> Start Recommendation
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </Card>

        {/* Recent Activities */}
        <Card className="lg:col-span-2">
          <SectionTitle action="View all" to="/app/ai-learning">Recent Learning Activities</SectionTitle>
          <div className="space-y-3">
            {d.activities.map((a) => (
              <div key={a.title} className="group flex items-center gap-3 rounded-xl border border-brand-50 p-3 transition-colors hover:bg-brand-50/50 dark:hover:bg-slate-800/50">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${a.accent}`}>
                  <a.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{a.title}</p>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-brand-500" />
                  <span className="font-display text-sm font-bold text-brand-700">{a.status}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Achievements ────────────────────────────────────────────────────── */}
      <Card>
        <SectionTitle>Achievement Badges</SectionTitle>
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
          {d.badges.map((b) => (
            <div key={b.label} className="group flex flex-col items-center gap-2.5 rounded-xl p-3 text-center transition-all hover:-translate-y-1">
              <span className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${b.color} text-white shadow-glass transition-transform group-hover:scale-110`}>
                <b.icon className="h-7 w-7" />
              </span>
              <span className="text-[10px] font-semibold leading-tight text-ink-600 dark:text-slate-300">{b.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Trend sparkline ─────────────────────────────────────────────────── */}
      <Card>
        <SectionTitle action="Full report" to="/app/gss">Research Engagement Trend</SectionTitle>
        <div className="flex items-end justify-between">
          <div>
            <p className="font-display text-2xl font-extrabold text-ink-900 dark:text-white">+42%</p>
            <p className="text-xs text-ink-500 dark:text-slate-400">Engagement growth vs last month</p>
          </div>
          <span className="hidden text-xs text-ink-400 sm:block">Last 12 weeks</span>
        </div>
        <div className="mt-3"><Sparkline data={d.sparkData} /></div>
      </Card>
    </div>
  );
}

export default DashboardView;
