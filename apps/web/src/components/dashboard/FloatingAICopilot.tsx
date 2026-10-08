import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Sparkles,
  Send,
  X,
  Minimize2,
  Maximize2,
  ExternalLink,
  Loader2,
  RefreshCw,
  Compass,
  CloudSun,
  Map as MapIcon,
  LayoutDashboard,
  Brain,
  ShieldCheck,
  ChevronRight,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { buildAISummary } from "@/data/userProfiles";
import { askChatbotAI } from "@/services/geminiService";

interface NavigationAction {
  label: string;
  path: string;
  event?: { name: string; detail?: any };
  icon: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  loading?: boolean;
  action?: NavigationAction;
  timestamp: string;
}

const findNavigationIntent = (query: string): NavigationAction | null => {
  const lower = query.toLowerCase();

  if (
    lower.includes("cuaca") ||
    lower.includes("weather") ||
    lower.includes("hujan") ||
    lower.includes("angin") ||
    lower.includes("iklim") ||
    lower.includes("suhu") ||
    lower.includes("pancaroba")
  ) {
    return {
      label: "Buka Panel Cuaca & Iklim",
      path: "/app/maps?open=weather",
      event: { name: "harmony:open-weather", detail: { domain: "weather" } },
      icon: "⛅",
    };
  }

  if (
    lower.includes("lapisan") ||
    lower.includes("layer") ||
    lower.includes("basemap") ||
    lower.includes("pengaturan peta")
  ) {
    return {
      label: "Buka Lapisan & Mode Peta",
      path: "/app/maps",
      event: { name: "harmony:open-layers" },
      icon: "🗺️",
    };
  }

  if (
    lower.includes("peta") ||
    lower.includes("map") ||
    lower.includes("harmony maps") ||
    lower.includes("lintasan")
  ) {
    return {
      label: "Buka Harmony Maps",
      path: "/app/maps",
      icon: "🗺️",
    };
  }

  if (
    lower.includes("geospatial") ||
    lower.includes("studio") ||
    lower.includes("citra satelit") ||
    lower.includes("satelit")
  ) {
    return {
      label: "Buka Geospatial Studio",
      path: "/app/geospatial",
      icon: "🛰️",
    };
  }

  if (
    lower.includes("dasbor") ||
    lower.includes("dashboard") ||
    lower.includes("beranda")
  ) {
    return {
      label: "Buka Dashboard Utama",
      path: "/app/dashboard",
      icon: "📊",
    };
  }

  if (
    lower.includes("ai learning") ||
    lower.includes("belajar ai") ||
    lower.includes("pembelajaran ai")
  ) {
    return {
      label: "Buka AI Learning",
      path: "/app/ai-learning",
      icon: "🧠",
    };
  }

  if (
    lower.includes("simulasi") ||
    lower.includes("soal") ||
    lower.includes("pertanyaan bencana") ||
    lower.includes("quiz") ||
    lower.includes("kuis")
  ) {
    return {
      label: "Buka Simulasi Pertanyaan Bencana",
      path: "/app/simulation",
      icon: "⚡",
    };
  }

  if (
    lower.includes("twin") ||
    lower.includes("digital twin") ||
    lower.includes("skenario")
  ) {
    return {
      label: "Buka Harmony Digital Twin",
      path: "/app/digital-twin",
      icon: "📦",
    };
  }

  if (
    lower.includes("game") ||
    lower.includes("main") ||
    lower.includes("room")
  ) {
    return {
      label: "Buka Game Edukasi",
      path: "/app/student-game",
      icon: "🎮",
    };
  }

  if (
    lower.includes("skor") ||
    lower.includes("gss") ||
    lower.includes("harmony score")
  ) {
    return {
      label: "Buka Harmony Score (GSS)",
      path: "/app/gss",
      icon: "📈",
    };
  }

  if (
    lower.includes("resilience") ||
    lower.includes("ketahanan")
  ) {
    return {
      label: "Buka Ketahanan Sekolah",
      path: "/app/resilience",
      icon: "🛡️",
    };
  }

  if (
    lower.includes("survei") ||
    lower.includes("survey")
  ) {
    return {
      label: "Buka Survey Analytics",
      path: "/app/survey",
      icon: "📋",
    };
  }

  if (
    lower.includes("guru") ||
    lower.includes("teacher")
  ) {
    return {
      label: "Buka Dashboard Guru",
      path: "/app/teacher",
      icon: "👨‍🏫",
    };
  }

  if (
    lower.includes("event") ||
    lower.includes("lomba") ||
    lower.includes("acara")
  ) {
    return {
      label: "Buka Events & Lomba",
      path: "/app/events",
      icon: "🏆",
    };
  }

  if (
    lower.includes("akun") ||
    lower.includes("profil") ||
    lower.includes("user account")
  ) {
    return {
      label: "Buka Akun Pengguna",
      path: "/app/dev-dashboard",
      icon: "👤",
    };
  }

  return null;
};

export function FloatingAICopilot() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, currentProfile } = useAuth();

  const isMapsRoute = location.pathname.includes("/app/maps");

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => [
    {
      id: "welcome",
      role: "ai",
      text: currentUser
        ? `Halo ${currentUser.name}! 👋 Saya Harmony AI Copilot. Saya bisa menjawab pertanyaan mitigasi bencana, geospasial, cuaca, dan membantu Anda membuka tab atau aplikasi secara otomatis!`
        : "Halo! 👋 Saya Harmony AI Copilot. Tanya apa saja seputar mitigasi bencana, atau ketik 'buka cuaca' / 'buka peta' untuk langsung berpindah tab!",
      timestamp: new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);
  const [chatInput, setChatInput] = useState<string>("");
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const chatHistory = useRef<
    { role: "user" | "model"; parts: { text: string }[] }[]
  >([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [chatMessages, isOpen]);

  const getProfileSummary = useCallback(() => {
    if (!currentUser || !currentProfile) return undefined;
    return buildAISummary(currentProfile, currentUser.name);
  }, [currentUser, currentProfile]);

  const executeNavigationAction = useCallback(
    (action: NavigationAction) => {
      if (action.path) {
        navigate(action.path);
      }
      if (action.event) {
        // Dispatch custom event for real-time in-page actions (like weather modal, layer settings)
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent(action.event!.name, {
              detail: action.event!.detail,
            }),
          );
        }, 120);
      }
    },
    [navigate],
  );

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || chatInput).trim();
    if (!text || chatLoading) return;

    setChatInput("");
    const nowTime = new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text,
      timestamp: nowTime,
    };

    const navIntent = findNavigationIntent(text);

    const loadingMsg: ChatMessage = {
      id: `l-${Date.now()}`,
      role: "ai",
      text: "",
      loading: true,
      timestamp: nowTime,
    };

    setChatMessages((prev) => [...prev, userMsg, loadingMsg]);
    setChatLoading(true);

    if (navIntent) {
      // Auto execute navigation if intent is clear
      executeNavigationAction(navIntent);
    }

    chatHistory.current.push({ role: "user", parts: [{ text }] });

    try {
      let reply = "";
      if (
        navIntent &&
        (text.toLowerCase().startsWith("buka") ||
          text.toLowerCase().startsWith("ke ") ||
          text.toLowerCase().startsWith("lihat ") ||
          text.toLowerCase() === "cuaca" ||
          text.toLowerCase() === "peta")
      ) {
        reply = `Siap! Saya langsung membuka **${navIntent.label}** untuk Anda sekarang. ${navIntent.icon}\n\nAda hal lain yang ingin Anda ketahui atau navigasikan?`;
      } else {
        reply = await askChatbotAI(
          text,
          chatHistory.current,
          getProfileSummary(),
        );
      }

      chatHistory.current.push({ role: "model", parts: [{ text: reply }] });

      setChatMessages((prev) =>
        prev.map((m) =>
          m.loading
            ? {
                ...m,
                text: reply,
                loading: false,
                action: navIntent || undefined,
              }
            : m,
        ),
      );
    } catch {
      const fallbackReply = navIntent
        ? `Membuka **${navIntent.label}** untuk Anda. ${navIntent.icon}`
        : "Maaf, terjadi kendala saat menghubungi asisten AI. Silakan coba lagi sebentar ya!";

      setChatMessages((prev) =>
        prev.map((m) =>
          m.loading
            ? {
                ...m,
                text: fallbackReply,
                loading: false,
                action: navIntent || undefined,
              }
            : m,
        ),
      );
    } finally {
      setChatLoading(false);
    }
  };

  const quickPrompts = [
    { label: "Buka Cuaca ⛅", query: "buka cuaca" },
    { label: "Buka Peta 🗺️", query: "buka peta" },
    { label: "Studio Geospasial 🛰️", query: "buka studio geospasial" },
    { label: "Dashboard 📊", query: "buka dashboard" },
    { label: "Tips Gempa 🚨", query: "bagaimana mitigasi saat gempa bumi?" },
  ];

  return (
    <>
      {/* Floating Small Square Trigger Button */}
      <div
        className={`fixed z-[100010] transition-all duration-300 pointer-events-auto right-6 ${
          isMapsRoute ? "bottom-[88px] sm:bottom-[94px]" : "bottom-6"
        }`}
      >
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`relative flex items-center justify-center w-12 h-12 rounded-2xl backdrop-blur-xl border shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer group ${
            isOpen
              ? "bg-brand-600 border-brand-400 text-white shadow-brand-500/30"
              : "bg-slate-900/90 dark:bg-slate-900/95 hover:bg-slate-900 border-white/20 dark:border-slate-700/80 text-white shadow-indigo-500/20"
          }`}
          title="Tanya Harmony AI Copilot (Buka Tab, Cuaca, Mitigasi, dll)"
          aria-label="Buka Asisten Harmony AI"
        >
          {isOpen ? (
            <X className="w-5 h-5 text-white transition-transform group-hover:rotate-90 duration-300" />
          ) : (
            <>
              <Bot className="w-5 h-5 text-indigo-300 group-hover:text-white transition-colors" />
              {/* Online Pulse Indicator */}
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </>
          )}

          {/* Desktop Hover Label */}
          {!isOpen && (
            <div className="pointer-events-none absolute right-full mr-2.5 top-1/2 -translate-y-1/2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 whitespace-nowrap z-[100030] hidden sm:block">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/95 backdrop-blur-md text-white text-xs font-semibold shadow-xl border border-slate-700/80">
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                <span>AI Copilot & Navigasi</span>
              </div>
            </div>
          )}
        </button>
      </div>

      {/* Floating AI Chat Window / Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="ai-copilot-window"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className={`fixed z-[100020] right-4 sm:right-6 rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden text-slate-800 dark:text-slate-100 pointer-events-auto ${
              isExpanded
                ? "bottom-4 sm:bottom-6 w-[94vw] sm:w-[540px] h-[85vh]"
                : `${isMapsRoute ? "bottom-[148px] sm:bottom-[154px]" : "bottom-20 sm:bottom-22"} w-[92vw] sm:w-[410px] h-[540px] max-h-[82vh]`
            }`}
            style={{ fontFamily: "Inter, system-ui, sans-serif" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-800/50 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-brand-600 text-white shadow-xs">
                  <Bot className="h-4 w-4" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-slate-900" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white leading-tight flex items-center gap-1.5">
                    <span>Harmony AI Copilot</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                      Auto-Nav
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    Bisa tanya bencana & buka tab aplikasi
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsExpanded((prev) => !prev)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title={isExpanded ? "Perkecil Jendela" : "Perbesar Jendela"}
                >
                  {isExpanded ? (
                    <Minimize2 className="h-3.5 w-3.5" />
                  ) : (
                    <Maximize2 className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Tutup Jendela AI"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Quick Navigation Chips */}
            <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-100 dark:border-slate-800/60 overflow-x-auto scrollbar-none bg-slate-50/40 dark:bg-slate-900/40">
              {quickPrompts.map((p, idx) => (
                <button
                  key={`quick-chip-${idx}`}
                  type="button"
                  onClick={() => handleSendMessage(p.query)}
                  className="shrink-0 px-2.5 py-1 rounded-full text-[10.5px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-brand-600 text-white rounded-tr-none"
                        : "bg-slate-100/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/60 rounded-tl-none"
                    }`}
                  >
                    {msg.loading ? (
                      <div className="flex items-center gap-2 py-1 text-slate-500 dark:text-slate-400">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-500" />
                        <span className="text-[11px] font-medium">
                          Harmony AI sedang berpikir & menyiapkan aksi...
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="whitespace-pre-wrap">{msg.text}</div>

                        {/* Interactive Navigation Action Pill if triggered */}
                        {msg.action && (
                          <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-2">
                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <span>✓</span> Aksi Terbuka
                            </span>
                            <button
                              type="button"
                              onClick={() => executeNavigationAction(msg.action!)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-brand-600 hover:bg-brand-700 text-white transition-colors cursor-pointer shadow-xs"
                            >
                              <span>{msg.action.icon}</span>
                              <span>{msg.action.label}</span>
                              <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1 px-1">
                    {msg.timestamp}
                  </span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-2.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/60 backdrop-blur-md flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Tanya atau ketik 'buka cuaca', 'buka peta'..."
                disabled={chatLoading}
                className="flex-1 px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || chatLoading}
                className="p-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white transition-all cursor-pointer disabled:cursor-not-allowed shadow-md hover:scale-105 active:scale-95 shrink-0"
                title="Kirim pesan"
              >
                {chatLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
