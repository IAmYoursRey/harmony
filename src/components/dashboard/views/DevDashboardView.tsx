import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getAllAccounts, type UserAccount } from '@/data/accounts';
import { getAllProfiles, type UserProfile } from '@/data/userProfiles';
import { useToast } from '@/context/ToastContext';
import { 
  Users, UserPlus, ShieldAlert, BookOpen, GraduationCap, 
  Mail, Lock, User, School, Calendar, Download
} from 'lucide-react';
import type { Gender } from '@/data/userProfiles';

export default function DevDashboardView() {
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
  const [regGrade, setRegGrade] = useState('');
  const [regDob, setRegDob] = useState('');

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
    const finalGrade = regRole === 'teacher' && !regGrade ? 'Guru' : regGrade;
    
    const result = await register(
      regName, 
      regEmail, 
      regPassword, 
      regRole, 
      regGender, 
      finalGrade || 'Umum', 
      'unknown', 
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
              <div className="grid grid-cols-2 gap-3">
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink-700 dark:text-slate-300">Jenis Kelamin</label>
                  <select value={regGender} onChange={e => setRegGender(e.target.value as Gender)}
                    className="w-full rounded-xl border border-brand-100 bg-white py-2.5 px-3 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                    <option value="male">Laki-laki</option>
                    <option value="female">Perempuan</option>
                    <option value="other">Lainnya</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink-700 dark:text-slate-300">Kelas {regRole === 'student' && <span className="text-red-500">*</span>}</label>
                  <div className="relative">
                    <School className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <input value={regGrade} onChange={e => setRegGrade(e.target.value)} placeholder={regRole === 'teacher' ? 'Guru' : 'X IPA 1'}
                      className="w-full rounded-xl border border-brand-100 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                  </div>
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
                  </div>
                  {profile && (
                    <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 p-3 text-xs border border-slate-100 dark:border-slate-800">
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
