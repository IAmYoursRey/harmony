import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, SendHorizonal, Loader2, MessageSquare, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { buildAISummary } from "@/data/userProfiles";
import { askChatbotAI } from "@/services/geminiService";
import { useI18n } from "@/hooks/useI18n";

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  loading?: boolean;
}

export function AILearningView() {
  const { currentUser, currentProfile } = useAuth();
  const { t } = useI18n();
  const isChatReady = true; // Secured and handled by backend

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "ai",
      text: currentUser
        ? `Halo ${currentUser.name}! 👋 Saya GeoBot, asisten belajar mitigasi bencana Anda. Tanya apa saja seputar gempa bumi, banjir, tsunami, kebakaran, dan bencana alam lainnya!`
        : "Halo! 👋 Saya GeoBot. Tanya apa saja seputar mitigasi bencana!",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatHistory = useRef<
    { role: "user" | "model"; parts: { text: string }[] }[]
  >([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const getProfileSummary = useCallback(() => {
    if (!currentUser || !currentProfile) return undefined;
    return buildAISummary(currentProfile, currentUser.name);
  }, [currentUser, currentProfile]);

  const handleSendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const text = chatInput.trim();
    setChatInput("");
    const userMsg: ChatMessage = { id: `u${Date.now()}`, role: "user", text };
    const loadingMsg: ChatMessage = {
      id: `l${Date.now()}`,
      role: "ai",
      text: "",
      loading: true,
    };
    setChatMessages((prev) => [...prev, userMsg, loadingMsg]);
    setChatLoading(true);

    chatHistory.current.push({ role: "user", parts: [{ text }] });

    try {
      const reply = await askChatbotAI(
        text,
        chatHistory.current,
        getProfileSummary(),
      );
      chatHistory.current.push({ role: "model", parts: [{ text: reply }] });
      setChatMessages((prev) =>
        prev.map((m) =>
          m.loading ? { ...m, text: reply, loading: false } : m,
        ),
      );
    } catch {
      setChatMessages((prev) =>
        prev.map((m) =>
          m.loading
            ? {
                ...m,
                text: "Maaf, terjadi kendala. Coba lagi ya!",
                loading: false,
              }
            : m,
        ),
      );
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-4 py-4 text-white shadow-glass sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              <Bot className="h-3.5 w-3.5" /> Harmony AI Chat
            </div>
            <h2 className="mt-2 font-display text-xl font-extrabold">
              {currentUser
                ? `Halo, ${currentUser.name} 👋`
                : "GeoBot — Asisten Bencana"}
            </h2>
            {currentProfile && (
              <p className="text-xs text-brand-100 mt-0.5">
                Kelas {currentProfile.grade} · {currentProfile.totalPoints || 0} poin
                · {currentProfile.badges?.length || 0} lencana
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-xs font-bold">
            <MessageSquare className="h-3.5 w-3.5" /> GeoBot Chat
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {!isChatReady && (
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/20 px-4 py-2 text-xs text-amber-700 dark:text-amber-300">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            {t(
              "learning.geobot_api_missing",
              "Kunci API GeoBot belum dikonfigurasi di server.",
            )}
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "ai" && (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
                  <Bot className="h-4 w-4" />
                </span>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${msg.role === "ai" ? "bg-white text-ink-900 border border-brand-50/60 dark:bg-slate-800 dark:text-white dark:border-slate-700" : "bg-brand-600 text-white"}`}
              >
                {msg.loading ? (
                  <div className="flex items-center gap-2 text-ink-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-xs italic">
                      GeoBot sedang berpikir...
                    </span>
                  </div>
                ) : (
                  msg.text.split("\n").map((line, i) => (
                    <p key={i} className="mb-1 last:mb-0">
                      {line
                        .split("**")
                        .map((chunk, ci) =>
                          ci % 2 === 1 ? (
                            <strong key={ci}>{chunk}</strong>
                          ) : (
                            chunk
                          ),
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
            {[
              "Apa itu drop, cover, hold?",
              "Bagaimana cara membuat tas siaga bencana?",
              "Apa tanda-tanda akan terjadi tsunami?",
            ].map((p) => (
              <button
                key={p}
                onClick={() => {
                  setChatInput(p);
                }}
                className="rounded-full border border-brand-100 bg-white/80 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50 dark:bg-slate-800 dark:text-brand-300 dark:border-slate-700"
              >
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
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendChat();
                }
              }}
              placeholder="Tanya GeoBot seputar mitigasi bencana..."
              className="flex-1 bg-transparent text-sm text-ink-900 placeholder:text-ink-400 dark:text-white dark:placeholder:text-slate-500 outline-none"
            />
            <button
              onClick={handleSendChat}
              disabled={!chatInput.trim() || chatLoading}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              <SendHorizonal className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
