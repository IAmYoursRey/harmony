import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, ArrowRight, RefreshCw, LogIn } from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";

export function StudentSessionJoin() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const { show } = useToast();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const fetchRooms = async () => {
    setLoadingRooms(true);
    try {
      const res = await apiClient.get("/api/sessions/public", { ttl: 0 });
      setRooms(res?.data || []);
    } catch {
      setRooms([]);
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    const timer = setInterval(fetchRooms, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.replace(/\s+/g, "").toUpperCase();
    if (!cleanCode) return;

    setLoading(true);
    try {
      const session = await apiClient.get(`/api/sessions/${cleanCode}`, {
        ttl: 0,
      });
      await apiClient.post(`/api/sessions/${session.id}/join`, {
        displayName: currentUser?.name || "Pemain",
      });
      navigate(`/app/simulation/lobby/${session.id}`);
    } catch (err: any) {
      show(err.message || "Kode room tidak valid atau sudah berakhir", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinDirect = async (roomId: string) => {
    setLoading(true);
    try {
      await apiClient.post(`/api/sessions/${roomId}/join`, {
        displayName: currentUser?.name || "Pemain",
      });
      navigate(`/app/simulation/lobby/${roomId}`);
    } catch (err: any) {
      show(err.message || "Gagal bergabung ke room", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 px-4 space-y-6">
      <div className="w-full p-8 glass rounded-3xl shadow-xl border-t-4 border-indigo-500 text-center">
        <div className="mx-auto w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-5 shadow-inner dark:bg-indigo-900/30">
          <Users className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-display font-black text-ink-900 dark:text-white mb-1.5">
          Gabung Mode Online / Mabar
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          Masukkan 6 digit kode room atau pilih room terbuka di bawah untuk bersaing bersama.
        </p>

        <form onSubmit={handleJoin} className="space-y-4">
          <input
            id="session-code-input"
            name="sessionCode"
            type="text"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="482731"
            maxLength={10}
            className="w-full text-center text-3xl tracking-[0.25em] font-mono font-black uppercase rounded-2xl border-2 border-slate-200 py-3.5 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 dark:bg-slate-900 dark:border-slate-700 dark:text-white transition-all placeholder:text-slate-300"
          />

          <button
            type="submit"
            disabled={loading || code.trim().length < 3}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 text-base font-bold text-white shadow-lg transition-all hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? (
              "Menghubungkan..."
            ) : (
              <>
                Gabung ke Lobi <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </form>
      </div>

      <div className="glass rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-800 dark:text-white">
            Room Publik Aktif
          </h3>
          <button
            type="button"
            onClick={fetchRooms}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingRooms ? "animate-spin" : ""}`} />
            Segarkan
          </button>
        </div>

        {rooms.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">
            Belum ada room online aktif saat ini.
          </p>
        ) : (
          <div className="space-y-2">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {room.settings?.roomName || room.scenarioName}
                    </span>
                    <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                      #{room.code}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {room.disasterType} · {room.participantCount} pemain ·{" "}
                    {room.status === "RUNNING" ? "Sedang Berjalan" : "Lobi"}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleJoinDirect(room.id)}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1"
                >
                  <LogIn className="h-3.5 w-3.5" /> Gabung
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
