import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, ArrowRight } from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { useToast } from "@/hooks/useToast";

export function StudentSessionJoin() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { show } = useToast();
  const navigate = useNavigate();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.replace(/\s+/g, "").toUpperCase();
    if (!cleanCode) return;

    setLoading(true);
    try {
      const session = await apiClient.get(`/api/sessions/${cleanCode}`);

      await apiClient.post(`/api/sessions/${session.id}/join`, {});

      navigate(`/app/simulation/lobby/${session.id}`);
    } catch (err: any) {
      show(err.message || "Invalid simulation code", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <div className="w-full max-w-md p-8 glass rounded-3xl shadow-xl border-t-4 border-brand-500 text-center">
        <div className="mx-auto w-16 h-16 bg-brand-100 text-brand-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner dark:bg-brand-900/30">
          <Play className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-display font-black text-ink-900 dark:text-white mb-2">
          Join Simulation
        </h2>
        <p className="text-sm text-slate-500 mb-8">
          Enter the 6-digit code provided by your teacher to join the
          simulation.
        </p>

        <form onSubmit={handleJoin} className="space-y-6">
          <div>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. 482731"
              maxLength={10}
              className="w-full text-center text-4xl tracking-[0.25em] font-mono font-black uppercase rounded-2xl border-2 border-slate-200 py-4 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 dark:bg-slate-900 dark:border-slate-700 dark:text-white transition-all placeholder:text-slate-300 placeholder:tracking-normal placeholder:font-sans placeholder:font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.length < 3}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 py-4 text-lg font-bold text-white shadow-lg transition-all hover:bg-brand-700 disabled:opacity-50 hover:-translate-y-1"
          >
            {loading ? (
              "Joining..."
            ) : (
              <>
                Join Session <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
