import { Brain, Map, Boxes, LayoutDashboard, type LucideIcon } from 'lucide-react';
import { Reveal } from '@/components/Reveal';

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  accent: string;
}

const features: Feature[] = [
  {
    icon: Brain,
    title: 'AI Learning Engine',
    description:
      'Adaptive AI tailors disaster lessons to each student, generating personalized scenarios and real-time feedback that build true understanding.',
    accent: 'from-brand-500 to-brand-700',
  },
  {
    icon: Map,
    title: 'GeoSpatial Risk Mapping',
    description:
      'Interactive maps layer live satellite, terrain, and hazard data so schools can see the real risks surrounding their exact location.',
    accent: 'from-brand-500 to-brand-600',
  },
  {
    icon: Boxes,
    title: 'Digital Twin School',
    description:
      'A 3D digital replica of each campus lets students simulate floods, earthquakes, and evacuations safely before disaster ever strikes.',
    accent: 'from-brand-500 to-brand-600',
  },
  {
    icon: LayoutDashboard,
    title: 'Teacher Dashboard',
    description:
      'Track every student\u2019s progress, assign simulations, and measure preparedness gains from one clear, unified control center.',
    accent: 'from-brand-500 to-brand-600',
  },
];

export function Features() {
  return (
    <section id="features" className="relative py-20 sm:py-28">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white via-brand-50/40 to-white dark:from-slate-900 dark:via-slate-800/40 dark:to-slate-900" />
      <div className="section-container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
            Platform Features
          </span>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
            Four pillars of disaster-ready education
          </h2>
          <p className="mt-4 text-ink-600 dark:text-slate-300">
            Each feature brings one of our core technologies directly into the classroom,
            turning abstract risk into hands-on, measurable preparedness.
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
                <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-slate-300">{f.description}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
