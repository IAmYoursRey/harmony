import {
  Brain,
  Map,
  Boxes,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "@/components/Reveal";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  accent: string;
}

const features: Feature[] = [
  {
    icon: Brain,
    title: "Pembelajaran Adaptif",
    description:
      "Materi kebencanaan disesuaikan otomatis dengan kebutuhan belajar dan umpan balik langsung bagi siswa.",
    accent: "from-brand-500 to-brand-700",
  },
  {
    icon: Map,
    title: "Peta Risiko Geospasial",
    description:
      "Lapisan data satelit, topografi, cuaca, dan histori gempa memetakan kerawanan di sekitar koordinat sekolah.",
    accent: "from-brand-500 to-brand-600",
  },
  {
    icon: Boxes,
    title: "Harmony Twin Sekolah",
    description:
      "Simulasi 2D berbasis denah gedung sekolah agar siswa berlatih rute evakuasi menuju titik kumpul dengan aman.",
    accent: "from-brand-500 to-brand-600",
  },
  {
    icon: LayoutDashboard,
    title: "Dasbor Guru Terpadu",
    description:
      "Pantau skor kesiapsiagaan siswa, kelola sesi simulasi kelas, dan evaluasi capaian mitigasi secara terpusat.",
    accent: "from-brand-500 to-brand-600",
  },
];

export function Features() {
  return (
    <section id="features" className="relative scroll-mt-20 sm:scroll-mt-24 py-20 sm:py-24">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white via-brand-50/40 to-white dark:from-slate-900 dark:via-slate-800/40 dark:to-slate-900" />
      <div className="section-container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
            Fitur Utama
          </span>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink-900 dark:text-white sm:text-4xl">
            Empat pilar kesiapsiagaan sekolah
          </h2>
          <p className="mt-4 text-ink-600 dark:text-slate-300">
            Menghubungkan data risiko lokasi dengan latihan simulasi terstruktur di kelas.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={(i % 4) * 100} className="h-full">
              <article className="glass group relative h-full overflow-hidden rounded-2xl p-6 transition-all hover:-translate-y-1.5 hover:shadow-glass-lg">
                <div
                  className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${f.accent} opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-20`}
                />
                <div
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.accent} text-white shadow-glass transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}
                >
                  <f.icon className="h-6 w-6" strokeWidth={2} />
                </div>
                <h3 className="mt-5 font-display text-lg font-bold text-ink-900 dark:text-white">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-slate-300">
                  {f.description}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
