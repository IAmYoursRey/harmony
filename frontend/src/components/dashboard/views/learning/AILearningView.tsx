import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, SendHorizonal, BookOpen, Zap, Waves, Flame, Wind, AlertTriangle, Trophy, Star, BarChart3, ChevronRight, RotateCcw, CheckCircle, XCircle, Loader2, PenLine, MessageSquare, Award, TrendingUp, Lock, Mountain, CloudRain, Trees, Play, CheckCircle2, ArrowRight, ArrowLeft, Clock, AlertCircle, Compass, CornerDownRight, HelpCircle, FileText, Heart, Shield, MapPin, Sparkles, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getProfile, buildAISummary, recordQuizSession, createInitialTopicScore } from '@/data/userProfiles';
import { askChatbotAI, generateQuizQuestions, evaluateQuizAnswers, type QuizQuestion, type QuizEvaluation, type QuizDifficulty } from '@/services/geminiService';
import { LogoSpinner } from '@/components/ui/LogoSpinner';
import { Link } from 'react-router-dom';
import { Donut } from '@/components/dashboard/Charts';
import { useI18n } from '@/hooks/useI18n';

import { generateSmartSimulationQuestions } from '@/services/geminiService';
import { useSchool } from '@/hooks/useSchool';


// --- Merged from AILearningView.tsx ---

// ── Topic definitions ─────────────────────────────────────────────────────────

const TOPICS = [
  { id: 'gempa', label: 'Gempa Bumi', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/20' },
  { id: 'banjir', label: 'Banjir', icon: Waves, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-200 dark:border-blue-500/20' },
  { id: 'tsunami', label: 'Tsunami', icon: Waves, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-500/10', border: 'border-cyan-200 dark:border-cyan-500/20' },
  { id: 'kebakaran', label: 'Kebakaran', icon: Flame, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-500/10', border: 'border-red-200 dark:border-red-500/20' },
  { id: 'angin', label: 'Angin Puting Beliung', icon: Wind, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-500/10', border: 'border-indigo-200 dark:border-indigo-500/20' },
  { id: 'longsor', label: 'Tanah Longsor', icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-500/10', border: 'border-orange-200 dark:border-orange-500/20' },
];

const LEVEL_COLORS: Record<QuizDifficulty, string> = {
  pemula: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200',
  menengah: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 border-amber-200',
  mahir: 'text-red-600 bg-red-50 dark:bg-red-500/10 border-red-200',
};

// ── Chat types ────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  loading?: boolean;
}

// ── Quiz session state ────────────────────────────────────────────────────────

type QuizPhase = 'topic-select' | 'loading' | 'answering' | 'evaluating' | 'results';


export function AILearningView() {
  const { currentUser, currentProfile, refreshProfile } = useAuth();
  const { t, locale } = useI18n();
  const isQuizReady = true; // Secured and handled by backend
  const isChatReady = true; // Secured and handled by backend
  const activeTab = useRef<'chat' | 'quiz'>('chat');
  const [tab, setTab] = useState<'chat' | 'quiz'>('chat');

  // ── Chatbot state ─────────────────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'ai',
      text: currentUser
        ? `Halo ${currentUser.name}! 👋 Saya GeoBot, asisten belajar mitigasi bencana Anda. Tanya apa saja seputar gempa bumi, banjir, tsunami, kebakaran, dan bencana alam lainnya!`
        : 'Halo! 👋 Saya GeoBot. Tanya apa saja seputar mitigasi bencana!',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatHistory = useRef<{ role: 'user' | 'model'; parts: { text: string }[] }[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Quiz state ────────────────────────────────────────────────────────────
  const [quizPhase, setQuizPhase] = useState<QuizPhase>('topic-select');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [evaluations, setEvaluations] = useState<QuizEvaluation[]>([]);
  const [levelUpInfo, setLevelUpInfo] = useState<{ levelUp: boolean; newLevel: QuizDifficulty; badge?: string } | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ── Profile-aware profile summary ─────────────────────────────────────────
  const getProfileSummary = useCallback(() => {
    if (!currentUser || !currentProfile) return undefined;
    return buildAISummary(currentProfile, currentUser.name);
  }, [currentUser, currentProfile]);

  // ── Send chat message ─────────────────────────────────────────────────────
  const handleSendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const text = chatInput.trim();
    setChatInput('');
    const userMsg: ChatMessage = { id: `u${Date.now()}`, role: 'user', text };
    const loadingMsg: ChatMessage = { id: `l${Date.now()}`, role: 'ai', text: '', loading: true };
    setChatMessages(prev => [...prev, userMsg, loadingMsg]);
    setChatLoading(true);

    chatHistory.current.push({ role: 'user', parts: [{ text }] });

    try {
      const reply = await askChatbotAI(text, chatHistory.current, getProfileSummary());
      chatHistory.current.push({ role: 'model', parts: [{ text: reply }] });
      setChatMessages(prev => prev.map(m => m.loading ? { ...m, text: reply, loading: false } : m));
    } catch {
      setChatMessages(prev => prev.map(m => m.loading ? { ...m, text: 'Maaf, terjadi kendala. Coba lagi ya!', loading: false } : m));
    } finally {
      setChatLoading(false);
    }
  };

  // ── Start quiz ────────────────────────────────────────────────────────────
  const startQuiz = async (topicId: string) => {
    setSelectedTopic(topicId);
    setQuizPhase('loading');
    setAnswers({});
    setEvaluations([]);
    setLevelUpInfo(null);

    const topicLabel = TOPICS.find(t => t.id === topicId)?.label ?? topicId;
    const profile = currentProfile;
    const topicScore = profile?.topicScores?.[topicLabel];
    const isFirst = !topicScore || topicScore.isFirstAttempt;
    const difficulty: QuizDifficulty = topicScore?.currentLevel ?? 'pemula';
    const count = isFirst ? 5 : difficulty === 'pemula' ? 3 : difficulty === 'menengah' ? 4 : 5;

    const qs = await generateQuizQuestions(
      topicLabel, difficulty, count, isFirst,
      topicScore?.weakTopics ?? [],
      topicScore?.strongTopics ?? []
    );
    setQuestions(qs);
    setQuizPhase('answering');
  };

  // ── Submit quiz ───────────────────────────────────────────────────────────
  const submitQuiz = async () => {
    setQuizPhase('evaluating');
    const evals = await evaluateQuizAnswers(questions, answers);
    setEvaluations(evals);

    if (currentUser) {
      const topicLabel = TOPICS.find(t => t.id === selectedTopic)?.label ?? selectedTopic;
      const totalScore = evals.length > 0 ? Math.round(evals.reduce((s, e) => s + e.score, 0) / evals.length) : 0;
      const weak = evals.filter(e => e.score < 60).map(e => questions.find(q => q.id === e.questionId)?.subTopic ?? '').filter(Boolean);
      const strong = evals.filter(e => e.score >= 80).map(e => questions.find(q => q.id === e.questionId)?.subTopic ?? '').filter(Boolean);
      await recordQuizSession(currentUser.id, topicLabel, totalScore, weak, strong);
      refreshProfile();
    }

    setQuizPhase('results');
  };

  const resetQuiz = () => {
    setQuizPhase('topic-select');
    setSelectedTopic('');
    setQuestions([]);
    setAnswers({});
    setEvaluations([]);
    setLevelUpInfo(null);
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const avgScore = evaluations.length > 0
    ? Math.round(evaluations.reduce((s, e) => s + e.score, 0) / evaluations.length)
    : 0;

  const topicTopic = TOPICS.find(t => t.id === selectedTopic);
  const profile = currentProfile;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden">
      {/* Header + tabs */}
      <div className="bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-4 py-4 text-white shadow-glass sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              <Bot className="h-3.5 w-3.5" /> GeoSense AI Learning Center
            </div>
            <h2 className="mt-2 font-display text-xl font-extrabold">
              {currentUser ? `Halo, ${currentUser.name} 👋` : 'Antarmuka Pembelajaran AI'}
            </h2>
            {currentProfile && (
              <p className="text-xs text-brand-100 mt-0.5">
                Kelas {currentProfile.grade} · {currentProfile.totalPoints} poin · {currentProfile.badges.length} lencana
              </p>
            )}
          </div>
          {/* Tab switcher */}
          <div className="flex bg-white/10 rounded-full p-1 gap-1">
            <button onClick={() => setTab('chat')} className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all ${tab === 'chat' ? 'bg-white text-brand-700 shadow' : 'text-white/80 hover:text-white'}`}>
              <MessageSquare className="h-3.5 w-3.5" /> GeoBot Chat
            </button>
            <button onClick={() => setTab('quiz')} className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all ${tab === 'quiz' ? 'bg-white text-brand-700 shadow' : 'text-white/80 hover:text-white'}`}>
              <PenLine className="h-3.5 w-3.5" /> Uji Kemampuan
            </button>
          </div>
        </div>
      </div>

      {/* ── TAB: CHATBOT ──────────────────────────────────────────────── */}
      {tab === 'chat' && (
        <div className="flex flex-1 flex-col overflow-hidden">
          {!isChatReady && (
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/20 px-4 py-2 text-xs text-amber-700 dark:text-amber-300">
              <Lock className="h-3.5 w-3.5 shrink-0" />
              {t('learning.geobot_api_missing', 'Kunci API GeoBot belum diisi. Isi VITE_GEMINI_CHAT_KEY di file .env lalu restart server.')}
            </div>
          )}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {chatMessages.map(msg => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'ai' && (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
                    <Bot className="h-4 w-4" />
                  </span>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${msg.role === 'ai' ? 'bg-white text-ink-900 border border-brand-50/60 dark:bg-slate-800 dark:text-white dark:border-slate-700' : 'bg-brand-600 text-white'}`}>
                  {msg.loading ? (
                    <div className="flex items-center gap-2 text-ink-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-xs italic">GeoBot sedang berpikir...</span>
                    </div>
                  ) : (
                    msg.text.split('\n').map((line, i) => (
                      <p key={i} className="mb-1 last:mb-0">
                        {line.split('**').map((chunk, ci) =>
                          ci % 2 === 1 ? <strong key={ci}>{chunk}</strong> : chunk
                        )}
                      </p>
                    ))
                  )}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Suggested prompts */}
          {chatMessages.length <= 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-2">
              {['Apa itu drop, cover, hold?', 'Bagaimana cara membuat tas siaga bencana?', 'Apa tanda-tanda akan terjadi tsunami?'].map(p => (
                <button key={p} onClick={() => { setChatInput(p); }} className="rounded-full border border-brand-100 bg-white/80 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50 dark:bg-slate-800 dark:text-brand-300 dark:border-slate-700">
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Input bar */}
          <div className="border-t border-brand-50 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm px-4 py-3">
            <div className="flex gap-3 rounded-2xl border border-brand-100 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-brand-200">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
                placeholder="Tanya GeoBot seputar mitigasi bencana..."
                className="flex-1 bg-transparent text-sm text-ink-900 placeholder:text-ink-400 dark:text-white dark:placeholder:text-slate-500 outline-none"
              />
              <button onClick={handleSendChat} disabled={!chatInput.trim() || chatLoading}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 transition-colors">
                <SendHorizonal className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: QUIZ ──────────────────────────────────────────────────── */}
      {tab === 'quiz' && (
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
          {!isQuizReady && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-4 py-3 text-xs text-amber-700 dark:text-amber-300">
              <Lock className="h-3.5 w-3.5 shrink-0" />
              {t('learning.quiz_api_missing', 'Kunci API Soal AI belum diisi. Soal menggunakan data demo. Isi VITE_GEMINI_QUIZ_KEY di file .env lalu restart server.')}
            </div>
          )}

          {/* ─ Phase: topic-select ─ */}
          {quizPhase === 'topic-select' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-display text-lg font-bold text-ink-900 dark:text-white">Pilih Topik Uji Kemampuan</h3>
                <p className="text-sm text-ink-500 dark:text-slate-400 mt-1">
                  AI akan membuat soal esai yang disesuaikan dengan kemampuan Anda saat ini. Jawaban Anda dinilai oleh AI secara otomatis.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {TOPICS.map(topicItem => {
                  const Icon = topicItem.icon;
                  const topicScore = profile?.topicScores?.[topicItem.label];
                  const level = topicScore?.currentLevel;
                  const avg = topicScore?.averageScore;
                  return (
                    <button key={topicItem.id} onClick={() => startQuiz(topicItem.id)}
                      className={`group flex flex-col items-start gap-2 rounded-2xl border ${topicItem.border} ${topicItem.bg} p-4 text-left transition-all hover:shadow-glass hover:-translate-y-0.5`}>
                      <Icon className={`h-6 w-6 ${topicItem.color}`} />
                      <p className="font-display text-sm font-bold text-ink-900 dark:text-white leading-tight">{topicItem.label}</p>
                      {level ? (
                        <div className="flex flex-col gap-1 w-full">
                           <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${LEVEL_COLORS[level]} w-fit`}>{level}</span>
                          <div className="w-full h-1 bg-black/10 rounded-full">
                            <div className="h-1 rounded-full bg-brand-500" style={{ width: `${avg ?? 0}%` }} />
                          </div>
                          <p className="text-[10px] text-ink-400">Rata-rata: {avg}%</p>
                        </div>
                      ) : (
                        <span className="text-[10px] font-semibold text-ink-400">{t('learning.not_tested_yet', 'Belum pernah diuji')}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Progress summary */}
              {profile && Object.keys(profile.topicScores).length > 0 && (
                <div className="rounded-2xl border border-brand-100 dark:border-slate-800 bg-white/60 dark:bg-slate-800/40 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="h-4 w-4 text-brand-600" />
                    <h4 className="font-bold text-sm text-ink-900 dark:text-white">Ringkasan Kemampuan Saya</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {Object.entries(profile.topicScores).map(([topic, score]) => (
                      <div key={topic} className="space-y-1">
                        <p className="text-[11px] font-bold text-ink-700 dark:text-slate-300 truncate">{topic}</p>
                        <div className="w-full h-1.5 bg-brand-100 dark:bg-slate-700 rounded-full">
                          <div className={`h-1.5 rounded-full transition-all ${score.averageScore >= 80 ? 'bg-emerald-500' : score.averageScore >= 60 ? 'bg-amber-500' : 'bg-red-400'}`}
                            style={{ width: `${score.averageScore}%` }} />
                        </div>
                        <p className="text-[10px] text-ink-400">{score.averageScore}% · {score.currentLevel}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─ Phase: loading ─ */}
          {quizPhase === 'loading' && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <LogoSpinner size="lg" />
              <div className="text-center">
                <p className="font-display font-bold text-ink-900 dark:text-white">AI sedang menyiapkan soal...</p>
                <p className="text-sm text-ink-500 dark:text-slate-400 mt-1">Soal dibuat khusus sesuai level & kelemahan Anda</p>
              </div>
            </div>
          )}

          {/* ─ Phase: answering ─ */}
          {quizPhase === 'answering' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-ink-900 dark:text-white">
                    {topicTopic?.label} — Soal Esai
                  </h3>
                  <p className="text-xs text-ink-500 mt-0.5">
                    {questions.length} soal · Level: <strong>{profile?.topicScores?.[topicTopic?.label ?? '']?.currentLevel ?? 'Pemula (Tes Awal)'}</strong>
                  </p>
                </div>
                <button onClick={resetQuiz} className="text-xs text-ink-400 hover:text-ink-600 flex items-center gap-1">
                  <RotateCcw className="h-3.5 w-3.5" /> Batal
                </button>
              </div>

              {questions.map((q, idx) => (
                <div key={q.id} className="rounded-2xl border border-brand-100 dark:border-slate-800 bg-white/80 dark:bg-slate-800/50 p-5 space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-sm font-semibold text-ink-900 dark:text-white leading-relaxed">{q.question}</p>
                  </div>
                  
                  {q.type === 'mcq' && q.options ? (
                    <div className="space-y-2 mt-3">
                      {q.options.map(opt => {
                        const optLetter = opt.charAt(0);
                        const isSelected = answers[q.id] === optLetter;
                        return (
                          <button
                            key={opt}
                            onClick={() => setAnswers(prev => ({ ...prev, [q.id]: optLetter }))}
                            className={`w-full flex items-center gap-3 p-3 text-left rounded-xl border text-sm transition-all ${
                              isSelected 
                                ? 'bg-brand-50 border-brand-400 text-brand-700 dark:bg-brand-500/20 dark:border-brand-500/50 dark:text-brand-300 shadow-sm' 
                                : 'bg-white border-brand-100 text-ink-700 hover:bg-brand-50/50 hover:border-brand-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span className={`flex shrink-0 h-6 w-6 items-center justify-center rounded-full border text-[11px] font-bold ${
                              isSelected ? 'bg-brand-600 border-brand-600 text-white' : 'border-ink-300 dark:border-slate-600'
                            }`}>
                              {optLetter}
                            </span>
                            <span className="flex-1">{opt.substring(3).trim()}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <>
                      <textarea
                        rows={4}
                        value={answers[q.id] ?? ''}
                        onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                        placeholder="Tulis jawaban Anda di sini..."
                        className="w-full mt-3 rounded-xl border border-brand-100 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-ink-900 dark:text-white placeholder:text-ink-400 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 resize-none"
                      />
                      <p className="text-[11px] text-ink-400">{(answers[q.id] ?? '').length} karakter</p>
                    </>
                  )}
                </div>
              ))}

              <button
                onClick={submitQuiz}
                disabled={questions.some(q => !(answers[q.id] ?? '').trim())}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 text-sm font-bold text-white shadow-glass hover:bg-brand-700 disabled:opacity-50 transition-all"
              >
                <ChevronRight className="h-4 w-4" /> Kumpulkan & Nilai Jawaban
              </button>
              {questions.some(q => !(answers[q.id] ?? '').trim()) && (
                <p className="text-center text-xs text-ink-400">{t('learning.answer_all_questions', 'Jawab semua soal terlebih dahulu sebelum mengumpulkan.')}</p>
              )}
            </div>
          )}

          {/* ─ Phase: evaluating ─ */}
          {quizPhase === 'evaluating' && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <LogoSpinner size="lg" />
              <div className="text-center">
                <p className="font-display font-bold text-ink-900 dark:text-white">AI sedang menilai jawaban Anda...</p>
                <p className="text-sm text-ink-500 dark:text-slate-400 mt-1">Proses ini memerlukan beberapa detik</p>
              </div>
            </div>
          )}

          {/* ─ Phase: results ─ */}
          {quizPhase === 'results' && (
            <div className="space-y-5">
              {/* Score summary card */}
              <div className={`rounded-2xl p-5 text-white shadow-glass-lg ${avgScore >= 80 ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' : avgScore >= 60 ? 'bg-gradient-to-br from-amber-500 to-amber-700' : 'bg-gradient-to-br from-red-500 to-red-700'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold opacity-80">Skor Anda</p>
                    <p className="font-display text-5xl font-extrabold mt-1">{avgScore}<span className="text-2xl">/100</span></p>
                    <p className="text-xs mt-2 opacity-80">
                      {avgScore >= 80 ? '🎉 Luar biasa! Pemahaman sangat baik.' : avgScore >= 60 ? '👍 Cukup baik, terus berlatih!' : '📚 Perlu belajar lebih banyak. Jangan menyerah!'}
                    </p>
                  </div>
                  <Trophy className="h-16 w-16 opacity-30" />
                </div>
              </div>

              {/* Level up notification */}
              {levelUpInfo?.levelUp && (
                <div className="flex items-center gap-3 rounded-2xl bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 p-4">
                  <Award className="h-8 w-8 text-brand-600 shrink-0" />
                  <div>
                    <p className="font-bold text-brand-700 dark:text-brand-300">Level Naik! 🎊</p>
                    <p className="text-sm text-ink-600 dark:text-slate-300">Anda telah naik ke level <strong>{levelUpInfo.newLevel}</strong> di topik ini!</p>
                    {levelUpInfo.badge && <p className="text-xs text-ink-500 mt-0.5">{levelUpInfo.badge}</p>}
                  </div>
                </div>
              )}

              {/* Per-question feedback */}
              <h4 className="font-display font-bold text-ink-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-brand-600" /> Umpan Balik Per Soal
              </h4>
              {questions.map((q, idx) => {
                const evalItem = evaluations.find(e => e.questionId === q.id);
                if (!evalItem) return null;
                return (
                  <div key={q.id} className="rounded-2xl border border-brand-100 dark:border-slate-800 bg-white/80 dark:bg-slate-800/50 p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-ink-900 dark:text-white leading-relaxed flex-1">{idx + 1}. {q.question}</p>
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-sm ${evalItem.score >= 80 ? 'bg-emerald-100 text-emerald-700' : evalItem.score >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {evalItem.score}
                      </div>
                    </div>
                    <div className="rounded-xl bg-brand-50/70 dark:bg-slate-700/50 px-4 py-3 text-xs text-ink-600 dark:text-slate-300">
                      <p className="font-bold text-ink-700 dark:text-white mb-1">Jawaban Anda:</p>
                      <p className="italic text-ink-500 dark:text-slate-400">
                        {q.type === 'mcq' ? (answers[q.id] ? `Pilihan ${answers[q.id]}` : '(Tidak dijawab)') : (answers[q.id] || '(kosong)')}
                      </p>
                    </div>
                    <div className={`flex items-start gap-2 rounded-xl p-3 text-xs ${evalItem.isCorrect ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300'}`}>
                      {evalItem.isCorrect ? <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                      <p>{evalItem.feedback}</p>
                    </div>
                  </div>
                );
              })}

              <div className="flex gap-3">
                <button onClick={resetQuiz} className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-brand-200 dark:border-slate-700 py-3 text-sm font-bold text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-slate-800">
                  <RotateCcw className="h-4 w-4" /> Pilih Topik Lain
                </button>
                <button onClick={() => startQuiz(selectedTopic)} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-bold text-white hover:bg-brand-700">
                  <PenLine className="h-4 w-4" /> Ulangi Topik Ini
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}



