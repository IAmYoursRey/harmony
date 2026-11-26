import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, ArrowRight, RefreshCw, LogIn, UserCheck, AlertCircle } from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";

export function StudentSessionJoin() {
  const { currentUser } = useAuth();
  const [code, setCode] = useState("");
  const [playerName, setPlayerName] = useState(() => {
    return (
      localStorage.getItem("harmony_player_name") ||
      currentUser?.name ||
      "Pemain"
    );
  });
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { show } = useToast();
  const navigate = useNavigate();

  const handleNameChange = (val: string) => {
    const cleaned = val.slice(0, 24);
    setPlayerName(cleaned);
    setErrorMessage(null);
    try {
      localStorage.setItem("harmony_player_name", cleaned);
    } catch {}
  };

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
    const timer = setInterval(fetchRooms, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.replace(/\s+/g, "").toUpperCase();
    if (!cleanCode) return;
    const cleanName = (playerName || "").trim() || "Pemain";

    setLoading(true);
    setErrorMessage(null);
    try {
      const session = await apiClient.get(`/api/sessions/${cleanCode}`, {
        ttl: 0,
      });
      await apiClient.post(`/api/sessions/${session.id}/join`, {
        displayName: cleanName,
      });
      navigate(`/app/simulation/lobby/${session.id}`);
    } catch (err: any) {
      const msg = err.message || "Kode room tidak valid atau sudah berakhir";
      setErrorMessage(msg);
      show(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinDirect = async (roomId: string) => {
    const cleanName = (playerName || "").trim() || "Pemain";
    setLoading(true);
    setErrorMessage(null);
    try {
      await apiClient.post(`/api/sessions/${roomId}/join`, {
        displayName: cleanName,
      });
      navigate(`/app/simulation/lobby/${roomId}`);
    } catch (err: any) {
      const msg = err.message || "Gagal bergabung ke room";
      setErrorMessage(msg);
      show(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const suggestAlternativeName = () => {
    const base = playerName.replace(/\s*\(\d+\)$/, "").trim();
    const randomSuffix = Math.floor(2 + Math.random() * 8);
    const newName = `${base} (${randomSuffix})`;
    handleNameChange(newName);
  };

  return (
    <div className="max-w-xl mx-auto py-6 px-4 space-y-6">
      <div className="w-full p-6 sm:p-8 glass rounded-3xl shadow-xl border-t-4 border-indigo-500">
        <div className="mx-auto w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-inner dark:bg-indigo-900/30">
          <Users className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-display font-black text-ink-900 dark:text-white mb-1.5 text-center">
          Gabung Sesi
        </h2>
        <p className="text-sm text-slate-500 mb-5 text-center">
          Tentukan nama peserta, lalu masukkan kode ruang atau pilih ruang aktif.
        </p>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-indigo-500" />
              Nama Peserta Simulasi
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Contoh: Budi, Salsa, Andi_01"
              maxLength={24}
              required
              className="w-full px-4 py-2.5 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={suggestAlternativeName}
                className="text-[11px] font-bold underline hover:no-underline text-indigo-600 dark:text-indigo-400 shrink-0"
              >
                Ganti Nama Otomatis
              </button>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 text-center">
              Kode Ruang 6 Digit
            </label>
            <input
              id="session-code-input"
              name="sessionCode"
              type="text"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="482731"
              maxLength={10}
              className="w-full text-center text-3xl tracking-[0.25em] font-mono font-black uppercase rounded-2xl border-2 border-slate-200 py-3 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 dark:bg-slate-900 dark:border-slate-700 dark:text-white transition-all placeholder:text-slate-300"
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.trim().length < 3 || !playerName.trim()}
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
            Ruang Aktif ({rooms.length})
          </h3>
          <button
            type="button"
            onClick={fetchRooms}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingRooms ? "animate-spin" : ""}`} />
            Segarkan
          </button>
        </div>

        {rooms.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">
            Belum ada ruang aktif saat ini. Buat ruang baru atau mulai latihan mandiri pada denah sekolah.
          </p>
        ) : (
          <div className="space-y-2">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {room.settings?.roomName || room.scenarioName}
                    </span>
                    <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                      #{room.code}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                        room.status === "RUNNING"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                      }`}
                    >
                      {room.status === "RUNNING" ? "SEDANG BERJALAN" : "LOBI"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {room.disasterType} · {room.participantCount} peserta ·{" "}
                    {room.settings?.mode === "race" ? "Kompetisi Cepat" : "Sesi Kolaboratif"}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleJoinDirect(room.id)}
                  className="shrink-0 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-all active:scale-95 disabled:opacity-50"
                >
                  <LogIn className="h-3.5 w-3.5" /> Gabung
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Ingin berlatih evakuasi sendiri tanpa menunggu kode guru?
          </p>
          <button
            type="button"
            onClick={() => navigate("/app/digital-twin")}
            className="shrink-0 px-3.5 py-2 rounded-xl border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 dark:border-brand-800/60 dark:bg-brand-950/40 dark:text-brand-300 text-xs font-bold transition-colors"
          >
            Latihan Mandiri Denah SMAN 1 Ngoro
          </button>
        </div>
      </div>
    </div>
  );
}
