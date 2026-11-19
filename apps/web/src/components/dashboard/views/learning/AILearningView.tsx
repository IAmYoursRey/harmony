import { useState, useRef, useEffect, useCallback, Fragment } from "react";
import { Bot, SendHorizonal, Loader2, MessageSquare, RotateCcw, AlertCircle, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { buildAISummary } from "@/data/userProfiles";
import {
  askChatbotAI,
  MAX_CHAT_MEMORY,
  trimRollingChatMemory,
} from "@/services/geminiService";

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  loading?: boolean;
  errorPrompt?: string;
}

const SUGGESTED_PROMPTS = [
  "Cek progres kuis dan simulasi belajarku sekarang",
  "Piye carane nylametne awak pas lindu nang SMAN 1 Ngoro?",
  "Cara menggunakan APAR saat kebakaran kecil di sekolah?",
  "Rute evakuasi terdekat menuju Lapangan Upacara?",
  "Jelaskan singkat semua fitur Harmony untuk pemula",
];

function renderInlineFormatting(text: string) {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return tokens.map((token, idx) => {
    if (token.startsWith("**") && token.endsWith("**") && token.length > 4) {
      return (
        <strong key={idx} className="font-bold text-slate-900 dark:text-white">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith("`") && token.endsWith("`") && token.length > 2) {
      return (
        <code
          key={idx}
          className="rounded bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 font-mono text-xs text-brand-700 dark:text-brand-300"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    return <Fragment key={idx}>{token}</Fragment>;
  });
}

function renderFormattedText(text: string) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((rawLine, idx) => {
        const line = rawLine.trim();
        if (!line) return <div key={idx} className="h-1" />;

        if (line.startsWith("### ") || line.startsWith("## ")) {
          const heading = line.replace(/^#{2,3}\s+/, "");
          return (
            <h4 key={idx} className="pt-1 font-display text-xs font-extrabold uppercase tracking-wide text-brand-700 dark:text-brand-300">
              {renderInlineFormatting(heading)}
            </h4>
          );
        }

        if (/^[-*•]\s+/.test(line)) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
              <span className="flex-1">{renderInlineFormatting(line.replace(/^[-*•]\s+/, ""))}</span>
            </div>
          );
        }

        const numMatch = line.match(/^(\d+)[.)]\s+(.+)$/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="min-w-[1.25rem] font-bold text-brand-600 dark:text-brand-400">
                {numMatch[1]}.
              </span>
              <span className="flex-1">{renderInlineFormatting(numMatch[2])}</span>
            </div>
          );
        }

        return <p key={idx}>{renderInlineFormatting(line)}</p>;
      })}
    </div>
  );
}

export function AILearningView() {
  const { currentUser, currentProfile } = useAuth();

  const createWelcomeMessage = useCallback((): ChatMessage => ({
    id: "welcome",
    role: "ai",
    text: currentUser
      ? `Halo ${currentUser.name}! Aku GeoBot — teman ngobrol seputar kebencanaan, progres belajarmu di database, sampai simulasi evakuasi SMAN 1 Ngoro. Tanya pakai Bahasa Indonesia santai atau Bahasa Jawa sehari-hari juga boleh.`
      : "Halo! Aku GeoBot. Tanyakan apa saja soal kebencanaan, peta cuaca, atau simulasi sekolah — pakai Bahasa Indonesia maupun Bahasa Jawa sehari-hari juga aman.",
  }), [currentUser]);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => [createWelcomeMessage()]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatHistory = useRef<
    { role: "user" | "model"; parts: { text: string }[] }[]
  >([]);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [chatMessages]);

  const getProfileSummary = useCallback(() => {
    if (!currentUser || !currentProfile) return undefined;
    return buildAISummary(currentProfile, currentUser.name);
  }, [currentUser, currentProfile]);

  const sendMessageText = useCallback(async (rawText: string, replaceErrorMsgId?: string) => {
    const text = rawText.trim();
    if (!text || chatLoading) return;

    const loadingId = `ai-${Date.now()}`;
    if (replaceErrorMsgId) {
      setChatMessages((prev) =>
        prev.map((m) =>
          m.id === replaceErrorMsgId
            ? { id: loadingId, role: "ai", text: "", loading: true }
            : m,
        ),
      );
    } else {
      setChatInput("");
      const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", text };
      const loadingMsg: ChatMessage = {
        id: loadingId,
        role: "ai",
        text: "",
        loading: true,
      };
      setChatMessages((prev) => {
        const conversational = prev.filter((m) => m.id !== "welcome");
        return trimRollingChatMemory([...conversational, userMsg, loadingMsg], MAX_CHAT_MEMORY);
      });
    }

    setChatLoading(true);
    chatHistory.current = trimRollingChatMemory(
      [...chatHistory.current, { role: "user", parts: [{ text }] }],
      MAX_CHAT_MEMORY,
    );

    try {
      const reply = await askChatbotAI(
        text,
        chatHistory.current,
        getProfileSummary(),
      );
      chatHistory.current = trimRollingChatMemory(
        [...chatHistory.current, { role: "model", parts: [{ text: reply }] }],
        MAX_CHAT_MEMORY,
      );
      setChatMessages((prev) =>
        trimRollingChatMemory(
          prev.map((m) =>
            m.id === loadingId ? { ...m, text: reply, loading: false, errorPrompt: undefined } : m,
          ),
          MAX_CHAT_MEMORY,
        ),
      );
    } catch {
      // Roll back the failed user turn so subsequent messages keep valid alternating roles.
      chatHistory.current = chatHistory.current.slice(0, -1);
      setChatMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? {
                ...m,
                text: "Koneksi ke GeoBot lagi terganggu. Coba klik kirim ulang ya.",
                loading: false,
                errorPrompt: text,
              }
            : m,
        ),
      );
    } finally {
      setChatLoading(false);
    }
  }, [chatLoading, getProfileSummary]);

  const handleResetChat = () => {
    if (chatLoading) return;
    chatHistory.current = [];
    setChatMessages([createWelcomeMessage()]);
    setChatInput("");
  };

  const memoryCount = chatMessages.some((m) => m.id !== "welcome")
    ? Math.min(chatMessages.filter((m) => m.id !== "welcome").length, MAX_CHAT_MEMORY)
    : 0;

  return (
    <div className="flex h-[calc(var(--vh-full)-9rem)] sm:h-[calc(var(--vh-full)-8rem)] min-h-[440px] flex-col overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-4 py-3.5 text-white sm:px-6 shrink-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              <Bot className="h-3.5 w-3.5" /> Tanya GeoBot · Indonesia &amp; Jawa
            </div>
            <h2 className="mt-2 font-display text-xl font-extrabold">
              {currentUser
                ? `Halo, ${currentUser.name}`
                : "GeoBot Mitigasi"}
            </h2>
            {currentProfile && (
              <p className="text-xs text-brand-100 mt-0.5">
                Kelas {currentProfile.grade} · {currentProfile.totalPoints || 0} poin
                · {currentProfile.badges?.length || 0} lencana · Terhubung Data Akun
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            <div
              className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold"
              title="Batas riwayat obrolan maksimal 6 pesan agar tetap ringan"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Memori {memoryCount}/{MAX_CHAT_MEMORY}</span>
            </div>
            {memoryCount > 0 && (
              <button
                type="button"
                onClick={handleResetChat}
                disabled={chatLoading}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-white/25 px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50"
                title="Bersihkan riwayat memori obrolan"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear Memory
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden bg-slate-50/50 dark:bg-slate-950/40">
        <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
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
                className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  msg.role === "ai"
                    ? msg.errorPrompt
                      ? "bg-rose-50 text-rose-900 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-100 dark:border-rose-800/60"
                      : "bg-white text-slate-800 border border-slate-200/80 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700"
                    : "bg-brand-600 text-white"
                }`}
              >
                {msg.loading ? (
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-300">
                    <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
                    <span className="text-xs font-medium">
                      Menyusun jawaban mitigasi...
                    </span>
                  </div>
                ) : msg.role === "ai" ? (
                  <div className="space-y-2">
                    {msg.errorPrompt ? (
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
                        <span>{msg.text}</span>
                      </div>
                    ) : (
                      renderFormattedText(msg.text)
                    )}
                    {msg.errorPrompt && (
                      <button
                        type="button"
                        onClick={() => sendMessageText(msg.errorPrompt!, msg.id)}
                        disabled={chatLoading}
                        className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1 text-xs font-bold text-white hover:bg-rose-700 transition-colors disabled:opacity-50"
                      >
                        <RotateCcw className="h-3 w-3" /> Coba Kirim Ulang
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {chatMessages.length <= 1 && (
          <div className="px-4 pb-3 flex flex-wrap gap-2">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => sendMessageText(prompt)}
                disabled={chatLoading}
                className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-brand-700 dark:text-brand-300 hover:border-brand-300 hover:bg-brand-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        <div className="border-t border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm px-4 py-3">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 shadow-sm focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-500/20">
            <input
              name="geobotPrompt"
              id="geobot-chat-input"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessageText(chatInput);
                }
              }}
              placeholder="Tanya GeoBot seputar mitigasi bencana atau prosedur evakuasi..."
              className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500 outline-none"
            />
            <button
              type="button"
              onClick={() => sendMessageText(chatInput)}
              disabled={!chatInput.trim() || chatLoading}
              aria-label="Kirim pertanyaan"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              <SendHorizonal className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
