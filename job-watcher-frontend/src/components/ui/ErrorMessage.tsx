import React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ErrorMessageProps {
  message?: string;
  className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, className }) => {
  if (!message) return null;
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-950/40 p-3.5 text-xs text-red-200 shadow-sm',
        className
      )}
    >
      <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
      <span className="leading-relaxed">{message}</span>
    </div>
  );
};
