import { useState, useRef, useEffect } from "react";
import { Palette, Check } from "lucide-react";
import { type ThemePreset, presets } from "@/context/coreThemeColor";
import { useThemeColor } from "@/hooks/useThemeColor";
import { motion, AnimatePresence } from "framer-motion";

export function ThemePicker() {
  const { preset, setPreset } = useThemeColor();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const presetList: { id: ThemePreset; name: string; bgClass: string }[] = [
    { id: "blue", name: "Geo Blue", bgClass: "bg-blue-600" },
    { id: "ocean", name: "Ocean", bgClass: "bg-cyan-600" },
    { id: "forest", name: "Forest", bgClass: "bg-green-600" },
    { id: "emerald", name: "Emerald", bgClass: "bg-emerald-500" },
    { id: "sakura", name: "Sakura", bgClass: "bg-pink-400" },
    { id: "cosmic", name: "Cosmic", bgClass: "bg-fuchsia-500" },
    { id: "ruby", name: "Ruby", bgClass: "bg-red-600" },
    { id: "amber", name: "Amber", bgClass: "bg-amber-500" },
    { id: "lavender", name: "Lavender", bgClass: "bg-purple-400" },
    { id: "monochrome", name: "Monochrome", bgClass: "bg-zinc-600" },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-10 w-10 items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-brand-50 dark:text-slate-300 dark:hover:bg-slate-800"
        aria-label="Theme picker"
      >
        <Palette className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white p-4 shadow-glass-lg ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10 z-50"
          >
            <h3 className="mb-3 text-sm font-bold text-ink-900 dark:text-white">
              Warna Tema
            </h3>
            <div className="grid grid-cols-5 gap-3">
              {presetList.map((p) => {
                const isActive = preset === p.id;

                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setPreset(p.id);
                      setOpen(false);
                    }}
                    className="group relative flex h-10 w-10 items-center justify-center rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                    title={p.name}
                  >
                    <div
                      className={`absolute inset-0 rounded-full ${p.bgClass} shadow-sm`}
                      style={{
                        backgroundColor: `hsl(${presets[p.id][500].replace(/% /g, "%, ").replace(/ /g, ", ")})`,
                      }}
                    />
                    {isActive && (
                      <Check className="relative z-10 h-5 w-5 text-white drop-shadow-md" />
                    )}
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-[11px] text-ink-500 dark:text-slate-400">
              Pilih warna favoritmu untuk menyesuaikan tampilan aplikasi
              HarmonyEdu.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
