import React from 'react';
import { Link } from 'react-router-dom';
import { Radar, ArrowLeft, ShieldCheck, Bell, CheckCircle2 } from 'lucide-react';

interface AuthShellProps {
  children: React.ReactNode;
  mode: 'login' | 'signup';
}

export const AuthShell: React.FC<AuthShellProps> = ({ children, mode }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-600/10 blur-[140px] rounded-full pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <Radar className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-white">Job Watcher</span>
            <span className="rounded bg-cyan-950/80 px-1.5 py-0.5 text-[10px] font-mono font-medium text-cyan-400 border border-cyan-800/60">
              v1.0
            </span>
          </div>
        </Link>

        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors py-1.5 px-3 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Home</span>
        </Link>
      </header>

      {/* Main Body */}
      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 flex-1 flex items-center justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full max-w-5xl">
          {/* Left Column: Product Showcase (hidden on mobile) */}
          <div className="hidden lg:flex lg:col-span-6 flex-col justify-center space-y-8 pr-6">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-800/60 bg-cyan-950/40 px-3 py-1 text-xs font-mono font-medium text-cyan-300 mb-4">
                <span>AUTHENTICATED ACCESS</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                {mode === 'login'
                  ? 'Access your automated job watch profiles.'
                  : 'Start tracking target company career pages.'}
              </h1>
              <p className="mt-3 text-sm sm:text-base text-slate-400 leading-relaxed">
                Connect directly to company ATS endpoints, define your Boolean rule sets, and receive deterministic alerts via Telegram.
              </p>
            </div>

            <div className="space-y-4 text-xs font-mono text-slate-300">
              <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-sans text-sm">Deterministic Rule Matching</strong>
                  <span className="text-slate-400 text-xs">
                    Exact role keyword, job type, and negative exclusion scoring with transparent explanations.
                  </span>
                </div>
              </div>

              <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-start gap-3">
                <Bell className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-sans text-sm">Direct Telegram Alerts</strong>
                  <span className="text-slate-400 text-xs">
                    Receive instant push alerts to your Telegram chat with direct ATS application links.
                  </span>
                </div>
              </div>

              <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-sans text-sm">Zero Duplicate Noise</strong>
                  <span className="text-slate-400 text-xs">
                    SHA-256 fingerprint deduplication prevents duplicate alerts across frequent scans.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Authentication Card */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-md glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative">
              {children}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 text-center text-xs font-mono text-slate-400 border-t border-slate-900">
        © {new Date().getFullYear()} Job Watcher • Secure Supabase Authentication
      </footer>
    </div>
  );
};
