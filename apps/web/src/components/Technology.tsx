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
    title: "AI",
    description:
      "The AI Learning Engine assesses each school\u2019s context and generates tailored disaster scenarios aligned to local risk.",
  },
  {
    icon: Satellite,
    step: "02",
    title: "Geospatial Analysis",
    description:
      "Live satellite and GIS data map real hazards around the school \u2014 flood zones, fault lines, and exposure patterns.",
  },
  {
    icon: Boxes,
    step: "03",
    title: "Digital Twin Simulation",
    description:
      "A 3D twin of the campus replays the disaster, letting students practice evacuation and response in a safe virtual environment.",
  },
  {
    icon: ClipboardCheck,
    step: "04",
    title: "Evaluation",
    description:
      "Every simulation is scored against response time, decisions, and knowledge \u2014 surfacing strengths and gaps to close.",
  },
  {
    icon: Gauge,
    step: "05",
    title: "Harmony Score",
    description:
      "Schools receive a clear Harmony Score tracking preparedness over time, with actionable steps to keep improving.",
  },
];

export function Technology() {
  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden py-20 sm:py-28"
    >
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-950 to-brand-900" />
      <div className="absolute inset-0 -z-10 bg-grid-pattern bg-[size:44px_44px] opacity-20" />
      <div className="absolute -top-20 left-1/2 -z-10 h-96 w-[700px] -translate-x-1/2 rounded-full bg-brand-500/20 blur-[120px]" />

      <div className="section-container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-brand-300">
            How it works
          </span>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            From data to a Harmony Score
          </h2>
          <p className="mt-4 text-brand-200">
            Five connected stages turn raw environmental data into a clear,
            actionable measure of how ready your school really is.
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
                      STEP {s.step}
                    </span>
                    <ArrowRight className="h-3 w-3 text-brand-400/60" />
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
