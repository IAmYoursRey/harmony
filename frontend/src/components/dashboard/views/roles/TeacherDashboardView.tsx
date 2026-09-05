import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getAllAccounts, updateAccount, hashPassword, type UserAccount } from '@/data/accounts';
import { getAllProfiles, updateProfile, type UserProfile, type Gender } from '@/data/userProfiles';
import {  useToast  } from '@/hooks/useToast';
import { Users, UserPlus, ShieldAlert, BookOpen, GraduationCap, Mail, Lock, User, School, Calendar, Download, Edit2, Check, X, MapPin, TrendingUp, TrendingDown, Award, Target, Brain, FileText, Sparkles, CheckCircle2, AlertTriangle, Clock, Plus, ChevronDown, Phone, Pencil, Bell, Globe, Shield, LogOut, Camera, Boxes, Satellite, Zap, Trophy, Compass, Flame, Medal, Save, type LucideIcon } from 'lucide-react';
import { getAllSchools, extractProvinces, extractRegencies } from '@/services/schoolService';
import type { School as SchoolData } from '@/data/schools';
import { motion, AnimatePresence } from 'framer-motion';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts';
import { useI18n } from '@/hooks/useI18n';
import { useNavigate } from 'react-router-dom';
import { useSchool } from '@/hooks/useSchool';
import { ProgressRing } from '@/components/dashboard/Charts';


// --- Merged from DevDashboardView.tsx ---


// --- Merged from TeacherDashboardView.tsx ---

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`glass rounded-2xl p-5 transition-all hover:shadow-glass dark:bg-slate-900/60 ${className}`}>{children}</div>;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-glass`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 font-display text-2xl font-extrabold text-ink-900 dark:text-white">{value}</p>
      <p className="text-xs text-ink-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-[11px] font-medium text-brand-600 truncate">{sub}</p>
    </Card>
  );
}

export function TeacherDashboardView() {
  const { t, locale, setLocale } = useI18n();
  const { currentProfile, refreshProfile } = useAuth();
  const [exporting, setExporting] = useState(false);

  const [selectedClassIdx, setSelectedClassIdx] = useState(0);
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [newGrade, setNewGrade] = useState<'X'|'XI'|'XII'>('X');
  const [newSection, setNewSection] = useState('');

  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingData(true);
      try {
        const [p, a] = await Promise.all([getAllProfiles(), getAllAccounts()]);
        if (!cancelled) {
          setProfiles(p);
          setAccounts(a);
        }
      } catch (err) {
        console.error("Failed to load class data", err);
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const supervisedClasses = currentProfile?.supervisedClasses || [];
  const selectedClass = supervisedClasses[selectedClassIdx];

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSection.trim() || !currentProfile) return;
    const updated = [...supervisedClasses, { grade: newGrade, section: newSection }];
    updateProfile({ supervisedClasses: updated });
    refreshProfile();
    setIsAddingClass(false);
    setNewSection('');
    setSelectedClassIdx(updated.length - 1);
  };

  const handleExport = (type: 'pdf' | 'excel') => {
    setExporting(true);
    setTimeout(() => setExporting(false), 1200);
    void type;
  };

  const dashboardData = useMemo(() => {
    if (!selectedClass || !currentProfile) return null;

    if (loadingData) return null;

    const allProfiles = profiles;
    const allAccounts = accounts;

    // Filter students
    const classStudents = allProfiles.filter(p => 
      p.schoolId === currentProfile.schoolId && 
      p.grade === selectedClass.grade && 
      p.classSection === selectedClass.section
    );

    // Map names and calculate scores
    const mappedStudents = classStudents.map(p => {
      const acc = allAccounts.find(a => a.id === p.userId);
      const scores = Object.values(p.topicScores);
      const avg = scores.length > 0 ? Math.round(scores.reduce((sum: number, s) => sum + s.averageScore, 0) / scores.length) : 0;
      
      // Simulate online status based on lastUpdated being within last 1 hour
      const lastActive = new Date(p.lastUpdated);
      const isOnline = (new Date().getTime() - lastActive.getTime()) < 3600000;

      return {
        id: p.userId,
        name: acc?.name || 'Siswa Tanpa Nama',
        totalPoints: p.totalPoints,
        averageScore: avg,
        isOnline
      };
    });

    mappedStudents.sort((a, b) => b.totalPoints - a.totalPoints);
    const topStudent = mappedStudents[0];
    const lowStudent = mappedStudents[mappedStudents.length - 1];
    const classAverage = mappedStudents.length > 0 ? Math.round(mappedStudents.reduce((sum: number, s) => sum + s.averageScore, 0) / mappedStudents.length) : 0;

    // Default mock data to fill charts if no students yet
    const fallbackRadar = [
      { subjectKey: 'disaster.earthquake', class: classAverage, individual: 0 },
      { subjectKey: 'disaster.flood', class: classAverage, individual: 0 },
      { subjectKey: 'disaster.tsunami', class: classAverage, individual: 0 },
      { subjectKey: 'disaster.volcano', class: classAverage, individual: 0 },
      { subjectKey: 'disaster.landslide', class: classAverage, individual: 0 },
      { subjectKey: 'disaster.fire', class: classAverage, individual: 0 },
    ];

    const fallbackBar = fallbackRadar.map(r => ({ nameKey: r.subjectKey, score: r.class }));

    return {
      students: mappedStudents,
      classAverage,
      topStudent,
      lowStudent,
      radarData: fallbackRadar,
      barData: fallbackBar,
    };
  }, [selectedClass, currentProfile]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-6 text-white shadow-glass-lg sm:p-8">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:36px_36px] opacity-15" />
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              <GraduationCap className="h-3.5 w-3.5" /> {t('nav.teacher')}
            </div>
            <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              {t('teacher.header.title')}
            </h2>
            <p className="mt-1.5 max-w-md text-sm text-brand-100">
              {t('teacher.header.desc')}
            </p>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={() => handleExport('pdf')}
              disabled={exporting || !dashboardData}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 shadow-glass transition-all hover:-translate-y-0.5 hover:shadow-glow disabled:opacity-60"
            >
              <FileText className="h-4 w-4" /> {exporting ? t('teacher.exporting') : t('teacher.export.pdf')}
            </button>
          </div>
        </div>

        {/* Class Selection & Management */}
        <div className="mt-6 border-t border-white/20 pt-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Pilih Kelas:</span>
            {supervisedClasses.length > 0 ? (
              <div className="relative">
                <select
                  value={selectedClassIdx}
                  onChange={(e) => setSelectedClassIdx(Number(e.target.value))}
                  className="appearance-none bg-white/20 border border-white/30 rounded-xl px-4 py-2 pr-10 text-sm font-bold text-white outline-none backdrop-blur-sm focus:bg-white/30"
                >
                  {supervisedClasses.map((c, i) => (
                    <option key={i} value={i} className="text-ink-900">
                      Kelas {c.grade} - Ruang {c.section}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" />
              </div>
            ) : (
              <span className="text-sm italic opacity-70">{t('teacher.no_classes', 'Belum ada kelas yang diawasi')}</span>
            )}
          </div>
          
          <button 
            onClick={() => setIsAddingClass(true)}
            className="flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/30 px-3 py-2 rounded-xl transition-all"
          >
            <Plus className="h-3.5 w-3.5" /> Tambah Kelas
          </button>
        </div>
      </div>

      {/* Add Class Modal / Form inline */}
      <AnimatePresence>
        {isAddingClass && (
          <motion.div 
            initial={{ opacity: 0, y: -10, height: 0 }} 
            animate={{ opacity: 1, y: 0, height: 'auto' }} 
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleAddClass} className="glass rounded-2xl p-5 border-l-4 border-l-brand-500 flex flex-col sm:flex-row items-end gap-4">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-bold text-ink-700 dark:text-slate-300">Tingkat Kelas</label>
                <select value={newGrade} onChange={e => setNewGrade(e.target.value as 'X'|'XI'|'XII')}
                  className="w-full rounded-xl border border-brand-100 bg-white py-2 pl-3 pr-8 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                  <option value="X">Kelas X</option>
                  <option value="XI">Kelas XI</option>
                  <option value="XII">Kelas XII</option>
                </select>
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-xs font-bold text-ink-700 dark:text-slate-300">Ruang/No. Kelas (Hanya Angka)</label>
                <input type="number" min="1" value={newSection} onChange={e => setNewSection(e.target.value)} placeholder="Contoh: 1" required
                  className="w-full rounded-xl border border-brand-100 bg-white py-2 pl-3 pr-4 text-sm outline-none focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button type="button" onClick={() => setIsAddingClass(false)} className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-sm font-bold border border-brand-200 text-brand-600 hover:bg-brand-50 dark:border-slate-700 dark:text-brand-400 dark:hover:bg-slate-800">
                  Batal
                </button>
                <button type="submit" className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-sm font-bold bg-brand-600 text-white shadow-md hover:bg-brand-700">
                  Simpan
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {!dashboardData ? (
        <Card className="flex h-40 items-center justify-center text-ink-500 italic">
          Silakan tambahkan atau pilih kelas terlebih dahulu untuk melihat statistik.
        </Card>
      ) : (
        <>
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Target} label="Rata-rata Pemahaman Kelas" value={dashboardData.classAverage + '%'} sub={`${dashboardData.students.length} Siswa Terdaftar`} accent="from-brand-500 to-brand-700" />
            <StatCard icon={Award} label={t('teacher.highest_in_class', 'Tertinggi di Kelas')} value={dashboardData.topStudent?.averageScore ? dashboardData.topStudent.averageScore + '%' : '-'} sub={dashboardData.topStudent?.name || t('teacher.no_data', 'Belum ada data')} accent="from-brand-500 to-brand-600" />
            <StatCard icon={TrendingDown} label={t('teacher.needs_attention', 'Perlu Perhatian Khusus')} value={dashboardData.lowStudent?.averageScore ? dashboardData.lowStudent.averageScore + '%' : '-'} sub={dashboardData.lowStudent?.name || t('teacher.no_data', 'Belum ada data')} accent="from-brand-500 to-brand-600" />
            <StatCard icon={Users} label="Siswa Aktif (Online)" value={dashboardData.students.filter(s => s.isOnline).length.toString()} sub="Sedang online saat ini" accent="from-brand-500 to-brand-600" />
          </div>

          {/* Student ranking */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-base font-bold text-ink-900 dark:text-white flex items-center gap-2">
                <Users className="h-4 w-4 text-brand-600" /> 
                Daftar Siswa — Kelas {selectedClass.grade} Ruang {selectedClass.section}
              </h3>
              <button onClick={() => setLocale(locale === 'id' ? 'en' : 'id')} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title={t('dashboard.language')}>
                <Globe className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold font-mono text-slate-600 dark:text-slate-400">{locale.toUpperCase()}</span>
              </button>
              <span className="text-xs font-semibold text-brand-600 bg-brand-50 dark:bg-brand-500/10 px-3 py-1 rounded-full">
                Total: {dashboardData.students.length} Siswa
              </span>
            </div>
            
            {dashboardData.students.length === 0 ? (
              <div className="py-8 text-center text-sm text-ink-500">
                {t('teacher.no_students_enrolled', 'Belum ada siswa yang mendaftar di kelas ini.')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-brand-50 text-left text-xs font-semibold uppercase tracking-wider text-ink-400 dark:border-slate-700 dark:text-slate-500">
                      <th className="pb-3 pr-4">Peringkat</th>
                      <th className="pb-3 pr-4">Nama Siswa</th>
                      <th className="pb-3 pr-4">Rata-rata Tes</th>
                      <th className="pb-3 pr-4">Total Poin</th>
                      <th className="pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.students.map((s, idx: number) => (
                      <tr
                        key={s.id}
                        className="border-b border-brand-50/50 transition-colors hover:bg-brand-50/40 dark:border-slate-800 dark:hover:bg-slate-800/40"
                      >
                        <td className="py-3 pr-4">
                          <span
                            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                              idx === 0
                                ? 'bg-amber-100 text-amber-700'
                                : idx === 1
                                  ? 'bg-slate-200 text-slate-700'
                                  : idx === 2
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-brand-50 text-brand-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-3 pr-4 font-semibold text-ink-900 dark:text-white">{s.name}</td>
                        <td className="py-3 pr-4">
                          <span className="font-display font-bold text-brand-700 dark:text-brand-400">{s.averageScore}%</span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="font-semibold">{s.totalPoints} pts</span>
                        </td>
                        <td className="py-3">
                          {s.isOnline ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span> Online
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-400">
                              <span className="h-2 w-2 rounded-full bg-ink-300"></span> Offline
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Charts row */}
          {dashboardData.students.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <h3 className="mb-4 font-display text-base font-bold text-ink-900 dark:text-white">
                  {t('teacher.chart.radar')}
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={dashboardData.radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subjectKey" tickFormatter={(v) => t(v)} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                    <Radar name={t('teacher.radar.class')} dataKey="class" stroke="hsl(var(--brand-400))" fill="hsl(var(--brand-400))" fillOpacity={0.3} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Tooltip labelFormatter={(v) => t(v as string)} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </Card>

              <Card>
                <h3 className="mb-4 font-display text-base font-bold text-ink-900 dark:text-white">
                  {t('teacher.chart.bar')}
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dashboardData.barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="nameKey" tickFormatter={(v) => t(v)} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip labelFormatter={(v) => t(v as string)} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                    <Bar dataKey="score" fill="hsl(var(--brand-600))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}


