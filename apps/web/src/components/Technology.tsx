import {
  Brain,
  Satellite,
  Boxes,
  ClipboardCheck,
  Gauge,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "@/components/Reveal";

interface Step {
  icon: LucideIcon;
  step: string;
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    icon: Brain,
    step: "01",
    title: "Pemetaan Profil",
    description:
      "Mengidentifikasi tingkat pemahaman siswa dan profil kerawanan bencana sekolah.",
  },
  {
    icon: Satellite,
    step: "02",
    title: "Analisis Spasial",
    description:
      "Memvisualisasikan lapisan satelit, cuaca, dan zona risiko di sekitar lokasi sekolah.",
  },
  {
    icon: Boxes,
    step: "03",
    title: "Simulasi Denah",
    description:
      "Latihan evakuasi di atas denah lantai sekolah nyata menuju titik aman dan gerbang keluar.",
  },
  {
    icon: ClipboardCheck,
    step: "04",
    title: "Evaluasi Respons",
    description:
      "Mengukur ketepatan jalur evakuasi, waktu tempuh, dan keputusan mitigasi siswa.",
  },
  {
    icon: Gauge,
    step: "05",
    title: "Skor Kesiapan",
    description:
      "Menyajikan indeks kesiapsiagaan terukur beserta rekomendasi tindak lanjut bagi sekolah.",
  },
];

export function Technology() {
  return (
    <section
      id="how-it-works"
      className="relative isolate scroll-mt-20 sm:scroll-mt-24 overflow-hidden py-20 sm:py-24"
    >
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-900 via-brand-900 to-slate-900" />
      <div className="absolute inset-0 -z-10 bg-grid-pattern bg-[size:44px_44px] opacity-20" />
      <div className="absolute -top-20 left-1/2 -z-10 h-96 w-[700px] -translate-x-1/2 rounded-full bg-brand-500/20 blur-[120px]" />

      <div className="section-container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-brand-300">
            Alur Sistem
          </span>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Alur Sistem
          </h2>
          <p className="mt-4 text-brand-200">
            Lima tahapan terhubung untuk melatih kesiapan evakuasi sekolah secara sistematis.
          </p>
        </Reveal>

        {/* Desktop horizontal flow */}
        <div className="mt-14 hidden lg:block">
          <div className="grid grid-cols-5 gap-3">
            {steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 110} className="relative h-full">
                <div className="glass-dark group relative h-full rounded-2xl p-6 transition-all hover:-translate-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-brand-200 ring-1 ring-white/15 transition-transform group-hover:scale-110">
                      <s.icon className="h-6 w-6" strokeWidth={2} />
                    </span>
                    <span className="font-display text-3xl font-extrabold text-white/10">
                      {s.step}
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-base font-bold text-white">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-brand-200">
                    {s.description}
                  </p>
                </div>
                {i < steps.length - 1 && (
                  <ArrowRight className="absolute -right-2.5 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-400/60" />
                )}
              </Reveal>
            ))}
          </div>
        </div>

        {/* Mobile / tablet stacked flow */}
        <div className="mt-12 grid gap-5 lg:hidden">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 100} className="h-full">
              <div className="glass-dark group relative flex h-full items-start gap-4 rounded-2xl p-6 transition-all">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-brand-200 ring-1 ring-white/15">
                  <s.icon className="h-6 w-6" strokeWidth={2} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-xs font-bold text-brand-300">
                      TAHAP {s.step}
                    </span>
                  </div>
                  <h3 className="mt-1 font-display text-lg font-bold text-white">
                    {s.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-brand-200">
                    {s.description}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
