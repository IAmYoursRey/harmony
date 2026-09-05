import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getAllAccounts, updateAccount, hashPassword, type UserAccount } from '@/data/accounts';
import { getAllProfiles, updateProfile, type UserProfile, type Gender } from '@/data/userProfiles';
import {  useToast  } from '@/hooks/useToast';
import { Users, UserPlus, ShieldAlert, BookOpen, GraduationCap, Mail, Lock, User, School, Calendar, Download, Edit2, Check, X, MapPin, TrendingUp, TrendingDown, Award, Target, Brain, FileText, Sparkles, CheckCircle2, AlertTriangle, Clock, Plus, ChevronDown, Phone, Pencil, Bell, Globe, Shield, LogOut, Camera, Boxes, Satellite, Zap, Trophy, Compass, Flame, Medal, Save, type LucideIcon } from 'lucide-react';
import { getAllSchools, extractProvinces, extractRegencies } from '@/services/schoolService';
import type { School as SchoolData } from '@/data/schools';
import { apiClient } from '@/services/apiClient';
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
  const { currentUser, currentProfile, refreshProfile } = useAuth();
  const [exporting, setExporting] = useState(false);

  const [selectedClassIdx, setSelectedClassIdx] = useState(0);
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newGrade, setNewGrade] = useState<'X'|'XI'|'XII'>('X');
  const [newSection, setNewSection] = useState('');
  const [newAcademicYear, setNewAcademicYear] = useState('2026/2027');

  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'classes'>('overview');
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
  const [regGender, setRegGender] = useState<Gender>('male');
  const [regClassId, setRegClassId] = useState('');

  const [classes, setClasses] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingData(true);
      try {
        const teacherClasses = classes.filter(c => c.teacherId === currentUser?.id);
        const selected = teacherClasses[selectedClassIdx];
        if (selected) {
          const qs = `?classId=${selected.id}`;
          const res = await apiClient.get('/api/analytics/class' + qs);
          if (!cancelled && res.success) {
            setAnalyticsData(res.data);
          }
        }
      } catch (err) {
        console.error("Failed to load class data", err);
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    };
    if (classes.length > 0) {
      load();
    } else {
      setLoadingData(false);
    }
    return () => { cancelled = true; };
  }, [selectedClassIdx, currentUser?.id, classes]);

  useEffect(() => {
    fetchUsersAndClasses();
  }, []);

  const fetchUsersAndClasses = async () => {
    try {
      const clsRes = await apiClient.get('/api/classes');
      if (clsRes.classes) setClasses(clsRes.classes);
      
      const usrRes = await apiClient.get('/api/users');
      if (usrRes.users) setAccounts(usrRes.users);
      if (usrRes.profiles) setProfiles(usrRes.profiles);
    } catch (error) {
      console.error('Failed to fetch data', error);
    }
  };

  const teacherClasses = classes.filter(c => c.teacherId === currentUser?.id);
  const selectedClass = teacherClasses[selectedClassIdx];

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || !newSection.trim() || !currentProfile) return;
    try {
      const res = await apiClient.post('/api/classes', {
        name: newClassName,
        grade: newGrade,
        section: newSection,
        academicYear: newAcademicYear
      });
      if (res.success) {
        setIsAddingClass(false);
        setNewClassName('');
        setNewSection('');
        fetchUsersAndClasses();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPassword) return;
    if (regPassword !== regPasswordConfirm) return;
    
    // We import provisionAccount locally or use apiClient.post('/api/users')
    try {
      const res = await apiClient.post('/api/users', {
        name: regName,
        email: regEmail,
        password: regPassword,
        role: 'student',
        gender: regGender,
        classId: regClassId // Save class reference
      });
      if (res.success) {
        setIsAddingStudent(false);
        setRegName('');
        setRegEmail('');
        setRegPassword('');
        setRegPasswordConfirm('');
        setRegClassId('');
        fetchUsersAndClasses();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExport = (type: 'pdf' | 'excel') => {
    setExporting(true);
    setTimeout(() => setExporting(false), 1200);
    void type;
  };

  const dashboardData = useMemo(() => {
    if (!selectedClass || !currentProfile || loadingData || !analyticsData) return null;

    const { overview, students } = analyticsData;

    // Simulate online status based on some mock logic for now since we don't have websocket here
    const mappedStudents = students.map((s: any) => ({
      id: s.id,
      name: s.name,
      totalPoints: s.averageScore * s.attempts, // Proxy total points
      averageScore: s.averageScore,
      isOnline: false // To be implemented via websockets in future
    }));

    mappedStudents.sort((a: any, b: any) => b.totalPoints - a.totalPoints);
    const topStudent = mappedStudents[0];
    const lowStudent = mappedStudents[mappedStudents.length - 1];
    const classAverage = overview.averageScore;

    // If the API returned no hazard breakdown, show empty state in charts (not fake values).
    const fallbackRadar: { subjectKey: string; class: number }[] = [];
    const fallbackBar: { nameKey: string; score: number }[] = [];

    return {
      students: mappedStudents,
      classAverage,
      topStudent,
      lowStudent,
      radarData: analyticsData.radarData || fallbackRadar,
      barData: analyticsData.barData || fallbackBar,
      overview
    };
  }, [selectedClass, currentProfile, analyticsData, loadingData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-6 text-white shadow-glass-lg sm:p-8">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:36px_36px] opacity-15" />
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              <GraduationCap aria-hidden="true" className="h-3.5 w-3.5" /> <span>{t('nav.teacher')}</span>
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

          {/* Navigation Tabs */}
          <div className="mt-6 flex border-b border-brand-700/50">
            <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 border-b-2 font-semibold text-sm transition-colors ${activeTab === 'overview' ? 'border-white text-white' : 'border-transparent text-white/60 hover:text-white/80'}`}>Overview & Analytics</button>
            <button onClick={() => setActiveTab('classes')} className={`px-4 py-2 border-b-2 font-semibold text-sm transition-colors ${activeTab === 'classes' ? 'border-white text-white' : 'border-transparent text-white/60 hover:text-white/80'}`}>Class Management</button>
            <button onClick={() => setActiveTab('students')} className={`px-4 py-2 border-b-2 font-semibold text-sm transition-colors ${activeTab === 'students' ? 'border-white text-white' : 'border-transparent text-white/60 hover:text-white/80'}`}>Student Management</button>
          </div>
        </div>
      {activeTab === 'classes' && (
        <div className="grid gap-6">
          <div className="flex items-center justify-between border-b border-brand-100 dark:border-slate-800 pb-4">
            <h3 className="font-bold text-ink-900 dark:text-white flex items-center gap-2">
              <School className="h-5 w-5 text-brand-600" /> Manajemen Kelas
            </h3>
            <button onClick={() => setIsAddingClass(true)} className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 shadow-sm">
              <Plus className="h-4 w-4" /> Buat Class
            </button>
          </div>

          <AnimatePresence>
            {isAddingClass && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <form onSubmit={handleAddClass} className="glass rounded-2xl p-5 border-l-4 border-brand-500 bg-white dark:bg-slate-900">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-ink-700 dark:text-slate-300">Nama Kelas</label>
                      <input value={newClassName} onChange={e => setNewClassName(e.target.value)} placeholder="Contoh: Geografi 10A" required className="w-full rounded-xl border border-brand-100 py-2.5 px-3 text-sm focus:ring-2 focus:ring-brand-100 dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-ink-700 dark:text-slate-300">Tingkat (Grade)</label>
                      <select value={newGrade} onChange={e => setNewGrade(e.target.value as 'X'|'XI'|'XII')} className="w-full rounded-xl border border-brand-100 py-2.5 px-3 text-sm focus:ring-2 focus:ring-brand-100 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                        <option value="X">Kelas X</option>
                        <option value="XI">Kelas XI</option>
                        <option value="XII">Kelas XII</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-ink-700 dark:text-slate-300">Ruang/Section</label>
                      <input value={newSection} onChange={e => setNewSection(e.target.value)} placeholder="Contoh: 1 / A" required className="w-full rounded-xl border border-brand-100 py-2.5 px-3 text-sm focus:ring-2 focus:ring-brand-100 dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-ink-700 dark:text-slate-300">Tahun Ajaran</label>
                      <input value={newAcademicYear} onChange={e => setNewAcademicYear(e.target.value)} placeholder="2026/2027" required className="w-full rounded-xl border border-brand-100 py-2.5 px-3 text-sm focus:ring-2 focus:ring-brand-100 dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setIsAddingClass(false)} className="px-4 py-2 text-sm font-bold bg-slate-100 text-ink-600 rounded-xl hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300">Batal</button>
                    <button type="submit" className="px-4 py-2 text-sm font-bold bg-brand-600 text-white rounded-xl shadow-sm hover:bg-brand-700">Simpan Kelas</button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {teacherClasses.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
              <School className="h-12 w-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-ink-900 dark:text-white">Belum ada Class</h3>
              <p className="text-sm text-ink-500 mb-4">Buat Class pertama Anda untuk memulai.</p>
              <button onClick={() => setIsAddingClass(true)} className="px-4 py-2 text-sm font-bold bg-brand-600 text-white rounded-xl">+ Buat Class</button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {teacherClasses.map(c => (
                <Card key={c.id} className="border-t-4 border-t-brand-500">
                  <h4 className="font-bold text-lg dark:text-white">{c.name}</h4>
                  <div className="mt-2 space-y-1 text-sm text-ink-600 dark:text-slate-300">
                    <p><span className="font-semibold text-ink-400">Grade:</span> {c.grade}</p>
                    <p><span className="font-semibold text-ink-400">Section:</span> {c.section}</p>
                    <p><span className="font-semibold text-ink-400">Tahun:</span> {c.academicYear}</p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'students' && (
        <div className="grid gap-6">
          <div className="flex items-center justify-between border-b border-brand-100 dark:border-slate-800 pb-4">
            <h3 className="font-bold text-ink-900 dark:text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-brand-600" /> Manajemen Murid
            </h3>
            <button onClick={() => setIsAddingStudent(true)} className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 shadow-sm">
              <UserPlus className="h-4 w-4" /> Tambah Student
            </button>
          </div>

          {/* Student List */}
          {accounts.filter(a => a.role !== 'dev' && a.id !== currentUser?.id).length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Users className="h-12 w-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-ink-900 dark:text-white">Belum ada Pengguna</h3>
              <p className="text-sm text-ink-500 mb-4">Belum ada Pengguna lain yang terdaftar pada scope Anda.</p>
              <button onClick={() => setIsAddingStudent(true)} className="px-4 py-2 text-sm font-bold bg-brand-600 text-white rounded-xl">+ Tambah Pengguna</button>
            </div>
          ) : (
            <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr className="text-left text-xs font-semibold text-ink-500 dark:text-slate-400">
                    <th className="p-4">Nama Lengkap</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Class</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {accounts.filter(a => a.role !== 'dev' && a.id !== currentUser?.id).map(a => {
                    const prof = profiles.find(p => p.userId === a.id);
                    const cls = classes.find(c => c.id === prof?.classId);
                    return (
                      <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="p-4 font-bold dark:text-white">{a.name}</td>
                        <td className="p-4 text-ink-600 dark:text-slate-300">{a.email}</td>
                        <td className="p-4"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-800 dark:bg-brand-900/30 dark:text-brand-300">{cls ? cls.name : (prof?.grade + ' ' + prof?.classSection)}</span></td>
                        <td className="p-4"><span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20">Aktif</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Adding Student Modal */}
      <AnimatePresence>
        {isAddingStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddingStudent(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 shadow-2xl p-6">
              <h3 className="font-bold text-xl mb-4 dark:text-white">Tambah Student</h3>
              <form onSubmit={handleAddStudent} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-ink-700 dark:text-slate-300 mb-1">Nama Lengkap</label>
                  <input value={regName} onChange={e => setRegName(e.target.value)} required className="w-full rounded-xl border border-brand-200 py-2.5 px-3 focus:ring-2 focus:ring-brand-100 dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink-700 dark:text-slate-300 mb-1">Email</label>
                  <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} required className="w-full rounded-xl border border-brand-200 py-2.5 px-3 focus:ring-2 focus:ring-brand-100 dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-ink-700 dark:text-slate-300 mb-1">Kata Sandi</label>
                    <input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} required className="w-full rounded-xl border border-brand-200 py-2.5 px-3 focus:ring-2 focus:ring-brand-100 dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink-700 dark:text-slate-300 mb-1">Konfirmasi Sandi</label>
                    <input type="password" value={regPasswordConfirm} onChange={e => setRegPasswordConfirm(e.target.value)} required className="w-full rounded-xl border border-brand-200 py-2.5 px-3 focus:ring-2 focus:ring-brand-100 dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-ink-700 dark:text-slate-300 mb-1">Class</label>
                    <select value={regClassId} onChange={e => setRegClassId(e.target.value)} required className="w-full rounded-xl border border-brand-200 py-2.5 px-3 focus:ring-2 focus:ring-brand-100 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                      <option value="">Pilih Class ▼</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink-700 dark:text-slate-300 mb-1">Gender</label>
                    <select value={regGender} onChange={e => setRegGender(e.target.value as Gender)} className="w-full rounded-xl border border-brand-200 py-2.5 px-3 focus:ring-2 focus:ring-brand-100 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                      <option value="male">Laki-laki</option>
                      <option value="female">Perempuan</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <button type="button" onClick={() => setIsAddingStudent(false)} className="px-5 py-2.5 text-sm font-bold bg-slate-100 text-ink-600 rounded-xl hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300">Batal</button>
                  <button type="submit" className="px-5 py-2.5 text-sm font-bold bg-brand-600 text-white rounded-xl shadow-sm hover:bg-brand-700">Buat Student</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {activeTab === 'overview' && (
        <div className="space-y-6">

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
            <StatCard icon={Users} label="Siswa Aktif (Online)" value={dashboardData.students.filter((s: any) => s.isOnline).length.toString()} sub="Sedang online saat ini" accent="from-brand-500 to-brand-600" />
          </div>

          {/* Student ranking */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-base font-bold text-ink-900 dark:text-white flex items-center gap-2">
                <Users className="h-4 w-4 text-brand-600" /> 
                Daftar Siswa — {selectedClass.name} (Kelas {selectedClass.grade} Ruang {selectedClass.section})
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
                    {dashboardData.students.map((s: any, idx: number) => (
                      <tr key={s.id} className="border-b border-brand-50/50 transition-colors hover:bg-brand-50/40 dark:border-slate-800 dark:hover:bg-slate-800/40">
                        <td className="py-3 pr-4">
                          <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-slate-200 text-slate-700' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-brand-50 text-brand-600 dark:bg-slate-800 dark:text-slate-400'}`}>
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

          {/* Charts row — only show when real hazard breakdown data exists */}
          {dashboardData.students.length > 0 && dashboardData.radarData.length > 0 && (
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
          {dashboardData.students.length > 0 && dashboardData.radarData.length === 0 && (
            <Card>
              <p className="py-6 text-center text-sm text-ink-400 dark:text-slate-500">
                Belum ada data per jenis bencana. Data grafik akan tersedia setelah siswa menyelesaikan simulasi dengan berbagai jenis hazard.
              </p>
            </Card>
          )}

        </>
      )}
        </div>
      )}
    </div>
  );
}
