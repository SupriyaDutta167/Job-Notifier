import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badge,
  actions,
  breadcrumbs,
}) => {
  return (
    <div className="flex flex-col gap-4 pb-2 border-b border-slate-800/60 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        {breadcrumbs && <div className="mb-1 text-xs text-slate-400">{breadcrumbs}</div>}
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans">{title}</h1>
          {badge}
        </div>
        {subtitle && <div className="text-xs text-slate-400 font-sans">{subtitle}</div>}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
};
