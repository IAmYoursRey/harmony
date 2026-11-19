import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Reveal } from "@/components/Reveal";

export function CTA() {
  return (
    <section className="relative py-20 sm:py-24">
      <div className="section-container">
        <Reveal className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-6 py-14 text-center shadow-glass-lg sm:px-12 sm:py-20">
          {/* decorative */}
          <div className="absolute inset-0 bg-grid-pattern bg-[size:40px_40px] opacity-15" />
          <div className="absolute -top-16 left-1/2 h-64 w-96 -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />

          <div className="relative mx-auto max-w-2xl">
            <span className="inline-flex items-center rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
              Kesiapsiagaan Sekolah
            </span>
            <h2 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Mulai Simulasi Sekarang
            </h2>
            <p className="mt-4 text-brand-100 sm:text-lg">
              Jelajahi peta geospasial dan simulasi evakuasi Digital Twin pada denah SMAN 1 Ngoro.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/login"
                className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-brand-700 shadow-lg transition-colors hover:bg-brand-50"
              >
                Demo SMAN 1
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/app/maps"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                Peta Geospasial
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
