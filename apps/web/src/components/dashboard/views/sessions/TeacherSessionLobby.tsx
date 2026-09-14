import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Play,
  Users,
  XCircle,
  Copy,
  Check,
  ShieldAlert,
  ArrowLeft,
} from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { useToast } from "@/hooks/useToast";

export function TeacherSessionLobby() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const { show } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const res = await apiClient.get(`/api/sessions/${id}`);
        setSession(res);
      } catch (err: any) {
        console.error("Lobby API Error:", err.message, "for id:", id);
        show(err.message, "error");
        navigate("/app/teacher");
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  useEffect(() => {
    if (!id || session?.status === "ENDED") return;

    const interval = setInterval(async () => {
      try {
        const res = await apiClient.get(`/api/sessions/${id}/participants`, {
          ttl: 0,
        }); // Skip cache
        setParticipants(res.participants);
        if (res.sessionStatus !== session?.status) {
          setSession((s: any) => ({ ...s, status: res.sessionStatus }));
        }
      } catch (err) {}
    }, 2000);

    return () => clearInterval(interval);
  }, [id, session?.status]);

  const handleCopy = () => {
    if (session?.code) {
      navigator.clipboard.writeText(session.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      show("Session code copied!", "success");
    }
  };

  const handleStart = async () => {
    setStarting(true);
    try {
      await apiClient.post(`/api/sessions/${id}/start`, {});
      setSession({ ...session, status: "RUNNING" });
      show("Simulation Started", "success");
    } catch (err: any) {
      show(err.message, "error");
    } finally {
      setStarting(false);
    }
  };

  const handleEnd = async () => {
    setEnding(true);
    try {
      await apiClient.post(`/api/sessions/${id}/end`, {});
      setSession({ ...session, status: "ENDED" });
      show("Simulation Ended", "success");
      navigate("/app/teacher");
    } catch (err: any) {
      show(err.message, "error");
      setEnding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full border-4 border-brand-500 border-t-transparent h-8 w-8" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/app/teacher")}
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-5 w-5 text-slate-500" />
        </button>
        <h2 className="text-2xl font-display font-bold dark:text-white">
          Simulation Session
        </h2>
        <span
          className={`px-3 py-1 text-xs font-bold rounded-full ${session.status === "LOBBY" ? "bg-blue-100 text-blue-700" : session.status === "RUNNING" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}
        >
          {session.status}
        </span>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="glass rounded-2xl p-6 text-center border-t-4 border-brand-500">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
              Join Code
            </h3>
            <div className="text-5xl font-mono font-black text-brand-700 dark:text-brand-400 tracking-widest mb-4">
              {session.code}
            </div>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition-colors dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Copy Code
            </button>
          </div>

          <div className="glass rounded-2xl p-5 space-y-4">
            <h3 className="font-bold flex items-center gap-2 dark:text-white">
              <ShieldAlert className="h-4 w-4 text-brand-500" /> Details
            </h3>
            <div className="text-sm space-y-2 text-slate-600 dark:text-slate-300">
              <p>
                <span className="font-semibold block text-xs text-slate-400">
                  Class ID
                </span>{" "}
                {session.classId}
              </p>
              <p>
                <span className="font-semibold block text-xs text-slate-400">
                  Map ID
                </span>{" "}
                {session.mapId}
              </p>
              <p>
                <span className="font-semibold block text-xs text-slate-400">
                  Scenario ID
                </span>{" "}
                {session.scenarioId}
              </p>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg flex items-center gap-2 dark:text-white">
                <Users className="h-5 w-5 text-brand-500" /> Participants
              </h3>
              <div className="text-sm font-semibold bg-brand-50 text-brand-700 px-3 py-1 rounded-full dark:bg-brand-900/30 dark:text-brand-300">
                {participants.length} / {session.settings?.capacity || 35}{" "}
                Joined
              </div>
            </div>

            {participants.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                Waiting for students to join...
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {participants.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white shadow-sm dark:bg-slate-800 dark:border-slate-700"
                  >
                    <span className="font-semibold text-sm truncate dark:text-white">
                      {p.displayName}
                    </span>
                    {p.readyState ? (
                      <span
                        className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                        title="Ready"
                      ></span>
                    ) : (
                      <span
                        className="h-2.5 w-2.5 rounded-full bg-amber-400"
                        title="Waiting"
                      ></span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              disabled={ending}
              onClick={handleEnd}
              className="px-6 py-3 rounded-xl font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
            >
              End Session
            </button>
            {session.status === "LOBBY" && (
              <button
                disabled={starting || participants.length === 0}
                onClick={handleStart}
                className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-lg disabled:opacity-50 transition-all"
              >
                {starting ? (
                  "Starting..."
                ) : (
                  <>
                    <Play className="h-5 w-5" /> Start Simulation
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
