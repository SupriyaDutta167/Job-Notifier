import React, { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'outline' | 'info';
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-slate-800/80 text-slate-300 border border-slate-700/60',
      success: 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30',
      warning: 'bg-amber-950/60 text-amber-300 border border-amber-500/30',
      error: 'bg-red-950/60 text-red-300 border border-red-500/30',
      outline: 'border border-slate-700/80 text-slate-300 bg-slate-900/40',
      info: 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/30',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-mono font-medium tracking-tight transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';
