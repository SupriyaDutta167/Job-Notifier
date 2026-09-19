import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string | React.ReactNode;
  icon?: LucideIcon;
  status?: string;
  badgeText?: string;
  accentColor?: 'cyan' | 'emerald' | 'amber' | 'indigo' | 'slate';
  linkTo?: string;
  linkText?: string;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  icon: Icon,
  badgeText,
  accentColor = 'cyan',
  linkTo,
  linkText,
  className,
}) => {
  const iconBgStyles = {
    cyan: 'bg-cyan-950/60 text-cyan-400 border border-cyan-500/30',
    emerald: 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30',
    amber: 'bg-amber-950/60 text-amber-400 border border-amber-500/30',
    indigo: 'bg-indigo-950/60 text-indigo-400 border border-indigo-500/30',
    slate: 'bg-slate-800/80 text-slate-300 border border-slate-700/60',
  };

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900/70 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-700/80 hover:bg-slate-900/90 hover:shadow-lg hover:shadow-cyan-950/10 flex flex-col justify-between',
        className
      )}
    >
      <div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-mono font-medium tracking-wider text-slate-400 uppercase">
            {label}
          </span>
          {Icon && (
            <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg p-1.5 transition-transform group-hover:scale-105', iconBgStyles[accentColor])}>
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-white font-mono">
            {value}
          </span>
          {badgeText && (
            <span className="text-[10px] font-mono text-cyan-400/80 bg-cyan-950/40 border border-cyan-500/20 px-1.5 py-0.5 rounded">
              {badgeText}
            </span>
          )}
        </div>
      </div>

      {subtext && (
        <div className="mt-3 pt-2.5 border-t border-slate-800/60 text-[11px] text-slate-400 font-mono leading-relaxed">
          {subtext}
        </div>
      )}

      {linkTo && linkText && (
        <div className="mt-3 pt-2.5 border-t border-slate-800/60">
          <a
            href={linkTo}
            className="inline-flex items-center text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            {linkText}
          </a>
        </div>
      )}
    </div>
  );
};
