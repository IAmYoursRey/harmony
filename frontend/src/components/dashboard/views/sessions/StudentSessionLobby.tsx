import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Play, CheckCircle2, LogOut } from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { useToast } from "@/hooks/useToast";
import { Phase3Runtime } from "../spatial/digital-twin/Phase3Runtime";
import { useData } from "@/hooks/useData";
import { LoadingState } from "@/components/ui/LoadingState";

export function StudentSessionLobby() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);

  const [ready, setReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const { show } = useToast();
  const navigate = useNavigate();

  const {
    data: initialSession,
    isLoading: loading,
    error,
    mutate: mutateSession,
  } = useData<any>(id ? `/api/sessions/${id}` : null);

  useEffect(() => {
    if (initialSession) {
      setSession(initialSession);
      if (initialSession.status === "RUNNING") {
        setIsPlaying(true);
      }
    }
    if (error) {
      show(error.message, "error");
      navigate("/app");
    }
  }, [initialSession, error, navigate, show]);

  useEffect(() => {
    if (!id || isPlaying || session?.status === "ENDED") return;

    const interval = setInterval(async () => {
      try {
        const res = await apiClient.get(`/api/sessions/${id}/participants`, {
          ttl: 0,
        });
        console.log("Polling result:", res);
        setParticipants(res.participants);
        if (res.sessionStatus === "RUNNING") {
          setSession((s: any) => ({ ...s, status: "RUNNING" }));
          setIsPlaying(true);
        } else if (res.sessionStatus === "ENDED") {
          show("Session ended by teacher", "info");
          navigate("/app");
        }
      } catch (err) {}
    }, 2000);

    return () => clearInterval(interval);
  }, [id, isPlaying, session?.status]);

  const handleToggleReady = async () => {
    const nextState = !ready;
    setReady(nextState);
    try {
      await apiClient.post(`/api/sessions/${id}/ready`, { ready: nextState });
    } catch (err) {
      setReady(!nextState); // revert
    }
  };

  const handleLeave = async () => {
    try {
      await apiClient.post(`/api/sessions/${id}/leave`, {});
      navigate("/app");
    } catch (err) {
      navigate("/app");
    }
  };

  if (loading) {
    return <LoadingState fullPage message="Connecting to session..." />;
  }

  if (isPlaying && session) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-950">
        <Phase3Runtime
          mapId={session.mapId}
          scenarioId={session.scenarioId}
          sessionId={id}
          onClose={() => {
            navigate("/app");
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg p-8 glass rounded-3xl shadow-xl text-center space-y-8">
        <div>
          <div className="inline-flex px-3 py-1 bg-brand-100 text-brand-700 text-xs font-bold rounded-full mb-4">
            SESSION CODE: {session?.code}
          </div>
          <h2 className="text-3xl font-display font-black text-ink-900 dark:text-white">
            Waiting for Teacher...
          </h2>
          <p className="mt-2 text-slate-500">
            The simulation will begin automatically when the teacher starts it.
          </p>
        </div>

        <div className="py-6 border-y border-slate-100 dark:border-slate-800 flex justify-center">
          <button
            onClick={handleToggleReady}
            className={`relative flex items-center justify-center h-48 w-48 rounded-full border-8 transition-all duration-300 shadow-xl ${
              ready
                ? "bg-emerald-500 border-emerald-400 text-white shadow-emerald-500/30"
                : "bg-slate-100 border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700"
            }`}
          >
            <div className="flex flex-col items-center gap-2">
              {ready ? (
                <CheckCircle2 className="h-12 w-12" />
              ) : (
                <Play className="h-12 w-12 opacity-50" />
              )}
              <span className="font-display font-bold tracking-widest text-lg">
                {ready ? "READY" : "PRESS TO READY"}
              </span>
            </div>
          </button>
        </div>

        <div className="text-sm font-semibold text-slate-500">
          {participants.length} players joined
        </div>

        <button
          onClick={handleLeave}
          className="inline-flex items-center gap-2 text-sm font-semibold text-red-500 hover:text-red-700"
        >
          <LogOut className="h-4 w-4" /> Leave Session
        </button>
      </div>
    </div>
  );
}
