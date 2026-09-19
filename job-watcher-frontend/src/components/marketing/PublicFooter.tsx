import React from 'react';
import { Link } from 'react-router-dom';
import { Radar } from 'lucide-react';

export const PublicFooter: React.FC = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950 text-slate-400 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand & Mission */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-slate-950 shadow-md">
                <Radar className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">Job Watcher</span>
            </Link>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              Targeted applicant tracking crawler and deterministic matching engine. Built for engineers and professionals tracking specific employer career portals with Telegram alerts.
            </p>
            <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2.5 py-1 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Crawler Pipeline Operational</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200 mb-4">
              Architecture
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="#how-it-works" className="hover:text-cyan-400 transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#pipeline" className="hover:text-cyan-400 transition-colors">
                  Data Pipeline
                </a>
              </li>
              <li>
                <a href="#matching" className="hover:text-cyan-400 transition-colors">
                  Deterministic Matcher
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-cyan-400 transition-colors">
                  Features & Specs
                </a>
              </li>
              <li>
                <a href="#security" className="hover:text-cyan-400 transition-colors">
                  Security & Scoping
                </a>
              </li>
            </ul>
          </div>

          {/* Access / Auth Links */}
          <div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200 mb-4">
              Access
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/login" className="hover:text-cyan-400 transition-colors">
                  Log in
                </Link>
              </li>
              <li>
                <Link to="/signup" className="hover:text-cyan-400 transition-colors">
                  Create Account (Get Started)
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-cyan-400 transition-colors">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-400">
          <p>© {new Date().getFullYear()} Job Watcher. All rights reserved.</p>
          <p>Deterministic Career Intelligence • Engine v1.0</p>
        </div>
      </div>
    </footer>
  );
};
