import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Bell, ShieldCheck, Zap, Terminal } from 'lucide-react';
import { HeroScene, HeroSceneErrorBoundary } from './HeroScene';
import { useAuth } from '../../hooks/useAuth';

export const HeroSection: React.FC = () => {
  const { user } = useAuth();

  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-cyan-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[350px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Headline, Copy & CTAs */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-800/60 bg-cyan-950/40 px-3.5 py-1.5 text-xs font-mono font-medium text-cyan-300 shadow-sm backdrop-blur-md mb-6">
              <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="flex h-2 w-2 rounded-full bg-cyan-400 -ml-4" />
              <span>INTELLIGENT CAREER MONITORING • ENGINE v1.0</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
              Stop refreshing career pages.{' '}
              <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 bg-clip-text text-transparent">
                Let Job Watcher track them.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
              Job Watcher monitors the exact career pages you choose, detects new roles, matches them against your watch profiles using transparent deterministic rules, and delivers instant Telegram alerts.
            </p>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
              {user ? (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold px-7 py-3.5 text-base shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>Open Your Dashboard</span>
                  <ArrowRight className="h-5 w-5" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/signup"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-7 py-3.5 text-base shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>Start Watching Jobs</span>
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-850 hover:border-slate-700 px-6 py-3.5 text-base font-semibold text-slate-200 transition-all backdrop-blur-sm"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>

            {/* Trust & Proof Callouts */}
            <div className="mt-10 pt-8 border-t border-slate-800/80 w-full grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
                <span>Deterministic Rules</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-cyan-400 shrink-0" />
                <span>Zero Scraper Duplicates</span>
              </div>
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-cyan-400 shrink-0" />
                <span>Telegram Alerts</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-cyan-400 shrink-0" />
                <span>Private & Scoped</span>
              </div>
            </div>
          </div>

          {/* Right Column: 3D Scene + Floating UI Demonstrations */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            {/* 3D Canvas Box */}
            <div className="relative w-full rounded-2xl border border-slate-800/90 bg-slate-950/60 p-2 shadow-2xl backdrop-blur-xl">
              <HeroSceneErrorBoundary>
                <HeroScene />
              </HeroSceneErrorBoundary>

              {/* Floating Demo Card 1 (Top Left) */}
              <div className="absolute top-4 left-4 sm:-left-6 glass-panel rounded-xl p-3 shadow-xl max-w-[230px] border border-cyan-500/20 animate-fade-in pointer-events-none">
                <div className="flex items-center gap-2 text-[11px] font-mono text-cyan-300 mb-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
                  <span>Target Ingestion</span>
                </div>
                <p className="text-xs font-medium text-slate-200 truncate">
                  NVIDIA External Career Site
                </p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Workday Adapter • 100 Verified Jobs
                </p>
              </div>

              {/* Floating Demo Card 2 (Bottom Right) */}
              <div className="absolute bottom-4 right-4 sm:-right-6 glass-panel rounded-xl p-3 shadow-xl max-w-[240px] border border-emerald-500/20 pointer-events-none">
                <div className="flex items-center justify-between text-[11px] font-mono text-emerald-400 mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>Rule Match (95%)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Telegram</span>
                </div>
                <p className="text-xs font-semibold text-slate-100 truncate">
                  Software Engineer Intern
                </p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Profile: SDE Internship • Dispatched
                </p>
              </div>

              {/* Scene Footer Micro-Bar */}
              <div className="flex items-center justify-between px-3 py-2 text-[11px] font-mono text-slate-400 border-t border-slate-900 bg-slate-950/90 rounded-b-xl">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Terminal className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Job Watcher Engine Active</span>
                </span>
                <span className="text-slate-400">Headless Crawler</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
