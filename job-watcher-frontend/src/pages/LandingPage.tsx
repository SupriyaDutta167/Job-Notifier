import React from 'react';
import { PublicNavbar } from '../components/marketing/PublicNavbar';
import { HeroSection } from '../components/marketing/HeroSection';
import { HowItWorks } from '../components/marketing/HowItWorks';
import { ProductPipeline } from '../components/marketing/ProductPipeline';
import { MatchingSection } from '../components/marketing/MatchingSection';
import { FeatureGrid } from '../components/marketing/FeatureGrid';
import { TelegramPreview } from '../components/marketing/TelegramPreview';
import { SecuritySection } from '../components/marketing/SecuritySection';
import { FinalCTA } from '../components/marketing/FinalCTA';
import { PublicFooter } from '../components/marketing/PublicFooter';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500/20 selection:text-cyan-300">
      <PublicNavbar />
      <main>
        <HeroSection />
        <HowItWorks />
        <ProductPipeline />
        <MatchingSection />
        <FeatureGrid />
        <TelegramPreview />
        <SecuritySection />
        <FinalCTA />
      </main>
      <PublicFooter />
    </div>
  );
};

export default LandingPage;
