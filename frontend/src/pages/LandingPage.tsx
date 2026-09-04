import { Hero } from '@/components/Hero';
import { Features } from '@/components/Features';
import { Stats } from '@/components/Stats';
import { SDGs } from '@/components/SDGs';
import { Technology } from '@/components/Technology';
import { CTA } from '@/components/CTA';
import { FeatureCards } from '@/components/FeatureCards';
import { AboutSection } from '@/components/AboutSection';

export default function LandingPage() {
  return (
    <>
      <Hero />
      <FeatureCards />
      <Features />
      <Stats />
      <Technology />
      <SDGs />
      <AboutSection />
      <CTA />
    </>
  );
}
