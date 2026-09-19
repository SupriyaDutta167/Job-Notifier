import React from 'react';
import { Globe, Sliders, Cpu, Send, ArrowRight } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      step: '01',
      icon: Globe,
      title: 'Target Career Portals',
      description:
        'Tell Job Watcher exactly which company career pages to monitor. Supports Workday, Greenhouse, Lever, and standard career sites.',
      details: 'e.g., NVIDIA, Amazon, Google, JP Morgan',
    },
    {
      step: '02',
      icon: Sliders,
      title: 'Define Watch Profiles',
      description:
        'Specify your required role titles, target locations, job types (Internship, Full-Time), and explicit exclusion terms.',
      details: 'e.g., Include "SDE", Exclude "Senior", Type "Internship"',
    },
    {
      step: '03',
      icon: Cpu,
      title: 'Automated Scan & Match',
      description:
        'The backend crawler scans your configured sources periodically, extracts new listings, deduplicates via SHA-256, and evaluates rules.',
      details: 'Deterministic scoring: 0.0 to 1.0 with transparent reasons',
    },
    {
      step: '04',
      icon: Send,
      title: 'Direct Telegram Alerts',
      description:
        'When a vacancy matches your profile rules, an instant alert is delivered to your Telegram chat with a direct link to apply.',
      details: 'Zero noise: duplicate runs never re-trigger alerts',
    },
  ];

  return (
    <section id="how-it-works" className="relative py-20 border-t border-slate-800/80 bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-800/60 bg-cyan-950/40 px-3 py-1 text-xs font-mono font-medium text-cyan-300 mb-4">
            <span>FOUR-STEP PIPELINE</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            How Job Watcher Operates
          </h2>
          <p className="mt-4 text-slate-400 text-base sm:text-lg">
            From company career page to instant notification, every step is automated, auditable, and driven by your exact rules.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {steps.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="glass-panel glass-panel-hover rounded-2xl p-6 flex flex-col justify-between relative group"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="h-12 w-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 group-hover:border-cyan-500/50 group-hover:text-cyan-300 transition-colors shadow-inner">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-2xl font-mono font-bold text-slate-700 group-hover:text-cyan-500/60 transition-colors">
                      {item.step}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed mb-4">
                    {item.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80">
                  <span className="text-xs font-mono text-cyan-400/90 block">
                    {item.details}
                  </span>
                </div>

                {/* Arrow connector between steps on large screens */}
                {idx < steps.length - 1 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-20 text-slate-600">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
