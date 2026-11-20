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
import { askChatbotAI, MAX_CHAT_MEMORY, trimRollingChatMemory } from "@/services/geminiService";
import { copilotIntelligenceService } from "@/services/copilotIntelligenceService";

interface NavigationAction {
  label: string;
  path: string;
  event?: { name: string; detail?: any };
  icon?: string;
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
      label: "Panel Cuaca",
      path: "/app/maps?open=weather",
      event: { name: "harmony:open-weather", detail: { domain: "weather" } },
    };
  }

  if (
    lower.includes("lapisan") ||
    lower.includes("layer") ||
    lower.includes("basemap") ||
    lower.includes("pengaturan peta")
  ) {
    return {
      label: "Mode & Lapisan",
      path: "/app/maps",
      event: { name: "harmony:open-layers" },
    };
  }

  if (
    lower.includes("peta") ||
    lower.includes("map") ||
    lower.includes("harmony maps") ||
    lower.includes("lintasan")
  ) {
    return {
      label: "Peta Utama",
      path: "/app/maps",
    };
  }

  if (
    lower.includes("geospatial") ||
    lower.includes("studio") ||
    lower.includes("citra satelit") ||
    lower.includes("satelit")
  ) {
    return {
      label: "Studio Geospasial",
      path: "/app/geospatial",
    };
  }

  if (
    lower.includes("dasbor") ||
    lower.includes("dashboard") ||
    lower.includes("beranda")
  ) {
    return {
      label: "Dasbor Utama",
      path: "/app/dashboard",
    };
  }

  if (
    lower.includes("ai learning") ||
    lower.includes("belajar ai") ||
    lower.includes("pembelajaran ai")
  ) {
    return {
      label: "Tanya GeoBot",
      path: "/app/ai-learning",
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
      label: "Latihan Soal",
      path: "/app/simulation",
    };
  }

  if (
    lower.includes("twin") ||
    lower.includes("digital twin") ||
    lower.includes("skenario")
  ) {
    return {
      label: "Simulasi Denah",
      path: "/app/digital-twin",
    };
  }

  if (
    lower.includes("game") ||
    lower.includes("main") ||
    lower.includes("room")
  ) {
    return {
      label: "Ruang Sesi",
      path: "/app/student-game",
    };
  }

  if (
    lower.includes("skor") ||
    lower.includes("gss") ||
    lower.includes("harmony score")
  ) {
    return {
      label: "Skor Harmony",
      path: "/app/gss",
    };
  }

  if (
    lower.includes("resilience") ||
    lower.includes("ketahanan")
  ) {
    return {
      label: "Ketahanan Sekolah",
      path: "/app/resilience",
    };
  }

  if (
    lower.includes("survei") ||
    lower.includes("survey")
  ) {
    return {
      label: "Survei Sekolah",
      path: "/app/survey",
    };
  }

  if (
    lower.includes("guru") ||
    lower.includes("teacher")
  ) {
    return {
      label: "Dasbor Guru",
      path: "/app/teacher",
    };
  }

  if (
    lower.includes("event") ||
    lower.includes("lomba") ||
    lower.includes("acara")
  ) {
    return {
      label: "Agenda Sekolah",
      path: "/app/events",
    };
  }

  if (
    lower.includes("akun") ||
    lower.includes("profil") ||
    lower.includes("user account")
  ) {
    return {
      label: "Kelola Akun",
      path: "/app/dev-dashboard",
    };
  }

  return null;
};

export function FloatingAICopilot() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [hasMapOverlayOpen, setHasMapOverlayOpen] = useState<boolean>(false);
  const overlaySourcesRef = useRef<Record<string, boolean>>({});
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, currentProfile } = useAuth();

  const isMapsRoute = location.pathname.includes("/app/maps");

  useEffect(() => {
    const handleOverlayState = (event: Event) => {
      const detail = (event as CustomEvent<{ source?: string; open?: boolean }>).detail;
      const source = detail?.source || "maps";
      overlaySourcesRef.current[source] = Boolean(detail?.open);
      const anyOpen = Object.values(overlaySourcesRef.current).some(Boolean);
      setHasMapOverlayOpen(anyOpen);
    };
    window.addEventListener("harmony:map-overlay-state", handleOverlayState);
    return () => {
      window.removeEventListener("harmony:map-overlay-state", handleOverlayState);
    };
  }, []);

  useEffect(() => {
    if (!isMapsRoute) {
      overlaySourcesRef.current = {};
      setHasMapOverlayOpen(false);
    }
  }, [isMapsRoute]);
  const isHiddenRoute =
    location.pathname.startsWith("/login") ||
    location.pathname.startsWith("/school-selection") ||
    location.pathname.includes("/app/ai-learning") ||
    location.pathname.includes("/app/digital-twin");

  const createCopilotWelcome = useCallback(
    (): ChatMessage => ({
      id: "welcome",
      role: "ai",
      text: currentUser
        ? `Halo ${currentUser.name}! Mau tanya cuaca, progres akunmu, atau simulasi evakuasi SMAN 1 Ngoro? Boleh pakai Bahasa Indonesia atau Jawa sehari-hari.`
        : "Halo! Aku GeoBot Harmony. Tanya cuaca, peta, atau prosedur evakuasi sekolah aja — santai pakai Indonesia atau Jawa.",
      timestamp: new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    }),
    [currentUser],
  );

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => [createCopilotWelcome()]);
  const [chatInput, setChatInput] = useState<string>("");
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const chatHistory = useRef<
    { role: "user" | "model"; parts: { text: string }[] }[]
  >([]);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClearCopilotMemory = useCallback(() => {
    if (chatLoading) return;
    chatHistory.current = [];
    setChatMessages([createCopilotWelcome()]);
    setChatInput("");
  }, [chatLoading, createCopilotWelcome]);

  useEffect(() => {
    const handleOpenCopilot = () => {
      setIsOpen(true);
    };
    window.addEventListener("harmony:open-copilot", handleOpenCopilot);
    return () => {
      window.removeEventListener("harmony:open-copilot", handleOpenCopilot);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      const el = chatScrollRef.current;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
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
        // Dispatch custom event for real-time in-page actions (like weather modal, layer settings, locate)
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent(action.event!.name, {
              detail: action.event!.detail,
            }),
          );
        }, 150);
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

    setChatMessages((prev) => {
      const conversational = prev.filter((m) => m.id !== "welcome");
      return trimRollingChatMemory([...conversational, userMsg, loadingMsg], MAX_CHAT_MEMORY);
    });
    setChatLoading(true);

    chatHistory.current = trimRollingChatMemory(
      [...chatHistory.current, { role: "user", parts: [{ text }] }],
      MAX_CHAT_MEMORY,
    );

    try {
      let reply = "";
      let actionToAttach: NavigationAction | undefined = undefined;

      // 1. Cek apakah pengguna menanyakan fitur yang BELUM ADA / TIDAK TERSEDIA di platform Harmony
      if (copilotIntelligenceService.checkUnavailableFeature(text)) {
        const unavail = copilotIntelligenceService.getUnavailableFeatureResponse();
        reply = unavail.text;
      }
      // 2. Cek apakah pengguna meminta penjelasan arsitektur seluruh fitur Harmony
      else if (copilotIntelligenceService.isAskingAllFeatures(text)) {
        const summary = copilotIntelligenceService.getAllFeaturesSummary();
        reply = summary.text;
        actionToAttach = summary.action;
      }
      // 3. Cek apakah pengguna menanyakan daerah mana saja yang sedang hujan
      else if (copilotIntelligenceService.isRainRegionsQuery(text)) {
        const rainStatus = await copilotIntelligenceService.fetchIndonesianRainStatus();
        reply = rainStatus.text;
        actionToAttach = rainStatus.action;
        executeNavigationAction(actionToAttach);
      }
      // 4. Cek apakah pengguna menanyakan lokasi dan ketinggian / elevasi tempat mereka
      else if (copilotIntelligenceService.isLocationElevationQuery(text)) {
        const locStatus = await copilotIntelligenceService.handleLocationAndElevation();
        reply = locStatus.text;
        actionToAttach = locStatus.action;
        if (actionToAttach) {
          executeNavigationAction(actionToAttach);
        }
      }
      // 5. Cek apakah pengguna menanyakan cuaca hari ini / cuaca sekarang
      else if (copilotIntelligenceService.isCurrentWeatherQuery(text)) {
        const weatherStatus = await copilotIntelligenceService.fetchCurrentWeather(text);
        reply = weatherStatus.text;
        actionToAttach = weatherStatus.action;
        executeNavigationAction(actionToAttach);
      }
      // 6. Cek perintah navigasi cepat ("buka ...", "ke ...", "lihat ...")
      else if (
        navIntent &&
        (text.toLowerCase().startsWith("buka") ||
          text.toLowerCase().startsWith("ke ") ||
          text.toLowerCase().startsWith("lihat ") ||
          text.toLowerCase() === "cuaca" ||
          text.toLowerCase() === "peta")
      ) {
        reply = `Membuka **${navIntent.label}** sekarang.`;
        actionToAttach = navIntent;
        executeNavigationAction(navIntent);
      }
      // 7. Dialog cerdas umum via Gemini AI
      else {
        reply = await askChatbotAI(
          text,
          chatHistory.current,
          getProfileSummary(),
        );
        if (navIntent) {
          actionToAttach = navIntent;
          executeNavigationAction(navIntent);
        }
      }

      chatHistory.current = trimRollingChatMemory(
        [...chatHistory.current, { role: "model", parts: [{ text: reply }] }],
        MAX_CHAT_MEMORY,
      );

      setChatMessages((prev) =>
        trimRollingChatMemory(
          prev.map((m) =>
            m.loading
              ? {
                  ...m,
                  text: reply,
                  loading: false,
                  action: actionToAttach,
                }
              : m,
          ),
          MAX_CHAT_MEMORY,
        ),
      );
    } catch {
      chatHistory.current = chatHistory.current.slice(0, -1);
      const fallbackReply = navIntent
        ? `Membuka **${navIntent.label}**.`
        : "Maaf, layanan AI sedang sibuk. Silakan ulangi atau gunakan perintah seperti 'buka peta'.";

      setChatMessages((prev) =>
        trimRollingChatMemory(
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
          MAX_CHAT_MEMORY,
        ),
      );
    } finally {
      setChatLoading(false);
    }
  };

  const quickPrompts = [
    { label: "Progres Saya", query: "cek progres kuis dan data akunku sekarang" },
    { label: "Jawa: Pas Lindu", query: "piye carane nylametne awak pas lindu nang kelas?" },
    { label: "Cuaca Hari Ini", query: "gimana cuaca hari ini?" },
    { label: "Daftar Menu", query: "apa saja fiturnya?" },
    { label: "Buka Peta", query: "buka peta" },
    { label: "Panduan Gempa", query: "bagaimana mitigasi saat gempa bumi?" },
  ];

  if (isHiddenRoute) return null;

  return (
    <>
      {/* Floating Small Square Trigger Button */}
      <div
        className={`fixed z-[100010] transition-all duration-300 pointer-events-auto right-3 sm:right-6 ${
          isMapsRoute
            ? "bottom-[calc(5.5rem+env(safe-area-inset-bottom))] sm:bottom-[calc(6rem+env(safe-area-inset-bottom))]"
            : "bottom-[calc(1rem+env(safe-area-inset-bottom))] sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]"
        } ${isMapsRoute && hasMapOverlayOpen && !isOpen ? "hidden sm:block" : ""}`}
      >
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`relative flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-2xl backdrop-blur-xl border shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer group ${
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
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-slate-900"></span>
              </span>
            </>
          )}

          {/* Desktop Hover Label */}
          {!isOpen && (
            <div className="pointer-events-none absolute right-full mr-2.5 top-1/2 -translate-y-1/2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 whitespace-nowrap z-[100030] hidden sm:block">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/95 backdrop-blur-md text-white text-xs font-semibold shadow-xl border border-slate-700/80">
                <Sparkles className="w-3.5 h-3.5 text-brand-300" />
                <span>Asisten Harmony</span>
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
            className={`fixed z-[100020] right-3 sm:right-6 rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden text-slate-800 dark:text-slate-100 pointer-events-auto ${
              isExpanded
                ? "bottom-[calc(1rem+env(safe-area-inset-bottom))] w-[calc(100vw-1.5rem)] sm:w-[540px] h-[min(calc(var(--vh-full)*0.85),calc(var(--vh-full)-2rem-env(safe-area-inset-top)-env(safe-area-inset-bottom)))]"
                : `${isMapsRoute ? "bottom-[calc(9rem+env(safe-area-inset-bottom))]" : "bottom-[calc(4.75rem+env(safe-area-inset-bottom))] sm:bottom-[calc(5.5rem+env(safe-area-inset-bottom))]"} w-[calc(100vw-1.5rem)] sm:w-[410px] h-[520px] max-h-[calc(var(--vh-full)-7.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))]`
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
                    <span>GeoBot</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 tabular-nums">
                      {Math.min(chatMessages.filter((m) => m.id !== "welcome").length, MAX_CHAT_MEMORY)}/{MAX_CHAT_MEMORY}
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    Konsultasi &amp; navigasi sistem
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {chatMessages.some((m) => m.id !== "welcome") && (
                  <button
                    type="button"
                    onClick={handleClearCopilotMemory}
                    disabled={chatLoading}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                    title="Hapus memori chat (maks 6 pesan)"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span className="hidden sm:inline">Clear</span>
                  </button>
                )}
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
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-3.5 space-y-3">
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
                              <ShieldCheck className="w-3 h-3" /> Aksi Siap
                            </span>
                            <button
                              type="button"
                              onClick={() => executeNavigationAction(msg.action!)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-brand-600 hover:bg-brand-700 text-white transition-colors cursor-pointer shadow-xs"
                            >
                              <Compass className="w-3 h-3" />
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
