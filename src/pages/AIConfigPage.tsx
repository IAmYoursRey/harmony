import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Bot, GraduationCap, Save, CheckCircle, XCircle, ArrowLeft, Eye, EyeOff, Info, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function AIConfigPage() {
  const { aiKeys, updateAIKeys } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();

  const [quizKey, setQuizKey] = useState('');
  const [chatKey, setChatKey] = useState('');
  const [showQuizKey, setShowQuizKey] = useState(false);
  const [showChatKey, setShowChatKey] = useState(false);
  const [testing, setTesting] = useState<'quiz' | 'chat' | null>(null);
  const [testResults, setTestResults] = useState<{ quiz?: boolean; chat?: boolean }>({});

  useEffect(() => {
    setQuizKey(aiKeys.quizKey);
    setChatKey(aiKeys.chatKey);
  }, [aiKeys]);

  const handleSave = () => {
    updateAIKeys({ quizKey: quizKey.trim(), chatKey: chatKey.trim() });
    show('Kunci API berhasil disimpan!', 'success');
  };

  const testKey = async (type: 'quiz' | 'chat') => {
    const key = type === 'quiz' ? quizKey.trim() : chatKey.trim();
    if (!key) { show('Isi kunci API terlebih dahulu', 'error'); return; }

    setTesting(type);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'Hello, respond with OK' }] }] }),
        }
      );
      const ok = response.ok;
      setTestResults(prev => ({ ...prev, [type]: ok }));
      show(ok ? `Kunci ${type === 'quiz' ? 'Soal AI' : 'Chatbot AI'} valid & terhubung!` : 'Kunci tidak valid. Periksa kembali.', ok ? 'success' : 'error');
    } catch {
      setTestResults(prev => ({ ...prev, [type]: false }));
      show('Gagal menguji koneksi. Periksa koneksi internet.', 'error');
    } finally {
      setTesting(null);
    }
  };

  const StatusBadge = ({ valid }: { valid?: boolean }) => {
    if (valid === undefined) return null;
    return valid
      ? <span className="flex items-center gap-1 text-xs font-bold text-emerald-600"><CheckCircle className="h-3.5 w-3.5" /> Valid</span>
      : <span className="flex items-center gap-1 text-xs font-bold text-red-500"><XCircle className="h-3.5 w-3.5" /> Tidak valid</span>;
  };

  return (
    <div className="relative flex min-h-screen items-start justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12">
      <div className="absolute inset-0 -z-10 bg-grid-pattern bg-[size:32px_32px] opacity-10" />

      <div className="w-full max-w-xl">
        <button onClick={() => navigate(-1)} className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-brand-600 dark:text-slate-400">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </button>

        <div className="rounded-3xl glass p-7 shadow-glass-lg space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-glow mb-3">
              <KeyRound className="h-7 w-7 text-white" />
            </div>
            <h1 className="font-display text-2xl font-extrabold text-ink-900 dark:text-white">Konfigurasi API Kecerdasan Buatan</h1>
            <p className="mt-1 text-sm text-ink-500 dark:text-slate-400">Isi kunci API dari Google AI Studio. Kunci disimpan hanya di perangkat ini.</p>
          </div>

          {/* Info alert */}
          <div className="flex gap-3 rounded-xl bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 p-4 text-sm text-brand-700 dark:text-brand-300">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              Dapatkan API key gratis di <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="font-bold underline">aistudio.google.com</a>. Anda bisa menggunakan satu key yang sama untuk keduanya.
            </div>
          </div>

          {/* Quiz AI Key */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-bold text-ink-800 dark:text-white">
                <GraduationCap className="h-4 w-4 text-brand-600" />
                Kunci AI Soal Esai (Quiz AI)
              </label>
              <StatusBadge valid={testResults.quiz} />
            </div>
            <p className="text-xs text-ink-500 dark:text-slate-400">Digunakan untuk: membuat soal esai adaptif & mengoreksi jawaban siswa secara otomatis.</p>
            <div className="relative">
              <input
                type={showQuizKey ? 'text' : 'password'}
                value={quizKey}
                onChange={e => setQuizKey(e.target.value)}
                placeholder="Masukkan API Key Google AI Studio..."
                className="w-full rounded-xl border border-brand-100 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 py-3 px-4 pr-24 text-sm font-mono outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:focus:border-brand-500"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <button onClick={() => setShowQuizKey(s => !s)} className="p-1.5 rounded-lg hover:bg-brand-50 dark:hover:bg-slate-700 text-ink-400">
                  {showQuizKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button onClick={() => testKey('quiz')} disabled={testing === 'quiz'} className="px-2.5 py-1 text-[11px] font-bold bg-brand-100 text-brand-700 rounded-lg hover:bg-brand-200 disabled:opacity-50">
                  {testing === 'quiz' ? '...' : 'Uji'}
                </button>
              </div>
            </div>
          </div>

          {/* Chatbot AI Key */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-bold text-ink-800 dark:text-white">
                <Bot className="h-4 w-4 text-brand-600" />
                Kunci AI Chatbot (GeoBot)
              </label>
              <StatusBadge valid={testResults.chat} />
            </div>
            <p className="text-xs text-ink-500 dark:text-slate-400">Digunakan untuk: chatbot interaktif yang membaca profil & data kemampuan siswa.</p>
            <div className="relative">
              <input
                type={showChatKey ? 'text' : 'password'}
                value={chatKey}
                onChange={e => setChatKey(e.target.value)}
                placeholder="Masukkan API Key Google AI Studio..."
                className="w-full rounded-xl border border-brand-100 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 py-3 px-4 pr-24 text-sm font-mono outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:focus:border-brand-500"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <button onClick={() => setShowChatKey(s => !s)} className="p-1.5 rounded-lg hover:bg-brand-50 dark:hover:bg-slate-700 text-ink-400">
                  {showChatKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button onClick={() => testKey('chat')} disabled={testing === 'chat'} className="px-2.5 py-1 text-[11px] font-bold bg-brand-100 text-brand-700 rounded-lg hover:bg-brand-200 disabled:opacity-50">
                  {testing === 'chat' ? '...' : 'Uji'}
                </button>
              </div>
            </div>
          </div>

          {/* Quick fill same key */}
          {quizKey && !chatKey && (
            <button onClick={() => setChatKey(quizKey)} className="w-full text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline">
              Gunakan kunci yang sama untuk Chatbot AI
            </button>
          )}

          {/* Save */}
          <button
            onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 text-sm font-bold text-white shadow-glass hover:bg-brand-700 hover:shadow-glow transition-all"
          >
            <Save className="h-4 w-4" /> Simpan Konfigurasi
          </button>
        </div>

        {/* Info footer */}
        <div className="mt-4 text-center text-xs text-ink-400 dark:text-slate-500 flex items-center justify-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          Kunci API tersimpan hanya di browser Anda dan tidak dikirim ke server manapun.
        </div>
      </div>
    </div>
  );
}
