import React from 'react';
import { Target, Layers, Cpu, ShieldAlert, Send, Activity } from 'lucide-react';

export const FeatureGrid: React.FC = () => {
  const features = [
    {
      icon: Target,
      title: 'Targeted Career Page Monitoring',
      description:
        'Specify direct career page URLs for the companies you want to watch. Job Watcher extracts postings directly from primary sources rather than third-party aggregators.',
      highlight: 'Workday, Greenhouse, Lever, Custom HTML',
    },
    {
      icon: Layers,
      title: 'Multi-Profile & Company Scoping',
      description:
        'Organize your search into isolated profiles (e.g. "SDE Internship" vs "Backend Engineer"). Each profile maintains its own monitored companies, rules, and alert histories.',
      highlight: 'Independent rule sets & notification streams',
    },
    {
      icon: Cpu,
      title: 'Deterministic Matching Engine',
      description:
        'Transparent rule-based matching. Define positive keywords, negative exclusions, locations, and job types. Every match displays exact criteria verification.',
      highlight: 'Verifiable scoring without black-box AI guessing',
    },
    {
      icon: ShieldAlert,
      title: 'Idempotent Duplicate Protection',
      description:
        'Every job listing receives a SHA-256 fingerprint hash. Repeated automated crawls refresh timestamps without creating duplicate database entries or repeated notifications.',
      highlight: 'Zero noise from frequent automated runs',
    },
    {
      icon: Send,
      title: 'Direct Telegram Alerts',
      description:
        'Connect your Telegram chat ID to receive real-time push alerts the moment a qualifying vacancy is detected, complete with direct application links.',
      highlight: 'Server-side delivery with retry resilience',
    },
    {
      icon: Activity,
      title: 'Complete Scan Observability',
      description:
        'Audit your scanning system with full history logs. Inspect start times, durations, per-company crawl statuses, discovery metrics, and sanitized error diagnostics.',
      highlight: 'Deep execution timelines & error logs',
    },
  ];

  return (
    <section id="features" className="relative py-20 border-t border-slate-800/80 bg-slate-950/70">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-800/60 bg-cyan-950/40 px-3 py-1 text-xs font-mono font-medium text-cyan-300 mb-4">
            <span>ENGINEERING SPECIFICATIONS</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Built for Reliable, Repeatable Job Tracking
          </h2>
          <p className="mt-4 text-slate-400 text-base sm:text-lg">
            No vague promises. No AI resume generators. A reliable, technical tool engineered to keep you first in line when target teams open requisitions.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="glass-panel glass-panel-hover rounded-2xl p-7 flex flex-col justify-between border border-slate-800/80 group"
              >
                <div>
                  <div className="h-12 w-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 group-hover:border-cyan-500/50 group-hover:text-cyan-300 transition-colors mb-5 shadow-inner">
                    <Icon className="h-6 w-6" />
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2.5">
                    {feat.title}
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed mb-4">
                    {feat.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80">
                  <span className="text-xs font-mono text-cyan-400/90 flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-cyan-400" />
                    <span>{feat.highlight}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
