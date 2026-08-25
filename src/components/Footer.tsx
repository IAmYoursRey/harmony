import { Mail, MapPin, Phone, Github, Instagram, Linkedin, Info, Brain, Boxes, Satellite } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { useI18n } from '@/context/I18nContext';

const poweredBy = [
  { icon: Brain, label: 'Artificial Intelligence' },
  { icon: Boxes, label: 'Digital Twin' },
  { icon: Satellite, label: 'Geospatial Technology' },
];

const columns = [
  {
    title: 'landing.platform',
    links: [
      { label: 'landing.features', to: '/#features' },
      { label: 'landing.technology', to: '/#how-it-works' },
      { label: 'landing.impact', to: '/#impact' },
      { label: 'landing.sdgs', to: '/#sdgs' },
    ],
  },
  {
    title: 'landing.resources',
    links: [
      { label: 'nav.ai-learning', to: '/app/ai-learning' },
      { label: 'nav.geo-risk-map', to: '/app/geo-risk-map' },
      { label: 'nav.digital-twin', to: '/app/digital-twin' },
      { label: 'nav.simulation', to: '/app/simulation' },
    ],
  },
  {
    title: 'landing.company',
    links: [
      { label: 'landing.about', to: '/#about' },
      { label: 'nav.teacher', to: '/app/teacher' },
      { label: 'nav.resilience', to: '/app/resilience' },
      { label: 'nav.profile', to: '/app/profile' },
      { label: 'landing.contact', to: '/#contact' },
    ],
  },
];

const socials = [
  { icon: Instagram, label: 'Instagram', href: 'https://instagram.com/geosense.edu' },
  { icon: Linkedin, label: 'LinkedIn', href: 'https://linkedin.com/company/geosense-edu' },
  { icon: Github, label: 'GitHub', href: 'https://github.com/geosense-edu' },
  { icon: Mail, label: 'Email', href: 'mailto:hello@geosense.edu' },
];

export function Footer() {
  const { t } = useI18n();
  return (
    <footer id="contact" className="relative overflow-hidden bg-ink-900 text-ink-300 dark:bg-black">
      <div className="absolute inset-0 bg-grid-pattern bg-[size:40px_40px] opacity-[0.06]" />
      <div className="absolute -top-24 left-1/2 h-64 w-[700px] -translate-x-1/2 rounded-full bg-brand-600/15 blur-[120px]" />

      <div className="section-container relative py-14 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-5">
          {/* Brand + contact */}
          <div className="lg:col-span-2">
            <Link to="/" className="block">
              <Logo variant="full" size={40} light />
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-400">
              Smart Disaster Education for a Resilient Future. Powered by Artificial
              Intelligence, Digital Twin, and Geospatial Technology — building resilience
              through immersive learning for schools across Indonesia.
            </p>
            <div className="mt-5 space-y-2.5 text-sm">
              <a
                href="mailto:hello@geosense.edu"
                className="flex items-center gap-2 text-ink-400 transition-colors hover:text-brand-400"
              >
                <Mail className="h-4 w-4 text-brand-400" /> hello@geosense.edu
              </a>
              <a
                href="tel:+6281234567890"
                className="flex items-center gap-2 text-ink-400 transition-colors hover:text-brand-400"
              >
                <Phone className="h-4 w-4 text-brand-400" /> +62 812-3456-7890
              </a>
              <p className="flex items-center gap-2 text-ink-400">
                <MapPin className="h-4 w-4 text-brand-400" /> SMA Negeri 1 Ngoro, Mojokerto,
                East Java, Indonesia
              </p>
            </div>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="font-display text-sm font-bold uppercase tracking-wider text-white">
                {t(col.title)}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-sm text-ink-400 transition-colors hover:text-brand-400"
                    >
                      {t(link.label)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Powered by */}
        <div className="mt-10 flex flex-col items-center gap-4 border-t border-white/10 pt-6 sm:flex-row sm:justify-center sm:gap-8">
          <span className="text-xs font-semibold uppercase tracking-widest text-ink-500">Powered by</span>
          {poweredBy.map((p) => (
            <span key={p.label} className="flex items-center gap-2 text-sm font-medium text-ink-400">
              <p.icon className="h-4 w-4 text-brand-400" />
              {p.label}
            </span>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-6 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <p className="flex items-center gap-1.5 text-xs text-ink-500">
            <Info className="h-3.5 w-3.5" />
            © 2026 GeoSense Edu. All Rights Reserved.
          </p>
          <div className="flex items-center gap-3">
            {socials.map(({ icon: Icon, label, href }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-ink-400 transition-all hover:bg-brand-600 hover:text-white hover:-translate-y-0.5"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
