import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getAllAccounts, updateAccount, hashPassword, type UserAccount } from '@/data/accounts';
import { getAllProfiles, updateProfile, type UserProfile, type Gender } from '@/data/userProfiles';
import { useToast } from '@/context/ToastContext';
import { Users, UserPlus, ShieldAlert, BookOpen, GraduationCap, Mail, Lock, User, School, Calendar, Download, Edit2, Check, X, MapPin, TrendingUp, TrendingDown, Award, Target, Brain, FileText, Sparkles, CheckCircle2, AlertTriangle, Clock, Plus, ChevronDown, Phone, Pencil, Bell, Globe, Shield, LogOut, Camera, Boxes, Satellite, Zap, Trophy, Compass, Flame, Medal, Save, type LucideIcon } from 'lucide-react';
import { schoolData, findSchoolsByProvince, findSchoolsByRegency } from '@/data/schools';
import { motion, AnimatePresence } from 'framer-motion';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts';
import { useI18n, type Language } from '@/context/I18nContext';
import { useNavigate } from 'react-router-dom';
import { realSchoolsMojokerto } from '@/data/realSchoolsMojokerto';
import { ProgressRing } from '@/components/dashboard/Charts';


// --- Merged from DevDashboardView.tsx ---

export function DevDashboardView() {
  const { register } = useAuth();
  const { show } = useToast();
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [regRole, setRegRole] = useState<'student' | 'teacher'>('teacher');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regGender, setRegGender] = useState<Gender>('male');
  const [regGrade, setRegGrade] = useState<'X'|'XI'|'XII'>('X');
  const [regSection, setRegSection] = useState('');
  const [regDob, setRegDob] = useState('');
  const [regProvId, setRegProvId] = useState('');
  const [regRegId, setRegRegId] = useState('');
  const [regSchoolId, setRegSchoolId] = useState('');

  // Edit state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editSchoolId, setEditSchoolId] = useState('');
  const [editProvId, setEditProvId] = useState('');
  const [editRegId, setEditRegId] = useState('');
  const [editGrade, setEditGrade] = useState<'X'|'XI'|'XII'>('X');
  const [editSection, setEditSection] = useState('');

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setAccounts(getAllAccounts());
    setProfiles(getAllProfiles());
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPassword) {
      show('Mohon lengkapi semua data wajib.', 'error'); return;
    }
    if (regPassword.length < 6) {
      show('Kata sandi minimal 6 karakter.', 'error'); return;
    }

    setLoading(true);
    const finalGrade = regGrade;
    const finalClass = regRole === 'teacher' ? '' : regSection;
    const finalSchoolId = regSchoolId || 'unknown';
    
    const result = await register(
      regName, 
      regEmail, 
      regPassword, 
      regRole, 
      regGender, 
      finalGrade, 
      finalClass, 
      finalSchoolId,
      regDob || undefined
    );
    setLoading(false);

    if (result.success) {
      show(`Akun ${regRole === 'teacher' ? 'Guru' : 'Siswa'} ${regName} berhasil dibuat!`, 'success');
      setRegName('');
      setRegEmail('');
      setRegPassword('');
      refreshData();
    } else {
      show(result.error ?? 'Gagal membuat akun', 'error');
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(accounts, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daftar_pengguna_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    show('Data berhasil diekspor ke file JSON', 'success');
  };

  const handleEditClick = (acc: UserAccount, prof?: UserProfile) => {
    setEditingUserId(acc.id);
    setEditName(acc.name);
    setEditPassword(''); // Leave blank unless they want to change it
    let prov = '';
    let reg = '';
    const sid = prof?.schoolId || '';
    if (sid && sid !== 'unknown') {
      for (const p of schoolData) {
        for (const r of p.regencies) {
          if (r.schools.some(s => s.id === sid)) {
            prov = p.id;
            reg = r.id;
            break;
          }
        }
        if (prov) break;
      }
    }
    setEditProvId(prov);
    setEditRegId(reg);
    setEditSchoolId(sid);
    setEditGrade(prof?.grade === 'X' || prof?.grade === 'XI' || prof?.grade === 'XII' ? prof.grade : 'X');
    setEditSection(prof?.classSection || '');
  };

  const handleSaveEdit = async (accId: string) => {
    try {
      // Update Account
      const accountUpdates: any = { name: editName };
      if (editPassword.trim().length > 0) {
        if (editPassword.trim().length < 6) {
          show('Kata sandi baru minimal 6 karakter', 'error');
          return;
        }
        accountUpdates.passwordHash = await hashPassword(editPassword.trim());
      }
      updateAccount(accId, accountUpdates);

      // Update Profile
      const finalEditGrade = editGrade as 'X'|'XI'|'XII';
      updateProfile(accId, {
        schoolId: editSchoolId,
        grade: finalEditGrade,
        classSection: editSection
      });

      show('Data pengguna berhasil diperbarui!', 'success');
      setEditingUserId(null);
      refreshData();
    } catch (err) {
      show('Gagal memperbarui data', 'error');
    }
  };

  const stats = {
    total: accounts.length,
    students: accounts.filter(a => a.role === 'student').length,
    teachers: accounts.filter(a => a.role === 'teacher').length,
    devs: accounts.filter(a => a.role === 'dev').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink-900 dark:text-white">Developer Panel</h2>
        <p className="mt-1 text-sm text-ink-500 dark:text-slate-400">
          Akses penuh untuk mengelola pengguna dan sistem.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Pengguna', value: stats.total, icon: Users, color: 'text-brand-600', bg: 'bg-brand-50 dark:bg-brand-500/10' },
          { label: 'Peserta Didik', value: stats.students, icon: GraduationCap, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { label: 'Guru / Pendidik', value: stats.teachers, icon: BookOpen, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10' },
          { label: 'Admin (Dev)', value: stats.devs, icon: ShieldAlert, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-500/10' },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl border border-brand-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${s.bg}`}>
                <s.icon className={`h-6 w-6 ${s.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-ink-500 dark:text-slate-400">{s.label}</p>
                <p className="font-display text-2xl font-bold text-ink-900 dark:text-white">{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Register Form */}
        <div className="rounded-2xl border border-brand-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="border-b border-brand-100 dark:border-slate-800 px-6 py-4">
            <h3 className="font-bold text-ink-900 dark:text-white flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-brand-600" /> Daftarkan Akun Baru
            </h3>
          </div>
          <div className="p-6">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button type="button" onClick={() => setRegRole('teacher')}
                  className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition-colors ${regRole === 'teacher' ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400' : 'border-brand-100 bg-white text-ink-600 hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                  <BookOpen className="h-4 w-4" /> Guru
                </button>
                <button type="button" onClick={() => setRegRole('student')}
                  className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition-colors ${regRole === 'student' ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400' : 'border-brand-100 bg-white text-ink-600 hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                  <GraduationCap className="h-4 w-4" /> Murid
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-ink-700 dark:text-slate-300">Nama Lengkap <span className="text-red-500">*</span></label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input value={regName} onChange={e => setRegName(e.target.value)} placeholder="Nama pengguna"
                    className="w-full rounded-xl border border-brand-100 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-ink-700 dark:text-slate-300">Email <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="email@geosense.edu"
                    className="w-full rounded-xl border border-brand-100 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-ink-700 dark:text-slate-300">Kata Sandi <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input type="text" value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="Min. 6 karakter"
                    className="w-full rounded-xl border border-brand-100 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink-700 dark:text-slate-300">Jenis Kelamin</label>
                  <select value={regGender} onChange={e => setRegGender(e.target.value as Gender)}
                    className="w-full rounded-xl border border-brand-100 bg-white py-2.5 px-3 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                    <option value="male">Laki-laki</option>
                    <option value="female">Perempuan</option>
                    <option value="other">Lainnya</option>
                  </select>
                </div>
                
                {(regRole === 'student' || regRole === 'teacher') && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-ink-700 dark:text-slate-300">Tingkat Kelas <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <School className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                      <select value={regGrade} onChange={e => setRegGrade(e.target.value as 'X'|'XI'|'XII')}
                        className="w-full rounded-xl border border-brand-100 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                        <option value="X">Kelas X</option>
                        <option value="XI">Kelas XI</option>
                        <option value="XII">Kelas XII</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {regRole === 'student' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink-700 dark:text-slate-300">Ruang/No. Kelas (Hanya Angka) <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <School className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <input type="number" min="1" value={regSection} onChange={e => setRegSection(e.target.value)} placeholder="1"
                      className="w-full rounded-xl border border-brand-100 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                  </div>
                </div>
              )}

              {/* School Selection for Registration */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink-700 dark:text-slate-300">Provinsi</label>
                  <select value={regProvId} onChange={e => { setRegProvId(e.target.value); setRegRegId(''); setRegSchoolId(''); }}
                    className="w-full rounded-xl border border-brand-100 bg-white py-2.5 px-3 text-sm outline-none focus:border-brand-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                    <option value="">(Opsional) Pilih Provinsi...</option>
                    {schoolData.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink-700 dark:text-slate-300">Kabupaten/Kota</label>
                  <select value={regRegId} onChange={e => { setRegRegId(e.target.value); setRegSchoolId(''); }} disabled={!regProvId}
                    className="w-full rounded-xl border border-brand-100 bg-white py-2.5 px-3 text-sm outline-none focus:border-brand-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:opacity-50">
                    <option value="">(Opsional) Pilih Kab/Kota...</option>
                    {regProvId && findSchoolsByProvince(regProvId).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink-700 dark:text-slate-300">Sekolah</label>
                  <select value={regSchoolId} onChange={e => setRegSchoolId(e.target.value)} disabled={!regRegId}
                    className="w-full rounded-xl border border-brand-100 bg-white py-2.5 px-3 text-sm outline-none focus:border-brand-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:opacity-50">
                    <option value="">(Opsional) Pilih Sekolah...</option>
                    {regProvId && regRegId && findSchoolsByRegency(regProvId, regRegId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 disabled:opacity-60">
                {loading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" /> : <><UserPlus className="h-4 w-4" /> Daftarkan Akun</>}
              </button>
            </form>
          </div>
        </div>

        {/* User List */}
        <div className="rounded-2xl border border-brand-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col max-h-[600px]">
          <div className="border-b border-brand-100 dark:border-slate-800 px-6 py-4 bg-brand-50/50 dark:bg-slate-800/50 flex items-center justify-between">
            <h3 className="font-bold text-ink-900 dark:text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-brand-600" /> Daftar Pengguna Terakhir
            </h3>
            <button onClick={handleExport} className="flex items-center gap-1.5 rounded-lg bg-white dark:bg-slate-800 border border-brand-100 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-ink-600 hover:text-brand-600 hover:border-brand-300 transition-colors shadow-sm">
              <Download className="h-3.5 w-3.5" /> Ekspor JSON
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {accounts.slice().reverse().map(acc => {
              const profile = profiles.find(p => p.userId === acc.id);
              return (
                <div key={acc.id} className="flex flex-col gap-2 rounded-xl border border-brand-50 dark:border-slate-800 bg-white dark:bg-slate-800/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${acc.role === 'dev' ? 'bg-red-100 text-red-600' : acc.role === 'teacher' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {acc.role === 'dev' ? <ShieldAlert className="h-5 w-5" /> : acc.role === 'teacher' ? <BookOpen className="h-5 w-5" /> : <GraduationCap className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-ink-900 dark:text-white flex items-center gap-2">
                          {acc.name} 
                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full border ${acc.role === 'dev' ? 'border-red-200 bg-red-50 text-red-700' : acc.role === 'teacher' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                            {acc.role.toUpperCase()}
                          </span>
                        </p>
                        <p className="text-xs text-ink-500 dark:text-slate-400">{acc.email}</p>
                      </div>
                    </div>
                    {editingUserId !== acc.id && (
                      <button onClick={() => handleEditClick(acc, profile)} className="p-2 text-ink-400 hover:text-brand-600 transition-colors">
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {editingUserId === acc.id ? (
                    <div className="mt-3 p-3 bg-brand-50 dark:bg-slate-800 rounded-lg space-y-3 text-sm border border-brand-100 dark:border-brand-900/50">
                      <div>
                        <label className="block text-xs font-bold text-ink-600 dark:text-slate-400 mb-1">Ubah Nama</label>
                        <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-3 py-1.5 rounded border border-brand-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-ink-900 dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-ink-600 dark:text-slate-400 mb-1">Ganti Sandi (Kosongkan jika tidak diubah)</label>
                        <input value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="Kata sandi baru" className="w-full px-3 py-1.5 rounded border border-brand-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-ink-900 dark:text-white" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-xs font-bold text-ink-600 dark:text-slate-400 mb-1">Provinsi</label>
                          <select value={editProvId} onChange={e => { setEditProvId(e.target.value); setEditRegId(''); setEditSchoolId(''); }} className="w-full px-3 py-1.5 rounded border border-brand-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-ink-900 dark:text-white">
                            <option value="">Pilih Provinsi...</option>
                            {schoolData.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-ink-600 dark:text-slate-400 mb-1">Kabupaten/Kota</label>
                          <select value={editRegId} onChange={e => { setEditRegId(e.target.value); setEditSchoolId(''); }} disabled={!editProvId} className="w-full px-3 py-1.5 rounded border border-brand-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-ink-900 dark:text-white disabled:opacity-50">
                            <option value="">Pilih Kab/Kota...</option>
                            {editProvId && findSchoolsByProvince(editProvId).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-ink-600 dark:text-slate-400 mb-1">Sekolah</label>
                          <select value={editSchoolId} onChange={e => setEditSchoolId(e.target.value)} disabled={!editRegId} className="w-full px-3 py-1.5 rounded border border-brand-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-ink-900 dark:text-white disabled:opacity-50">
                            <option value="">Pilih Sekolah...</option>
                            {editProvId && editRegId && findSchoolsByRegency(editProvId, editRegId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-ink-600 dark:text-slate-400 mb-1">Tingkat Kelas (Murid & Guru)</label>
                        <select value={editGrade} onChange={e => setEditGrade(e.target.value as 'X'|'XI'|'XII')} className="w-full px-3 py-1.5 rounded border border-brand-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-ink-900 dark:text-white">
                          <option value="X">Kelas X</option>
                          <option value="XI">Kelas XI</option>
                          <option value="XII">Kelas XII</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-ink-600 dark:text-slate-400 mb-1">No. Ruang Kelas (Khusus Murid)</label>
                        <input type="number" min="1" value={editSection} onChange={e => setEditSection(e.target.value)} className="w-full px-3 py-1.5 rounded border border-brand-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-ink-900 dark:text-white" />
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button onClick={() => setEditingUserId(null)} className="px-3 py-1.5 text-xs font-bold text-ink-500 hover:text-ink-700 bg-white dark:bg-slate-700 rounded border border-brand-200 dark:border-slate-600">Batal</button>
                        <button onClick={() => handleSaveEdit(acc.id)} className="px-3 py-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Simpan</button>
                      </div>
                    </div>
                  ) : profile && (
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 p-3 text-xs border border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-ink-400 dark:text-slate-500 block mb-0.5">Sekolah</span>
                        <span className="font-semibold text-ink-700 dark:text-slate-300">{profile.schoolId}</span>
                      </div>
                      <div>
                        <span className="text-ink-400 dark:text-slate-500 block mb-0.5">Kelas / Status</span>
                        <span className="font-semibold text-ink-700 dark:text-slate-300">{profile.grade}</span>
                      </div>
                      <div>
                        <span className="text-ink-400 dark:text-slate-500 block mb-0.5">Total Poin</span>
                        <span className="font-semibold text-brand-600 dark:text-brand-400">{profile.totalPoints} pts</span>
                      </div>
                      <div>
                        <span className="text-ink-400 dark:text-slate-500 block mb-0.5">Progress</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {Object.keys(profile.topicScores || {}).length} Modul
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}


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
  const { t } = useI18n();
  const { currentProfile, refreshProfile } = useAuth();
  const [exporting, setExporting] = useState(false);

  const [selectedClassIdx, setSelectedClassIdx] = useState(0);
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [newGrade, setNewGrade] = useState<'X'|'XI'|'XII'>('X');
  const [newSection, setNewSection] = useState('');

  const supervisedClasses = currentProfile?.supervisedClasses || [];
  const selectedClass = supervisedClasses[selectedClassIdx];

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSection.trim() || !currentProfile) return;
    const updated = [...supervisedClasses, { grade: newGrade, section: newSection }];
    updateProfile(currentProfile.userId, { supervisedClasses: updated });
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

    const allProfiles = getAllProfiles();
    const allAccounts = getAllAccounts();

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
      const avg = scores.length > 0 ? Math.round(scores.reduce((sum, s) => sum + s.averageScore, 0) / scores.length) : 0;
      
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
    const classAverage = mappedStudents.length > 0 ? Math.round(mappedStudents.reduce((sum, s) => sum + s.averageScore, 0) / mappedStudents.length) : 0;

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
                    {dashboardData.students.map((s, idx) => (
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
                    <Tooltip labelFormatter={(v) => t(v)} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
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
                    <Tooltip labelFormatter={(v) => t(v)} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
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


// --- Merged from ProfileView.tsx ---

interface ProfileData {
  fullName: string;
  school: string;
  className: string;
  email: string;
  phone: string;
  password: string;
  avatar: string | null;
}

const modules = [
  { label: 'Earthquake', value: 71 },
  { label: 'Flood', value: 82 },
  { label: 'Volcanic', value: 64 },
  { label: 'Landslide', value: 55 },
  { label: 'Tsunami', value: 48 },
  { label: 'Fire', value: 67 },
];

const technologies = [
  { icon: Brain, label: 'Artificial Intelligence', color: 'from-brand-500 to-brand-700' },
  { icon: Boxes, label: 'Digital Twin', color: 'from-brand-500 to-brand-600' },
  { icon: Satellite, label: 'Geospatial Technology', color: 'from-brand-500 to-brand-600' },
];

const certificates = [
  { title: 'Earthquake Preparedness', date: 'Jan 2026', icon: Shield, color: 'from-brand-400 to-brand-600' },
  { title: 'Flood Response Training', date: 'Feb 2026', icon: BookOpen, color: 'from-brand-500 to-brand-600' },
  { title: 'Digital Twin Simulation', date: 'Mar 2026', icon: Boxes, color: 'from-brand-500 to-brand-600' },
  { title: 'GIS Risk Mapping', date: 'Apr 2026', icon: Satellite, color: 'from-brand-500 to-brand-600' },
  { title: 'AI Disaster Analytics', date: 'May 2026', icon: Brain, color: 'from-brand-500 to-brand-700' },
];

const history = [
  { title: 'Earthquake Simulation', date: '2 days ago', score: '96%', icon: Shield },
  { title: 'Flood Module — Advanced', date: '5 days ago', score: 'Completed', icon: BookOpen },
  { title: 'Risk Mapping Workshop', date: '1 week ago', score: 'Completed', icon: Compass },
  { title: 'Volcanic Ash Preparedness Quiz', date: '2 weeks ago', score: '90%', icon: Brain },
];

const achievements: { icon: LucideIcon; label: string; color: string }[] = [
  { icon: Shield, label: 'Disaster Ready', color: 'from-brand-500 to-brand-600' },
  { icon: Trophy, label: 'Top Learner', color: 'from-brand-400 to-brand-500' },
  { icon: Compass, label: 'Geo Explorer', color: 'from-brand-500 to-brand-700' },
  { icon: Brain, label: 'AI Explorer', color: 'from-brand-500 to-brand-600' },
  { icon: Flame, label: '100 Days Learning', color: 'from-brand-600 to-brand-800' },
  { icon: Medal, label: 'Research Contributor', color: 'from-brand-500 to-brand-600' },
];



function EditableField({
  icon: Icon,
  label,
  value,
  onChange,
  type = 'text',
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-brand-100 bg-white/60 p-3 dark:border-slate-700 dark:bg-slate-800/60">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-slate-700 dark:text-brand-400">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-ink-500 dark:text-slate-400">{label}</p>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-sm font-semibold text-ink-900 outline-none dark:text-white"
        />
      </div>
    </div>
  );
}

export function ProfileView() {
  const { show } = useToast();
  const navigate = useNavigate();
  const { lang, setLang, t } = useI18n();
  const { currentUser, currentProfile, updateUserAccount, updateUserProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  
  const initialData: ProfileData = {
    fullName: currentUser?.name || 'Guest User',
    school: currentProfile?.schoolId || 'SMA Negeri 1 Mojokerto',
    className: currentProfile?.grade || 'Umum',
    email: currentUser?.email || 'guest@geosense.edu',
    phone: currentProfile?.phone || '-',
    password: '••••••••',
    avatar: currentProfile?.avatar || null,
  };

  const [data, setData] = useState<ProfileData>(initialData);
  const [draft, setDraft] = useState<ProfileData>(initialData);
  const [saved, setSaved] = useState(false);
  const [prefs, setPrefs] = useState({
    alerts: true,
    digest: true,
    contacts: true,
    location: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setDraft(data);
    setEditing(true);
  };

  const getSchoolName = (id: string | undefined | null) => {
    if (!id || id === 'unknown') return t('school.unknown', 'Belum Memilih Sekolah');
    const s = realSchoolsMojokerto.find(s => s.id === id);
    return s ? s.name : id;
  };

  const saveChanges = async () => {
    // Save to global auth context
    try {
      const accountUpdates: { name?: string; password?: string } = {};
      if (draft.fullName !== currentUser?.name) accountUpdates.name = draft.fullName;
      if (draft.password !== '••••••••' && draft.password.trim() !== '') accountUpdates.password = draft.password;
      
      if (Object.keys(accountUpdates).length > 0) {
        await updateUserAccount(accountUpdates);
      }
      
      const profileUpdates: any = {};
      if (draft.phone !== currentProfile?.phone) profileUpdates.phone = draft.phone;
      if (draft.avatar !== currentProfile?.avatar) profileUpdates.avatar = draft.avatar;
      
      if (Object.keys(profileUpdates).length > 0) {
        updateUserProfile(profileUpdates);
      }
      
      setData(draft);
      setEditing(false);
      setSaved(true);
      show('Profil berhasil diperbarui', 'success');
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      show(e.message || 'Gagal menyimpan profil', 'error');
    }
  };

  const cancelEdit = () => {
    setDraft(data);
    setEditing(false);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024) {
        show('Ukuran gambar terlalu besar. Maksimal 100KB agar memori peramban tidak penuh.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (editing) {
          setDraft((d) => ({ ...d, avatar: result }));
        } else {
          setData((d) => ({ ...d, avatar: result }));
          updateUserProfile({ avatar: result });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const current = editing ? draft : data;
  const initials = current.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="space-y-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-6 text-white shadow-glass-lg sm:p-8">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:36px_36px] opacity-15" />
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:items-end">
          <div className="relative">
            <span className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-3xl font-extrabold shadow-glass ring-1 ring-white/30">
              {current.avatar ? (
                <img src={current.avatar} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </span>
            <button
              onClick={handleAvatarClick}
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white text-brand-700 shadow-glass transition-transform hover:scale-110"
              aria-label="Change profile picture"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <div>
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink-900 dark:text-white">
                {currentUser?.name || 'Pengguna'}
              </h2>
              <div className="mt-1.5 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                  {currentUser?.role === 'dev' ? t('role.dev', 'Pengembang') : currentUser?.role === 'teacher' ? t('role.teacher', 'Guru') : t('role.student', 'Peserta Didik')}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <MapPin className="h-3 w-3" /> {currentProfile?.schoolId || 'SMA Negeri 1 Mojokerto'}
                </span>
              </div>
            </div>

          {!editing && (
            <button
              onClick={startEdit}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-brand-700 shadow-glass transition-all hover:-translate-y-0.5"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Saved toast */}
      <AnimatePresence>
        {saved && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-glass-lg"
          >
            <CheckCircle2 className="h-4 w-4" /> Changes saved successfully
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center gap-4">
          <ProgressRing value={92} size={64} stroke={6} label="92" />
          <div>
            <p className="font-display text-lg font-extrabold text-ink-900 dark:text-white">GeoSense Score</p>
            <p className="text-xs font-semibold text-brand-600">Highly Resilient</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400">
            <Award className="h-7 w-7" />
          </span>
          <div>
            <p className="font-display text-lg font-extrabold text-ink-900 dark:text-white">5</p>
            <p className="text-xs text-ink-500 dark:text-slate-400">Certificates Earned</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-slate-800 dark:text-brand-400">
            <BookOpen className="h-7 w-7" />
          </span>
          <div>
            <p className="font-display text-lg font-extrabold text-ink-900 dark:text-white">38</p>
            <p className="text-xs text-ink-500 dark:text-slate-400">Modules Completed</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400">
            <Zap className="h-7 w-7" />
          </span>
          <div>
            <p className="font-display text-lg font-extrabold text-ink-900 dark:text-white">95</p>
            <p className="text-xs text-ink-500 dark:text-slate-400">Preparedness Score</p>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Editable profile */}
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-ink-900 dark:text-white">
              {editing ? 'Edit Profile' : 'Research Profile'}
            </h3>
            {!editing && (
              <button
                onClick={startEdit}
                className="inline-flex items-center gap-1.5 rounded-full border border-brand-100 px-4 py-2 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50 dark:border-slate-700 dark:text-brand-400 dark:hover:bg-slate-800"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {editing ? (
              <>
                <EditableField icon={Target} label="Full Name" value={draft.fullName} onChange={(v) => setDraft({ ...draft, fullName: v })} />
                
                {currentUser?.role === 'dev' ? (
                  <EditableField icon={School} label="School" value={draft.school} onChange={(v) => setDraft({ ...draft, school: v })} />
                ) : draft.school === 'unknown' ? (
                  <div className="flex flex-col rounded-xl border border-brand-50 p-3 dark:border-slate-800 bg-brand-50/50 dark:bg-slate-900/50 relative">
                    <div className="flex items-center gap-3 justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-slate-800 dark:text-brand-400">
                          <School className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-xs text-ink-500 dark:text-slate-400">School</p>
                          <p className="truncate text-sm font-semibold text-amber-600 dark:text-amber-500">{t('school.unknown', 'Belum Memilih Sekolah')}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => navigate('/school-selection')} 
                        className="bg-brand-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap hover:bg-brand-700"
                      >
                        Pilih
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col rounded-xl border border-brand-50 p-3 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 opacity-80 cursor-not-allowed relative group">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-slate-800 dark:text-brand-400">
                        <School className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-xs text-ink-500 dark:text-slate-400">School</p>
                        <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{getSchoolName(draft.school)}</p>
                      </div>
                    </div>
                    {/* Tooltip */}
                    <div className="pointer-events-none absolute left-1/2 -top-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink-900 px-3 py-1.5 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-slate-700">
                      Hanya Developer yang dapat mengubah sekolah
                    </div>
                  </div>
                )}
                
                <EditableField icon={BookOpen} label="Class" value={draft.className} onChange={(v) => setDraft({ ...draft, className: v })} />
                <EditableField icon={Mail} label="Email" value={draft.email} onChange={(v) => setDraft({ ...draft, email: v })} />
                <EditableField icon={Phone} label="Phone Number" value={draft.phone} onChange={(v) => setDraft({ ...draft, phone: v })} />
                <EditableField icon={Lock} label="Password" value={draft.password} onChange={(v) => setDraft({ ...draft, password: v })} />
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 rounded-xl border border-brand-50 p-3 dark:border-slate-800">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-slate-800 dark:text-brand-400"><Target className="h-4 w-4" /></span>
                  <div><p className="text-xs text-ink-500 dark:text-slate-400">Full Name</p><p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{data.fullName}</p></div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-brand-50 p-3 dark:border-slate-800 justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-slate-800 dark:text-brand-400"><School className="h-4 w-4" /></span>
                    <div>
                      <p className="text-xs text-ink-500 dark:text-slate-400">School</p>
                      <p className={`truncate text-sm font-semibold ${data.school === 'unknown' ? 'text-amber-600 dark:text-amber-500' : 'text-ink-900 dark:text-white'}`}>
                        {getSchoolName(data.school)}
                      </p>
                    </div>
                  </div>
                  {data.school === 'unknown' && (
                    <button 
                      onClick={() => navigate('/school-selection')} 
                      className="bg-brand-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap hover:bg-brand-700"
                    >
                      Pilih
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-brand-50 p-3 dark:border-slate-800">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-slate-800 dark:text-brand-400"><BookOpen className="h-4 w-4" /></span>
                  <div><p className="text-xs text-ink-500 dark:text-slate-400">Class</p><p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{data.className}</p></div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-brand-50 p-3 dark:border-slate-800">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-slate-800 dark:text-brand-400"><Mail className="h-4 w-4" /></span>
                  <div><p className="text-xs text-ink-500 dark:text-slate-400">Email</p><p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{data.email}</p></div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-brand-50 p-3 dark:border-slate-800">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-slate-800 dark:text-brand-400"><Phone className="h-4 w-4" /></span>
                  <div><p className="text-xs text-ink-500 dark:text-slate-400">Phone Number</p><p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{data.phone}</p></div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-brand-50 p-3 dark:border-slate-800">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-slate-800 dark:text-brand-400"><Lock className="h-4 w-4" /></span>
                  <div><p className="text-xs text-ink-500 dark:text-slate-400">Password</p><p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{data.password}</p></div>
                </div>
              </>
            )}
          </div>

          {/* Edit buttons */}
          {editing && (
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={saveChanges}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-glass transition-all hover:bg-brand-700 hover:-translate-y-0.5"
              >
                <Save className="h-4 w-4" /> Save Changes
              </button>
              <button
                onClick={cancelEdit}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-100 bg-white/60 px-6 py-3 text-sm font-semibold text-ink-600 transition-colors hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" /> Cancel
              </button>
            </div>
          )}
        </Card>

        {/* Module progress */}
        <Card className="lg:col-span-1">
          <h3 className="mb-4 font-display text-base font-bold text-ink-900 dark:text-white">Module Progress</h3>
          <div className="space-y-3">
            {modules.map((m) => {
              const val = currentProfile?.totalPoints === 0 ? 0 : m.value;
              return (
              <div key={m.label} className="flex items-center gap-3">
                <ProgressRing value={val} size={44} stroke={4} label={`${val}`} />
                <span className="text-sm font-medium text-ink-700 dark:text-slate-300">{m.label}</span>
              </div>
            )})}
          </div>
        </Card>
      </div>

      {/* Certificates */}
      <Card>
        <h3 className="mb-4 font-display text-base font-bold text-ink-900 dark:text-white">Certificates</h3>
        {currentProfile?.totalPoints === 0 ? (
          <div className="py-8 text-center text-sm font-medium text-ink-500 dark:text-slate-400">
            {t('profile.no_certificates', 'Belum ada sertifikat. Mulai selesaikan modul untuk mengklaim sertifikat.')}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {certificates.map((c) => (
              <div key={c.title} className="group flex flex-col items-center gap-2 rounded-xl border border-brand-50 p-4 text-center transition-all hover:-translate-y-1 hover:shadow-glass dark:border-slate-800">
                <span className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${c.color} text-white shadow-glass transition-transform group-hover:scale-110`}>
                  <c.icon className="h-6 w-6" />
                </span>
                <p className="text-xs font-bold leading-tight text-ink-900 dark:text-white">{c.title}</p>
                <p className="text-[10px] text-ink-500 dark:text-slate-400">{c.date}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* History + achievements */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-display text-base font-bold text-ink-900 dark:text-white">Learning History</h3>
          {currentProfile?.totalPoints === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm font-medium text-ink-500 dark:text-slate-400">
              {t('profile.no_learning_history', 'Belum ada riwayat pembelajaran.')}
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((h) => (
                <div key={h.title} className="group flex items-center gap-3 rounded-xl border border-brand-50 p-3 transition-colors hover:bg-brand-50/50 dark:border-slate-800 dark:hover:bg-slate-800/50">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-slate-800 dark:text-brand-400">
                    <h.icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{h.title}</p>
                    <p className="flex items-center gap-1 text-[11px] text-ink-500 dark:text-slate-400"><Clock className="h-3 w-3" /> {h.date}</p>
                  </div>
                  <span className="flex items-center gap-1.5 font-display text-sm font-bold text-brand-700 dark:text-brand-400">
                    <CheckCircle2 className="h-4 w-4 text-brand-500" /> {h.score}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="mb-4 font-display text-base font-bold text-ink-900 dark:text-white">Achievements</h3>
          {currentProfile?.totalPoints === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm font-medium text-ink-500 dark:text-slate-400">
              {t('profile.no_achievements', 'Belum ada pencapaian.')}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {achievements.map((b) => (
                <div key={b.label} className="group flex flex-col items-center gap-2.5 rounded-xl p-3 text-center transition-all hover:-translate-y-1">
                  <span className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${b.color} text-white shadow-glass transition-transform group-hover:scale-110`}>
                    <b.icon className="h-7 w-7" />
                  </span>
                  <span className="text-[10px] font-semibold leading-tight text-ink-600 dark:text-slate-300">{b.label}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Privacy settings + logout */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-display text-base font-bold text-ink-900 dark:text-white">Privacy Settings</h3>
          <div className="space-y-3">
            {[
              { key: 'alerts' as const, icon: Bell, label: 'Disaster alerts', desc: 'Notifications for your area' },
              { key: 'digest' as const, icon: Mail, label: 'Email digest', desc: 'Weekly research summary' },
              { key: 'contacts' as const, icon: Shield, label: 'Emergency contacts', desc: '2 contacts configured' },
              { key: 'location' as const, icon: Globe, label: 'Location sharing', desc: 'For risk-based recommendations' },
            ].map((s) => (
              <div key={s.key} className="flex items-center gap-3 rounded-xl border border-brand-50 p-3 dark:border-slate-800">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-slate-800 dark:text-brand-400">
                  <s.icon className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink-900 dark:text-white">{s.label}</p>
                  <p className="text-xs text-ink-500 dark:text-slate-400">{s.desc}</p>
                </div>
                <button
                  onClick={() => setPrefs((p) => ({ ...p, [s.key]: !p[s.key] }))}
                  role="switch" aria-checked={prefs[s.key]} aria-label={s.label} className={`relative h-6 w-11 rounded-full transition-colors ${prefs[s.key] ? 'bg-brand-600' : 'bg-brand-100 dark:bg-slate-700'}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${prefs[s.key] ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col">
          <h3 className="mb-4 font-display text-base font-bold text-ink-900 dark:text-white">Account</h3>
          <div className="space-y-3">
            <button onClick={() => show('Privacy & Security settings are managed by your school administrator.', 'info')} className="flex w-full items-center gap-3 rounded-xl border border-brand-50 p-3 text-left transition-colors hover:bg-brand-50/60 dark:border-slate-800 dark:hover:bg-slate-800/60">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-slate-800 dark:text-brand-400"><Shield className="h-4 w-4" /></span>
              <div><p className="text-sm font-semibold text-ink-900 dark:text-white">Privacy & Security</p><p className="text-xs text-ink-500 dark:text-slate-400">Password and data settings</p></div>
            </button>

            <button
              onClick={() => navigate('/')}
              className="flex w-full items-center gap-3 rounded-xl border border-brand-100 p-3 text-left transition-colors hover:bg-brand-50 dark:border-brand-900/40 dark:hover:bg-brand-950/30"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400"><LogOut className="h-4 w-4" /></span>
              <div><p className="text-sm font-semibold text-brand-600 dark:text-brand-400">Logout</p><p className="text-xs text-ink-500 dark:text-slate-400">Return to landing page</p></div>
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}


