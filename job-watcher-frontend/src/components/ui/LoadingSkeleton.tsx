import React from 'react';
import { cn } from '../../lib/utils';

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-slate-800/60 border border-slate-750/30',
        className
      )}
    />
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div role="status" aria-label="Loading dashboard" className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>

      {/* Orbit / Latest Scan Skeleton */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-72 lg:col-span-2 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>

      {/* Recent activity skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="space-y-3">
      {[...Array(rows)].map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  );
};
