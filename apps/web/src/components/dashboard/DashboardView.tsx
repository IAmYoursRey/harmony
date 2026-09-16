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
  Globe,
  type LucideIcon,
} from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  LineChart,
  RadarChart,
  DonutChart,
  Sparkline,
  ProgressRing,
} from "@/components/dashboard/Charts";
import { TeamSection } from "@/components/TeamSection";
import { LeaderboardView } from "./views/AnalyticsViews";
import { useSchool } from "@/hooks/useSchool";

import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";

function getDashboardData(userId: string, baseScore: number, profile: any) {
  const today = new Date();
  const weeklyLearning = [];
  const sparkData = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const label = d.toLocaleDateString("en-US", { weekday: "short" });
    const ph = profile?.pointsHistory?.find((h: any) => h.date === dateStr);
    weeklyLearning.push({ label, value: ph ? ph.points : 0 });
  }

  const ph = profile?.pointsHistory || [];
  for (let i = Math.max(0, ph.length - 10); i < ph.length; i++) {
    sparkData.push(ph[i].points);
  }
  while (sparkData.length < 10) {
    sparkData.unshift(0);
  }

  const radarData = [
    {
      label: "Gempa Bumi",
      value: profile?.topicScores?.["Gempa Bumi"]?.averageScore || 0,
    },
    {
      label: "Banjir",
      value: profile?.topicScores?.["Banjir"]?.averageScore || 0,
    },
    {
      label: "Tsunami",
      value: profile?.topicScores?.["Tsunami"]?.averageScore || 0,
    },
    {
      label: "Kebakaran",
      value: profile?.topicScores?.["Kebakaran"]?.averageScore || 0,
    },
    {
      label: "Tanah Longsor",
      value: profile?.topicScores?.["Tanah Longsor"]?.averageScore || 0,
    },
    {
      label: "Puting Beliung",
      value: profile?.topicScores?.["Angin Puting Beliung"]?.averageScore || 0,
    },
  ];

  const mainTopics = [
    "Gempa Bumi",
    "Banjir",
    "Tsunami",
    "Kebakaran",
    "Tanah Longsor",
    "Angin Puting Beliung",
  ];
  let prepared = 0,
    inProgress = 0,
    needsWork = 0;
  let totalScore = 0;
  let attempted = 0;
  mainTopics.forEach((t) => {
    const score = profile?.topicScores?.[t]?.averageScore;
    if (score !== undefined) {
      attempted++;
      totalScore += score;
    }
    if (score === undefined || score < 60) needsWork++;
    else if (score >= 80) prepared++;
    else inProgress++;
  });

  const avgProgress = attempted > 0 ? Math.round(totalScore / attempted) : 0;

  const donutData = [
    { label: "Prepared", value: prepared, color: "hsl(var(--brand-600))" },
    { label: "In Progress", value: inProgress, color: "hsl(var(--brand-400))" },
    { label: "Needs Work", value: needsWork, color: "hsl(var(--brand-100))" },
  ];

  const modulesCompleted = Object.keys(profile?.topicScores || {}).length;

  const activities = (profile?.activities || []).map((a: any) => ({
    title: a.title,
    status: a.status,
    icon: a.type === "quiz" ? BookOpen : Play,
    accent:
      a.type === "quiz"
        ? "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
        : "bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400",
  }));

  return {
    weeklyLearning,
    radarData,
    donutData,
    sparkData,
    stats: [
      {
        icon: BookOpen,
        label: "Modules Completed",
        value: modulesCompleted.toString(),
        sub: modulesCompleted > 0 ? "Active" : "No activity yet",
        color: "from-brand-500 to-brand-700",
        bg: "bg-brand-100 text-brand-600 dark:bg-slate-800 dark:text-brand-400",
      },
      {
        icon: TrendingUp,
        label: "Learning Progress",
        value: `${avgProgress}%`,
        sub: avgProgress > 0 ? "In Progress" : "Not started",
        color: "from-brand-500 to-brand-600",
        bg: "bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400",
      },
      {
        icon: Globe,
        label: "Geospatial Awareness",
        value: `${baseScore}%`,
        sub: "Real-time Map Data",
        color: "from-brand-500 to-brand-600",
        bg: "bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400",
      },
      {
        icon: Zap,
        label: "Preparedness Score",
        value: `${baseScore}`,
        sub: baseScore > 0 ? "Resilient" : "No Data",
        color: "from-brand-500 to-brand-600",
        bg: "bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400",
      },
      {
        icon: Award,
        label: "Certificates",
        value: (profile?.badges?.length || 0).toString(),
        sub: "Earned",
        color: "from-brand-500 to-brand-600",
        bg: "bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400",
      },
    ],
    activities,
    badges:
      profile?.badges?.map((b: any) => ({
        icon: Shield,
        label: b,
        color: "from-brand-500 to-brand-600",
      })) || [],
  };
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`glass rounded-2xl p-5 transition-all hover:shadow-glass ${className}`}
    >
      {children}
    </div>
  );
}

function SectionTitle({
  children,
  action,
  to,
}: {
  children: React.ReactNode;
  action?: string;
  to?: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="font-display text-base font-bold text-ink-900 dark:text-white">
        {children}
      </h3>
      {action && to ? (
        <Link
          to={to}
          className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
        >
          {action}
        </Link>
      ) : action ? (
        <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">
          {action}
        </span>
      ) : null}
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
      <path
        d="M100 20 L150 40 L150 90 Q150 120 100 140 Q50 120 50 90 L50 40 Z"
        fill="url(#wG1)"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeOpacity="0.4"
      />
      {/* Checkmark */}
      <path
        d="M75 80 L92 100 L130 60"
        fill="none"
        stroke="#ffffff"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.9"
      />
      {/* Pulse dots */}
      <circle
        cx="100"
        cy="80"
        r="55"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1"
        strokeOpacity="0.15"
        strokeDasharray="4 4"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 100 80"
          to="360 100 80"
          dur="14s"
          repeatCount="indefinite"
        />
      </circle>
      <circle cx="155" cy="80" r="5" fill="#ffffff" fillOpacity="0.6">
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 100 80"
          to="360 100 80"
          dur="14s"
          repeatCount="indefinite"
        />
      </circle>
      <circle cx="45" cy="80" r="4" fill="#ffffff" fillOpacity="0.5">
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="180 100 80"
          to="540 100 80"
          dur="14s"
          repeatCount="indefinite"
        />
      </circle>
      {/* Stars */}
      {[
        { x: 60, y: 30 },
        { x: 140, y: 35 },
        { x: 155, y: 110 },
        { x: 50, y: 105 },
      ].map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="2"
          fill="#ffffff"
          fillOpacity="0.4"
        />
      ))}
    </svg>
  );
}

export function DashboardView() {
  const { selection } = useSchool();
  const { t } = useI18n();
  const { currentUser, currentProfile } = useAuth();

  const baseOffset = 0;

  const uid = currentUser?.id || "default";

  const hasPoints = currentProfile && currentProfile.totalPoints > 0;
  const currentScore = hasPoints
    ? Math.min(100, Math.floor(currentProfile.totalPoints / 100) + baseOffset)
    : 0;

  const hist = currentProfile?.pointsHistory || [];
  const previousScore =
    hist.length > 1
      ? Math.min(
          100,
          Math.floor(hist[hist.length - 2].points / 100) + baseOffset,
        )
      : hist.length === 1
        ? currentScore
        : 0;
  const improvement = currentScore - previousScore;
  const improvementPct =
    previousScore > 0
      ? Math.round((improvement / previousScore) * 100)
      : currentScore > 0
        ? 100
        : 0;

  const d = useMemo(
    () => getDashboardData(uid, currentScore, currentProfile),
    [uid, currentScore, currentProfile],
  );

  return (
    <div className="space-y-6">
      {/* ── Welcome Card ────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-6 text-white shadow-glass-lg sm:p-8">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:36px_36px] opacity-15" />
        <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 right-32 h-40 w-40 rounded-full bg-brand-400/20 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6">
          {/* Top Header: Avatar + Text + Illustration */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-white/30 to-white/10 text-2xl font-extrabold backdrop-blur-md ring-1 ring-white/20">
                {currentUser?.name?.substring(0, 2).toUpperCase() || "GS"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                  <Sparkles className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {currentUser?.role === "developer"
                      ? "Developer"
                      : currentUser?.role === "teacher"
                        ? "Guru"
                        : t("dashboard.student_researcher")}
                  </span>
                </div>
                <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight uppercase sm:text-3xl truncate">
                  {currentUser?.name || "Pengguna"}
                </h2>
                <p className="mt-1 text-sm text-brand-200 truncate">
                  {currentUser?.role === "developer"
                    ? t("role.developer", "Developer")
                    : currentUser?.role === "teacher"
                      ? t("role.teacher", "Teacher")
                      : t("role.student", "Student")}{" "}
                  &bull;{" "}
                  {currentProfile?.schoolId &&
                  currentProfile.schoolId !== "unknown"
                    ? selection?.school?.name || currentProfile.schoolId
                    : "Wilayah Indonesia"}
                </p>
              </div>
            </div>

            {/* Illustration */}
            <div className="hidden shrink-0 lg:block">
              <WelcomeIllustration />
            </div>
          </div>

          {/* Score badges */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2.5 rounded-xl bg-white/10 px-4 py-2.5 backdrop-blur-sm ring-1 ring-white/15">
              <Zap className="h-5 w-5 text-brand-300 shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-brand-200">
                  {t("dashboard.score")}
                </p>
                <p className="font-display text-lg font-extrabold">
                  {currentScore}
                  <span className="text-sm text-brand-300">/100</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl bg-white/10 px-4 py-2.5 backdrop-blur-sm ring-1 ring-white/15">
              <TrendingUp className="h-5 w-5 text-brand-300 shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-brand-200">
                  {t("dashboard.previous_score")}
                </p>
                <p className="font-display text-lg font-extrabold">
                  {previousScore}
                  <span className="text-sm text-brand-300">/100</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl bg-brand-400/20 px-4 py-2.5 backdrop-blur-sm ring-1 ring-brand-300/30">
              <TrendingUp className="h-5 w-5 text-brand-300 shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-brand-200">
                  {t("dashboard.improvement_label")}
                </p>
                <p className="font-display text-lg font-extrabold">
                  +{improvement}{" "}
                  <span className="text-sm text-brand-300">
                    {improvementPct}%
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl bg-white/10 px-4 py-2.5 backdrop-blur-sm ring-1 ring-white/15">
              <Shield className="h-5 w-5 text-brand-300 shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-brand-200">
                  {t("dashboard.preparedness")}
                </p>
                <p className="font-display text-lg font-extrabold">
                  {hasPoints
                    ? t("dashboard.highly_resilient", "Highly Resilient")
                    : t("dashboard.not_started", "Belum Dimulai")}
                </p>
              </div>
            </div>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-wrap gap-2.5">
            <Link
              to="/app/maps"
              className="inline-flex items-center gap-2 rounded-full bg-brand-500 border border-white/20 px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5 hover:bg-brand-400"
            >
              <Globe className="h-4 w-4 shrink-0" /> Peta Bencana Real-time
            </Link>
            <Link
              to="/app/simulation/join"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
            >
              <Play className="h-4 w-4 fill-white shrink-0" /> Join Session
            </Link>
            <Link
              to="/app/simulation"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 transition-all hover:-translate-y-0.5 hover:shadow-glow"
            >
              <Play className="h-4 w-4 fill-brand-600 text-brand-600 shrink-0" />{" "}
              {t("dashboard.start_simulation")}
            </Link>
            <Link
              to="/app/ai-learning"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
            >
              {t("dashboard.continue_learning")}{" "}
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Score Improvement Card ─────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-5 dark:bg-slate-900/60">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-5">
            <ProgressRing
              value={currentScore}
              size={72}
              stroke={7}
              label={`${currentScore}`}
            />
            <div>
              <h3 className="font-display text-base font-bold text-ink-900 dark:text-white">
                Kesiapan Menghadapi Bencana
              </h3>
              <p className="text-sm text-ink-500 dark:text-slate-400">
                Skor Kesiapan Saat Ini: {currentScore}/100 · Skor Sebelumnya: {previousScore}/100
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700 dark:bg-brand-950/40 dark:text-brand-400">
                  <TrendingUp className="h-3.5 w-3.5" /> +{improvement} points
                  (+{improvementPct}%)
                </span>
              </div>
            </div>
          </div>
          <Link
            to="/app/maps"
            className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-glass transition-all hover:bg-brand-700 hover:-translate-y-0.5"
          >
            <Globe className="h-4 w-4 text-white" /> Simulasi Geospasial
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
          <Card key={s.label} className="animate-fade-up">
            <div className="flex items-center justify-between">
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.bg}`}
              >
                <s.icon className="h-5 w-5" />
              </span>
              <TrendingUp className="h-4 w-4 text-brand-500" />
            </div>
            <p className="mt-3 font-display text-2xl font-extrabold text-ink-900 dark:text-white">
              {s.value}
            </p>
            <p className="text-xs text-ink-500 dark:text-slate-400">
              {s.label}
            </p>
            <p className="mt-1 text-[11px] font-medium text-brand-600">
              {s.sub}
            </p>
          </Card>
        ))}
      </div>

      {/* ── Charts row ──────────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Weekly Learning Progress — Line Chart */}
        <Card className="lg:col-span-1">
          <SectionTitle action="Peta Interaktif" to="/app/maps">
            Aktivitas Simulasi Mingguan
          </SectionTitle>
          <LineChart
            data={d.weeklyLearning}
            height={160}
            color="hsl(var(--brand-600))"
          />
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-ink-500 dark:text-slate-400">Minggu ini</span>
            <span className="flex items-center gap-1 font-semibold text-brand-600">
              <TrendingUp className="h-3.5 w-3.5" /> +18% dari minggu lalu
            </span>
          </div>
        </Card>

        {/* Disaster Knowledge — Radar Chart */}
        <Card className="lg:col-span-1">
          <SectionTitle action="Laporan Data" to="/app/gss">
            Pemahaman Kebencanaan Geospasial
          </SectionTitle>
          <RadarChart
            data={d.radarData}
            size={240}
            color="hsl(var(--brand-600))"
          />
        </Card>

        {/* Wilayah Preparedness — Donut Chart */}
        <Card className="lg:col-span-1">
          <SectionTitle action="Buka Peta" to="/app/maps">
            Kesiapan Wilayah
          </SectionTitle>
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
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-600">
                  Real-time Data
                </span>
                <h3 className="font-display text-sm font-bold text-ink-900 dark:text-white">
                  Pemantauan Geospasial
                </h3>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-ink-600 dark:text-slate-300">
              Berdasarkan pemantauan peta interaktif dan data sensor kebencanaan secara real-time, 
              kami menyarankan Anda untuk memantau zona <strong className="text-ink-900 dark:text-white">Rawan Gempa</strong> dan mempelajari rute <strong className="text-ink-900 dark:text-white">Evakuasi Tsunami</strong> di wilayah Anda.
            </p>
            <Link
              to="/app/maps"
              className="group mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-glass transition-all hover:-translate-y-0.5 hover:shadow-glow"
            >
              <Globe className="h-4 w-4" /> Buka Peta Sekarang
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </Card>

        {/* Recent Activities */}
        <Card className="lg:col-span-2">
          <SectionTitle action="Peta Utama" to="/app/maps">
            Aktivitas Mitigasi Terbaru
          </SectionTitle>
          <div className="space-y-3">
            {d.activities.length === 0 ? (
              <div className="py-6 text-center text-sm text-ink-500 dark:text-slate-400">
                Belum ada aktivitas mitigasi. Buka Peta Interaktif untuk memulai pantauan wilayah.
              </div>
            ) : (
              d.activities.map((a: any, i: number) => (
                <div
                  key={`${a.title}-${i}`}
                  className="group flex items-center gap-3 rounded-xl border border-brand-50 p-3 transition-colors hover:bg-brand-50/50 dark:hover:bg-slate-800/50"
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${a.accent}`}
                  >
                    <a.icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">
                      {a.title}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-brand-500" />
                    <span className="font-display text-sm font-bold text-brand-700">
                      {a.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* ── Achievements ────────────────────────────────────────────────────── */}
      <Card>
        <SectionTitle>Lencana Kesiagaan Wilayah</SectionTitle>
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
          {d.badges.map((b: any) => (
            <div
              key={b.label}
              className="group flex flex-col items-center gap-2.5 rounded-xl p-3 text-center transition-all hover:-translate-y-1"
            >
              <span
                className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${b.color} text-white shadow-glass transition-transform group-hover:scale-110`}
              >
                <b.icon className="h-7 w-7" />
              </span>
              <span className="text-[10px] font-semibold leading-tight text-ink-600 dark:text-slate-300">
                {b.label}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Trend sparkline ─────────────────────────────────────────────────── */}
      <Card>
        <SectionTitle action="Laporan Penuh" to="/app/gss">
          Tren Aktivitas Pemantauan
        </SectionTitle>
        <div className="flex items-end justify-between">
          <div>
            <p className="font-display text-2xl font-extrabold text-ink-900 dark:text-white">
              +42%
            </p>
            <p className="text-xs text-ink-500 dark:text-slate-400">
              Peningkatan aktivitas pemantauan dibanding bulan lalu
            </p>
          </div>
          <span className="hidden text-xs text-ink-400 sm:block">
            12 minggu terakhir
          </span>
        </div>
        <div className="mt-3">
          <Sparkline data={d.sparkData} />
        </div>
      </Card>
    </div>
  );
}

export default DashboardView;
