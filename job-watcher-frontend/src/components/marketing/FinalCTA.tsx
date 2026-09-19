import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const FinalCTA: React.FC = () => {
  const { user } = useAuth();

  return (
    <section className="relative py-24 border-t border-slate-800/80 bg-slate-950 overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-radial-gradient opacity-80 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-cyan-500/10 blur-[140px] rounded-full pointer-events-none" />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <div className="glass-panel rounded-3xl p-8 sm:p-14 border border-cyan-500/25 shadow-2xl relative overflow-hidden">
          {/* Subtle decorative badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-800/60 bg-cyan-950/40 px-3.5 py-1 text-xs font-mono font-medium text-cyan-300 mb-6">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span>START TARGETED MONITORING</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Stop refreshing career pages.{' '}
            <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 bg-clip-text text-transparent">
              Start watching the roles that matter.
            </span>
          </h2>

          <p className="mt-5 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Build your first watch profile in minutes. Tell Job Watcher which companies to monitor, set your rules, and connect Telegram for instant alerts.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            {user ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold px-8 py-3.5 text-base shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-8 py-3.5 text-base shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>Create Your Watch Profile</span>
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-800 bg-slate-900/90 hover:bg-slate-800 px-7 py-3.5 text-base font-semibold text-slate-200 transition-all"
                >
                  Log in
                </Link>
              </>
            )}
          </div>

          <p className="mt-6 text-xs font-mono text-slate-400">
            No credit card required • Configured via your custom watch profiles
          </p>
        </div>
      </div>
    </section>
  );
};
