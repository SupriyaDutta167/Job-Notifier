import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'We could not load this information. Please check connection and try again.',
  onRetry,
  className = '',
}) => {
  return (
    <div
      role="alert"
      className={`rounded-xl border border-red-500/30 bg-red-950/20 p-6 text-center backdrop-blur-sm sm:p-8 ${className}`}
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-red-500/30 bg-red-950/60 text-red-400">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
      <p className="mt-1.5 text-xs text-red-200/80 max-w-md mx-auto leading-relaxed">{message}</p>
      {onRetry && (
        <div className="mt-5">
          <Button variant="outline" size="sm" onClick={onRetry} className="border-red-500/40 text-red-200 hover:bg-red-950/40">
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Try again
          </Button>
        </div>
      )}
    </div>
  );
};
