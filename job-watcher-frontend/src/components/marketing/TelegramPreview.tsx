import React from 'react';
import { Send, ExternalLink, Shield, CheckCheck, Clock } from 'lucide-react';

export const TelegramPreview: React.FC = () => {
  return (
    <section className="relative py-20 border-t border-slate-800/80 bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Text */}
          <div className="lg:col-span-6 flex flex-col items-start">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-800/60 bg-cyan-950/40 px-3 py-1 text-xs font-mono font-medium text-cyan-300 mb-4">
              <Send className="h-3.5 w-3.5" />
              <span>REAL-TIME DELIVERY</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Instant Push Notifications on Telegram
            </h2>
            <p className="mt-4 text-slate-300 text-base sm:text-lg leading-relaxed">
              When high-demand postings go live, seconds matter. Job Watcher pushes match alerts directly to your Telegram with role specifications, match justification, and one-click application links.
            </p>

            <div className="mt-8 space-y-4 text-sm text-slate-300">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-cyan-950/60 border border-cyan-800 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                  ✓
                </div>
                <div>
                  <strong className="text-white block font-medium">Zero Redundant Alerts</strong>
                  <span className="text-slate-400 text-xs">
                    Our database ensures you are only notified once per unique vacancy, even across hundreds of automated scan runs.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-cyan-950/60 border border-cyan-800 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                  ✓
                </div>
                <div>
                  <strong className="text-white block font-medium">Direct Application Links</strong>
                  <span className="text-slate-400 text-xs">
                    Jump straight to the primary ATS career posting (Workday, Greenhouse, etc.) without navigating aggregators.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-cyan-950/60 border border-cyan-800 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                  ✓
                </div>
                <div>
                  <strong className="text-white block font-medium">Private & Isolated</strong>
                  <span className="text-slate-400 text-xs">
                    Your Telegram Chat ID belongs solely to your profile. All bot credentials remain encrypted server-side.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Mock Telegram Card */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#17212b] shadow-2xl overflow-hidden font-sans text-slate-100">
              {/* Telegram App Header Bar */}
              <div className="bg-[#242f3d] px-4 py-3 flex items-center justify-between border-b border-[#0e1621]">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-md">
                    JW
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-semibold text-sm text-white">Job Watcher Bot</h4>
                      <span className="text-[10px] bg-[#1e2c3a] text-cyan-400 px-1.5 py-0.2 rounded font-mono">bot</span>
                    </div>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      online
                    </span>
                  </div>
                </div>
                <Clock className="h-4 w-4 text-slate-400" />
              </div>

              {/* Chat Message Area */}
              <div className="p-4 sm:p-6 bg-[#0e1621] min-h-[290px] flex flex-col justify-end space-y-3">
                {/* Date separator */}
                <div className="text-center">
                  <span className="bg-[#182533]/80 px-2.5 py-0.5 rounded-full text-[11px] text-slate-400 font-mono">
                    Today
                  </span>
                </div>

                {/* Message Bubble */}
                <div className="bg-[#182533] rounded-2xl rounded-tl-sm p-4 border border-[#2b3a4a]/40 shadow-md text-sm space-y-2.5 max-w-[95%]">
                  <div className="flex items-center justify-between border-b border-[#2b3a4a]/50 pb-2">
                    <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                      🚨 New Job Match
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">Just now</span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <p>
                      <span className="text-slate-400 font-mono">Company:</span>{' '}
                      <strong className="text-white">NVIDIA</strong>
                    </p>
                    <p>
                      <span className="text-slate-400 font-mono">Role:</span>{' '}
                      <strong className="text-white">Software Engineer Intern</strong>
                    </p>
                    <p>
                      <span className="text-slate-400 font-mono">Location:</span>{' '}
                      <span className="text-slate-200">Bengaluru, India</span>
                    </p>
                    <p>
                      <span className="text-slate-400 font-mono">Watch Profile:</span>{' '}
                      <span className="text-cyan-400">SDE Internship</span>
                    </p>
                    <p className="text-[11px] text-slate-400 pt-1 border-t border-[#2b3a4a]/30">
                      💡 Reason: Matched role keyword <code className="text-cyan-300">"Software Engineer"</code>, job type <code className="text-cyan-300">"Internship"</code>
                    </p>
                  </div>

                  {/* Inline Action Button */}
                  <div className="pt-2">
                    <div className="w-full bg-[#2b5278] hover:bg-[#346291] text-white py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer">
                      <span>Apply on Career Site</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  {/* Read receipts */}
                  <div className="flex justify-end items-center gap-1 text-[10px] text-slate-500 pt-0.5">
                    <span>16:42</span>
                    <CheckCheck className="h-3.5 w-3.5 text-cyan-400" />
                  </div>
                </div>

                {/* Subtext Notice */}
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 px-1">
                  <Shield className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  <span>Illustrative demonstration. Actual notifications deliver to your private chat ID.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
