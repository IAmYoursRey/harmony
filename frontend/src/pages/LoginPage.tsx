import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, BookOpen, Mail, Lock, ArrowRight, ArrowLeft,
  ShieldCheck, Brain, Satellite, Boxes, User, UserPlus,
  LogIn, Eye, EyeOff, Calendar, School
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import {  useToast  } from '@/hooks/useToast';
import { ThemePicker } from '@/components/ThemePicker';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';

type Mode = 'role-select' | 'login' | 'register';
type Role = 'student' | 'teacher';
type Gender = 'male' | 'female' | 'other';

export default function LoginPage() {
  const navigate = useNavigate();
  const { show } = useToast();
  const { login, register, currentUser } = useAuth();

  const [mode, setMode] = useState<Mode>('role-select');
  const [role, setRole] = useState<Role>('student');
  const [loading, setLoading] = useState(false);

  // Auto redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      navigate('/app');
    }
  }, [currentUser, navigate]);

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPw, setShowLoginPw] = useState(false);

  // Register fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regGender, setRegGender] = useState<Gender>('male');
  const [regGrade, setRegGrade] = useState<'X' | 'XI' | 'XII'>('X');
  const [regSection, setRegSection] = useState('');
  const [regDob, setRegDob] = useState('');
  const [showRegPw, setShowRegPw] = useState(false);

  const handleRoleSelect = (selectedRole: Role, targetMode: Mode) => {
    setRole(selectedRole);
    setMode(targetMode);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) { show('Mohon isi email dan kata sandi.', 'error'); return; }
    setLoading(true);
    const result = await login(loginEmail, loginPassword);
    setLoading(false);
    if (result.success) {
      show(`Selamat datang kembali!`, 'success');
      navigate('/app');
    } else {
      show(result.error ?? 'Gagal masuk', 'error');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPassword || !regGrade || !regSection) {
      show('Mohon lengkapi semua data yang wajib diisi (termasuk kelas & ruang).', 'error'); return;
    }
    if (regPassword !== regConfirm) {
      show('Konfirmasi kata sandi tidak sesuai.', 'error'); return;
    }
    if (regPassword.length < 6) {
      show('Kata sandi minimal 6 karakter.', 'error'); return;
    }
    setLoading(true);
    const result = await register(regName, regEmail, regPassword, role, regGender, regGrade, regSection, 'unknown', regDob || undefined);
    setLoading(false);
    if (result.success) {
      show(`Akun berhasil dibuat! Selamat datang, ${regName}!`, 'success');
      navigate('/app');
    } else {
      show(result.error ?? 'Gagal mendaftar', 'error');
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-950 px-4 py-10">
      {/* Background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-50/50 via-white to-sky-50/50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900" />
        <div className="absolute inset-0 bg-grid-pattern bg-[size:32px_32px] opacity-20 dark:opacity-10" />
        <motion.div className="absolute -top-20 left-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-brand-400/20 blur-[120px]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 10, repeat: Infinity }} />
        <motion.div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] translate-x-1/2 rounded-full bg-sky-400/20 blur-[100px]"
          animate={{ y: [0, -50, 0], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 8, repeat: Infinity, delay: 1 }} />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400">
            <ArrowLeft className="h-4 w-4" /> Beranda
          </button>
          <ThemePicker />
        </div>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="glass rounded-3xl p-7 shadow-glass-lg sm:p-9">

          {/* Logo */}
          <div className="flex flex-col items-center text-center">
            <Logo variant="icon" size={48} />
            <h1 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-ink-900 dark:text-white">
              GeoSense<span className="text-brand-600 dark:text-brand-400">Edu</span>
            </h1>
            <p className="mt-1 text-sm text-ink-500 dark:text-slate-400">Platform Pembelajaran Mitigasi Bencana Berbasis AI</p>
          </div>

          <AnimatePresence mode="wait">

            {/* ── MODE: Role Select ── */}
            {mode === 'role-select' && (
              <motion.div key="role" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="mt-7">
                <p className="mb-4 text-center text-sm font-medium text-ink-500 dark:text-slate-400">Pilih peran Anda untuk melanjutkan</p>
                <div className="grid gap-3">
                  {([['student', GraduationCap, 'Peserta Didik', 'Siswa & pelajar aktif'], ['teacher', BookOpen, 'Guru / Pendidik', 'Pengelola data & kurikulum']] as const).map(
                    ([r, Icon, label, desc]) => (
                      <div key={r} className={`grid gap-2 ${r === 'teacher' ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        <button onClick={() => handleRoleSelect(r, 'login')}
                          className="group flex items-center gap-3 rounded-2xl border border-brand-100 bg-white/60 p-4 text-left transition-all hover:border-brand-300 hover:bg-brand-50 hover:shadow-glass dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-brand-600">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600 group-hover:bg-brand-500 group-hover:text-white">
                            <Icon className="h-5 w-5" />
                          </span>
                          <div>
                            <p className="text-sm font-bold text-ink-900 dark:text-white">{label}</p>
                            <p className="text-[11px] text-ink-400 dark:text-slate-400 flex items-center gap-1"><LogIn className="h-3 w-3" /> Masuk</p>
                          </div>
                        </button>
                        {r === 'student' && (
                          <button onClick={() => handleRoleSelect(r, 'register')}
                            className="group flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white/60 p-4 text-left transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-glass dark:border-slate-700 dark:bg-slate-800/60">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white">
                              <UserPlus className="h-5 w-5" />
                            </span>
                            <div>
                              <p className="text-sm font-bold text-ink-900 dark:text-white">{label}</p>
                              <p className="text-[11px] text-ink-400 dark:text-slate-400 flex items-center gap-1"><UserPlus className="h-3 w-3" /> Daftar</p>
                            </div>
                          </button>
                        )}
                        <p className={`${r === 'teacher' ? 'col-span-1' : 'col-span-2'} -mt-1 text-center text-[10px] text-ink-400`}>{desc}</p>
                      </div>
                    )
                  )}
                </div>
              </motion.div>
            )}

            {/* ── MODE: Login ── */}
            {mode === 'login' && (
              <motion.form key="login" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                onSubmit={handleLogin} className="mt-7 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <button type="button" onClick={() => setMode('role-select')} className="text-sm text-ink-500 hover:text-ink-900 dark:text-slate-400 flex items-center gap-1"><ArrowLeft className="h-4 w-4" /></button>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                    {role === 'teacher' ? <BookOpen className="h-3.5 w-3.5" /> : <GraduationCap className="h-3.5 w-3.5" />}
                    {role === 'teacher' ? 'Guru' : 'Peserta Didik'} — Masuk
                  </span>
                </div>

                {[{ id: 'email', label: 'Email', value: loginEmail, set: setLoginEmail, type: 'email', icon: Mail, placeholder: 'email@geosense.edu', autoComplete: 'email' },
                ].map(({ id, label, value, set, type, icon: Icon, placeholder, autoComplete }) => (
                  <div key={label} className="space-y-1.5">
                    <label htmlFor={id} className="text-sm font-medium text-ink-700 dark:text-slate-300">{label}</label>
                    <div className="relative">
                      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                      <input id={id} name={id} type={type} value={value} onChange={e => set(e.target.value)} placeholder={placeholder} autoComplete={autoComplete}
                        className="w-full rounded-xl border border-brand-100 bg-white/70 py-3 pl-10 pr-4 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800/70 dark:text-white" />
                    </div>
                  </div>
                ))}
                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-sm font-medium text-ink-700 dark:text-slate-300">Kata Sandi</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <input id="password" name="password" type={showLoginPw ? 'text' : 'password'} value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password"
                      className="w-full rounded-xl border border-brand-100 bg-white/70 py-3 pl-10 pr-12 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800/70 dark:text-white" />
                    <button type="button" onClick={() => setShowLoginPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600">
                      {showLoginPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 text-sm font-semibold text-white shadow-glass transition-all hover:bg-brand-700 disabled:opacity-60">
                  {loading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" /> : <><LogIn className="h-4 w-4" /> Masuk</>}
                </button>
                <p className="text-center text-xs text-ink-500">
                  Belum punya akun?{' '}
                  <button type="button" onClick={() => setMode('register')} className="font-bold text-brand-600 hover:underline">Daftar di sini</button>
                </p>
              </motion.form>
            )}

            {/* ── MODE: Register ── */}
            {mode === 'register' && (
              <motion.form key="register" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                onSubmit={handleRegister} className="mt-6 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <button type="button" onClick={() => setMode('role-select')} className="text-sm text-ink-500 hover:text-ink-900 dark:text-slate-400 flex items-center gap-1"><ArrowLeft className="h-4 w-4" /></button>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <UserPlus className="h-3.5 w-3.5" /> Daftar Akun Baru
                  </span>
                </div>

                {/* Name */}
                <div className="space-y-1">
                  <label htmlFor="reg-name" className="text-xs font-bold text-ink-700 dark:text-slate-300">Nama Lengkap <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <input id="reg-name" name="reg-name" value={regName} onChange={e => setRegName(e.target.value)} placeholder="Nama lengkap Anda" autoComplete="name"
                      className="w-full rounded-xl border border-brand-100 bg-white/70 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800/70 dark:text-white" />
                  </div>
                </div>
                {/* Email */}
                <div className="space-y-1">
                  <label htmlFor="reg-email" className="text-xs font-bold text-ink-700 dark:text-slate-300">Email <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <input id="reg-email" name="reg-email" type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="email@geosense.edu" autoComplete="email"
                      className="w-full rounded-xl border border-brand-100 bg-white/70 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800/70 dark:text-white" />
                  </div>
                </div>
                {/* Password */}
                <div className="space-y-1">
                  <label htmlFor="reg-password" className="text-xs font-bold text-ink-700 dark:text-slate-300">Kata Sandi <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <input id="reg-password" name="reg-password" type={showRegPw ? 'text' : 'password'} value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="Min. 6 karakter" autoComplete="new-password"
                      className="w-full rounded-xl border border-brand-100 bg-white/70 py-2.5 pl-10 pr-12 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800/70 dark:text-white" />
                    <button type="button" onClick={() => setShowRegPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400">
                      {showRegPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {/* Confirm */}
                <div className="space-y-1">
                  <label htmlFor="reg-confirm" className="text-xs font-bold text-ink-700 dark:text-slate-300">Konfirmasi Kata Sandi <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <input id="reg-confirm" name="reg-confirm" type="password" value={regConfirm} onChange={e => setRegConfirm(e.target.value)} placeholder="Ulangi kata sandi"
                      className={`w-full rounded-xl border bg-white/70 py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 dark:bg-slate-800/70 dark:text-white ${regConfirm && regPassword !== regConfirm ? 'border-red-400 focus:ring-red-100' : 'border-brand-100 focus:border-brand-300 focus:ring-brand-100 dark:border-slate-700'}`} />
                  </div>
                </div>

                {/* Gender + Grade/Section */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="reg-gender" className="text-xs font-bold text-ink-700 dark:text-slate-300">Jenis Kelamin</label>
                    <select id="reg-gender" name="reg-gender" value={regGender} onChange={e => setRegGender(e.target.value as Gender)}
                      className="w-full rounded-xl border border-brand-100 bg-white/70 py-2.5 px-3 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800/70 dark:text-white">
                      <option value="male">Laki-laki</option>
                      <option value="female">Perempuan</option>
                      <option value="other">Lainnya</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1">
                    <label htmlFor="reg-grade" className="text-xs font-bold text-ink-700 dark:text-slate-300">Tingkat Kelas <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <School className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                      <select id="reg-grade" name="reg-grade" value={regGrade} onChange={e => setRegGrade(e.target.value as 'X' | 'XI' | 'XII')}
                        className="w-full rounded-xl border border-brand-100 bg-white/70 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800/70 dark:text-white">
                        <option value="X">Kelas X</option>
                        <option value="XI">Kelas XI</option>
                        <option value="XII">Kelas XII</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section (Ruang/Nomor) */}
                {role === 'student' && (
                <div className="space-y-1">
                  <label htmlFor="reg-section" className="text-xs font-bold text-ink-700 dark:text-slate-300">Ruang/No. Kelas (Contoh: "1") <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <School className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <input id="reg-section" name="reg-section" type="number" min="1" value={regSection} onChange={e => setRegSection(e.target.value)} placeholder='1'
                      className="w-full rounded-xl border border-brand-100 bg-white/70 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800/70 dark:text-white" />
                  </div>
                </div>
                )}

                {/* Date of birth optional */}
                <div className="space-y-1">
                  <label htmlFor="reg-dob" className="text-xs font-bold text-ink-700 dark:text-slate-300">Tanggal Lahir <span className="text-ink-400 font-normal">(opsional)</span></label>
                  <div className="relative">
                    <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <input id="reg-dob" name="reg-dob" type="date" value={regDob} onChange={e => setRegDob(e.target.value)}
                      className="w-full rounded-xl border border-brand-100 bg-white/70 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800/70 dark:text-white" />
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white shadow-glass transition-all hover:bg-emerald-700 disabled:opacity-60">
                  {loading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" /> : <><UserPlus className="h-4 w-4" /> Buat Akun</>}
                </button>
                <p className="text-center text-xs text-ink-500">
                  Sudah punya akun?{' '}
                  <button type="button" onClick={() => setMode('login')} className="font-bold text-brand-600 hover:underline">Masuk di sini</button>
                </p>
              </motion.form>
            )}

          </AnimatePresence>
        </motion.div>

        {/* Tech badges */}
        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-ink-400 dark:text-slate-500">
          <span className="flex items-center gap-1.5"><Brain className="h-3.5 w-3.5" /> AI</span>
          <span className="flex items-center gap-1.5"><Boxes className="h-3.5 w-3.5" /> Digital Twin</span>
          <span className="flex items-center gap-1.5"><Satellite className="h-3.5 w-3.5" /> Geospasial</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> SPAB</span>
        </div>
      </div>
    </div>
  );
}
