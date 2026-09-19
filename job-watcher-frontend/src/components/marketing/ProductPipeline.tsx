import React from 'react';
import { Database, Filter, Hash, CheckSquare, Send, Server } from 'lucide-react';

export const ProductPipeline: React.FC = () => {
  const stages = [
    {
      icon: Server,
      name: '1. Career Portals',
      subtitle: 'Target URLs',
      tech: 'Workday, Oracle, Greenhouse, Lever, HTML',
      badge: 'SSRF Protected',
    },
    {
      icon: Database,
      name: '2. Crawler Engine',
      subtitle: 'Headless Scraper',
      tech: 'Fast HTTP client + Playwright fallback',
      badge: 'Automatic Retries',
    },
    {
      icon: Filter,
      name: '3. Normalization',
      subtitle: 'Clean Data Schema',
      tech: 'Standardize titles, locations, job types',
      badge: 'Consistent Schema',
    },
    {
      icon: Hash,
      name: '4. Deduplication',
      subtitle: 'SHA-256 Hashing',
      tech: 'Fingerprint hash across role, company, URL',
      badge: 'Zero Duplicate Runs',
    },
    {
      icon: CheckSquare,
      name: '5. Rule Matcher',
      subtitle: 'Deterministic Engine',
      tech: 'Keyword inclusions, exclusions, scores',
      badge: 'Transparent Reasons',
    },
    {
      icon: Send,
      name: '6. Telegram Dispatch',
      subtitle: 'Instant Delivery',
      tech: 'Encrypted bot API call with apply link',
      badge: 'Idempotent Dispatch',
    },
  ];

  return (
    <section id="pipeline" className="relative py-20 border-t border-slate-800/80 bg-slate-950/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-800/60 bg-cyan-950/40 px-3 py-1 text-xs font-mono font-medium text-cyan-300 mb-4">
            <span>DATA PIPELINE ARCHITECTURE</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Engineered for Precision & Zero Noise
          </h2>
          <p className="mt-4 text-slate-400 text-base sm:text-lg">
            Every scanned vacancy traverses a hardened, deterministic 6-stage lifecycle before reaching your Telegram channel.
          </p>
        </div>

        {/* Pipeline Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {stages.map((stage) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.name}
                className="glass-panel glass-panel-hover rounded-2xl p-6 flex flex-col justify-between border border-slate-800/90"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-10 w-10 rounded-lg bg-cyan-950/50 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
                      {stage.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mb-0.5">
                    {stage.name}
                  </h3>
                  <p className="text-xs font-mono text-cyan-400 mb-2.5">
                    {stage.subtitle}
                  </p>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {stage.tech}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Status: Verified</span>
                  <span className="text-emerald-400">● Operational</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
