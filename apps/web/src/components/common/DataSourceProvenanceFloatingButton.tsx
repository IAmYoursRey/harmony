import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Database, ShieldCheck } from "lucide-react";
import { DataSourceProvenanceModal } from "./DataSourceProvenanceModal";

export function DataSourceProvenanceFloatingButton() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Hide in dedicated full-screen student game runtime
  const isPlayingGame = location.pathname.includes("/play/");
  if (isPlayingGame) return null;

  const isMapsPage =
    location.pathname === "/app/maps" || location.pathname === "/app/maps/";

  return (
    <>
      {/* Floating Circular Action Button in Bottom-Left Corner */}
      <div
        className={`fixed bottom-4 sm:bottom-5 z-40 transition-all duration-300 ${
          isMapsPage
            ? "left-4 sm:left-5"
            : "left-4 sm:left-5 lg:left-[19rem]"
        }`}
      >
        <div className="relative group">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            className="relative flex h-12 w-12 sm:h-13 sm:w-13 items-center justify-center rounded-full bg-gradient-to-tr from-slate-900 via-indigo-950 to-brand-900 text-white shadow-xl shadow-indigo-950/30 dark:shadow-indigo-500/10 border-2 border-indigo-400/40 hover:border-indigo-300 dark:border-indigo-500/50 hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-brand-500/30 cursor-pointer"
            title="Transparansi Sumber Data Resmi (BMKG, PVMBG, BIG, BNPB, Kemendikbud)"
            aria-label="Buka Transparansi Sumber Data Resmi Kebencanaan"
          >
            {/* Glowing outer pulse */}
            <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-brand-500 opacity-40 blur-sm group-hover:opacity-85 group-hover:blur-md transition duration-300 animate-pulse" />

            {/* Inner circle */}
            <span className="relative flex items-center justify-center h-full w-full rounded-full bg-slate-900 dark:bg-slate-900/90 backdrop-blur-md">
              <Database className="h-5 w-5 text-indigo-300 group-hover:text-white transition-colors" />

              {/* Verified Shield Badge Overlay */}
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-slate-900 shadow-sm" title="Terverifikasi Otoritatif">
                <ShieldCheck className="h-2.5 w-2.5" />
              </span>
            </span>
          </button>

          {/* Floating Tooltip Label (Desktop Hover) */}
          <div className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 whitespace-nowrap z-50 hidden sm:block">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white text-xs font-semibold shadow-xl border border-slate-700/80">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Sumber Data Resmi</span>
              <span className="text-[10px] text-slate-400 font-normal">
                (BMKG, BIG, PVMBG, BNPB, Dapodik)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Full Transparency Modal */}
      <DataSourceProvenanceModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
