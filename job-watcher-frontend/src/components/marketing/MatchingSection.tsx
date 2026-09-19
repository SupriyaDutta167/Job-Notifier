import { Check, SlidersHorizontal, Sparkles, FileText } from 'lucide-react';

export const MatchingSection: React.FC = () => {
  return (
    <section id="matching" className="relative py-20 border-t border-slate-800/80 bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-800/60 bg-cyan-950/40 px-3 py-1 text-xs font-mono font-medium text-cyan-300 mb-4">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>TRANSPARENT MATCHING ENGINE</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Your Rules. Your Signal. Zero Guesswork.
          </h2>
          <p className="mt-4 text-slate-400 text-base sm:text-lg">
            Job Watcher relies on explicit, verifiable Boolean matching rules. You know exactly why a posting matched your profile—and why another was excluded.
          </p>
        </div>

        {/* Side-by-Side Comparison Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Profile Rules Box (Left) */}
          <div className="lg:col-span-5 glass-panel rounded-2xl p-6 sm:p-8 border border-cyan-500/20 shadow-2xl relative">
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-xs font-mono text-cyan-400">ACTIVE WATCH PROFILE</span>
                <h3 className="text-xl font-bold text-white mt-0.5">SDE Internship</h3>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-cyan-950 border border-cyan-800 text-[11px] font-mono text-cyan-300">
                Rule Profile
              </span>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-800">
                <span className="text-slate-400 block mb-1 text-[11px]">ROLE KEYWORDS (OR)</span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/60">
                    "Software Engineer"
                  </span>
                  <span className="px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/60">
                    "SDE"
                  </span>
                  <span className="px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/60">
                    "Developer"
                  </span>
                </div>
              </div>

              <div className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-800">
                <span className="text-slate-400 block mb-1 text-[11px]">JOB TYPE</span>
                <span className="px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/60">
                  Internship
                </span>
              </div>

              <div className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-800">
                <span className="text-slate-400 block mb-1 text-[11px]">EXCLUSION KEYWORDS (NEGATIVE FILTER)</span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-800/60">
                    "Senior"
                  </span>
                  <span className="px-2 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-800/60">
                    "Staff"
                  </span>
                  <span className="px-2 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-800/60">
                    "Manager"
                  </span>
                </div>
              </div>

              <div className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-800">
                <span className="text-slate-400 block mb-1 text-[11px]">TARGET COMPANIES</span>
                <span className="text-slate-300">NVIDIA, Amazon, Google, JP Morgan</span>
              </div>
            </div>
          </div>

          {/* Engine Processing Arrow (Middle) */}
          <div className="lg:col-span-2 flex flex-col items-center justify-center text-center py-2 lg:py-0">
            <div className="h-12 w-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-2">
              <Sparkles className="h-6 w-6" />
            </div>
            <span className="text-xs font-mono text-cyan-300">Deterministic Evaluation</span>
            <span className="text-[10px] font-mono text-slate-400 mt-1">Rule Engine</span>
          </div>

          {/* Evaluation Result Box (Right) */}
          <div className="lg:col-span-5 glass-panel rounded-2xl p-6 sm:p-8 border border-emerald-500/30 shadow-2xl relative">
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-xs font-mono text-emerald-400">DISCOVERED VACANCY</span>
                <h3 className="text-xl font-bold text-white mt-0.5">NVIDIA Career Site</h3>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-700 text-xs font-mono font-bold text-emerald-300">
                MATCHED (0.95)
              </span>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800">
                <div className="flex items-start gap-2.5">
                  <FileText className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      Software Development Engineer Intern
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">
                      Location: Bengaluru, India • Source: Workday
                    </p>
                  </div>
                </div>
              </div>

              {/* Rule Match Audit Log */}
              <div className="space-y-2 text-xs font-mono bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between text-emerald-400">
                  <span className="flex items-center gap-1.5">
                    <Check className="h-4 w-4" />
                    <span>Role keyword matched: "Software Engineer"</span>
                  </span>
                  <span className="text-slate-400">PASS</span>
                </div>
                <div className="flex items-center justify-between text-emerald-400">
                  <span className="flex items-center gap-1.5">
                    <Check className="h-4 w-4" />
                    <span>Job type matched: "Internship"</span>
                  </span>
                  <span className="text-slate-400">PASS</span>
                </div>
                <div className="flex items-center justify-between text-emerald-400">
                  <span className="flex items-center gap-1.5">
                    <Check className="h-4 w-4" />
                    <span>Exclusions checked: 0 forbidden keywords</span>
                  </span>
                  <span className="text-slate-400">PASS</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-950/30 rounded-lg border border-emerald-800/40 text-xs text-slate-300">
                <span className="font-semibold text-emerald-400">Outcome:</span> Matched job persisted. Telegram alert queued and dispatched with single delivery guarantee.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
