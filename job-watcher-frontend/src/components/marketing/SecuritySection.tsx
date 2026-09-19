import React from 'react';
import { Lock, KeyRound, EyeOff, ShieldCheck } from 'lucide-react';

export const SecuritySection: React.FC = () => {
  const securityPoints = [
    {
      icon: KeyRound,
      title: 'Authenticated & User-Scoped',
      description:
        'All watch profiles, monitored company sets, match audits, and notification histories are strictly isolated to your authenticated account.',
    },
    {
      icon: EyeOff,
      title: 'Server-Side Credential Safety',
      description:
        'Telegram bot tokens, database connections, and crawler infrastructure remain strictly server-side. No sensitive credentials ever reach the client.',
    },
    {
      icon: ShieldCheck,
      title: 'Zero Login-Wall Scraping',
      description:
        'Job Watcher monitors public applicant tracking career sites (ATS). We never ask for or store user passwords to external employer portals.',
    },
    {
      icon: Lock,
      title: 'Strict SSRF & Input Filtering',
      description:
        'All configured career URLs are sanitized through defense-in-depth IP validation to block intranet traversal, link-local IPs, and metadata services.',
    },
  ];

  return (
    <section id="security" className="relative py-20 border-t border-slate-800/80 bg-slate-950/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-800/60 bg-cyan-950/40 px-3 py-1 text-xs font-mono font-medium text-cyan-300 mb-4">
            <Lock className="h-3.5 w-3.5" />
            <span>SECURITY & PRIVACY ARCHITECTURE</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Designed for Privacy & Technical Integrity
          </h2>
          <p className="mt-4 text-slate-400 text-base sm:text-lg">
            Your Telegram destination belongs to your account. Application credentials and scrapers stay securely server-side.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {securityPoints.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="glass-panel rounded-2xl p-6 sm:p-7 border border-slate-800/80 flex items-start gap-4"
              >
                <div className="h-11 w-11 rounded-xl bg-cyan-950/60 border border-cyan-800/60 flex items-center justify-center text-cyan-400 shrink-0 shadow-inner">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white mb-1.5">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
